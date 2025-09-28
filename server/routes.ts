import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openaiService } from "./services/openai";
import { 
  insertConversationSchema, 
  insertKnowledgeBaseFileSchema,
  insertPromptTemplateSchema,
  lgp360ReportSchema,
  messageSchema, 
  type Message,
  type LGP360ReportData
} from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";
import { registerAuthRoutes } from "./auth-routes";
import { authenticateUser } from "./middleware/auth";
import cookieParser from "cookie-parser";
import multer from "multer";
import { z } from "zod";
import * as yauzl from "yauzl";

// Function to process uploaded files for knowledge base integration
async function processZipFile(fileId: string, filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const extractedTexts: string[] = [];
    
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!zipfile) {
        reject(new Error('Failed to open zip file'));
        return;
      }
      
      zipfile.readEntry();
      
      zipfile.on("entry", (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Directory entry, skip
          zipfile.readEntry();
        } else {
          // File entry
          const fileName = entry.fileName.toLowerCase();
          if (fileName.endsWith('.txt') || fileName.endsWith('.md') || 
              fileName.endsWith('.pdf') || fileName.endsWith('.doc') || 
              fileName.endsWith('.docx')) {
            
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                console.error(`Error reading ${entry.fileName}:`, err);
                zipfile.readEntry();
                return;
              }
              
              if (!readStream) {
                zipfile.readEntry();
                return;
              }
              
              const chunks: Buffer[] = [];
              readStream.on('data', (chunk) => chunks.push(chunk));
              readStream.on('end', () => {
                const content = Buffer.concat(chunks);
                if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
                  extractedTexts.push(`File: ${entry.fileName}\n${content.toString('utf-8')}`);
                } else {
                  extractedTexts.push(`File: ${entry.fileName}\nBinary content extracted`);
                }
                zipfile.readEntry();
              });
              readStream.on('error', (err) => {
                console.error(`Error reading stream for ${entry.fileName}:`, err);
                zipfile.readEntry();
              });
            });
          } else {
            zipfile.readEntry();
          }
        }
      });
      
      zipfile.on("end", () => {
        resolve(extractedTexts);
      });
      
      zipfile.on("error", (err) => {
        reject(err);
      });
    });
  });
}

async function processFileForKnowledgeBase(fileId: string, filePath: string, mimeType: string): Promise<void> {
  try {
    console.log(`Processing file ${fileId} for knowledge base integration...`);
    
    // Get the file content (in a real implementation, you'd fetch from object storage)
    // For now, we'll mark it as processed and extract basic text content
    
    let extractedText = '';
    
    // Basic text extraction based on file type
    if (mimeType === 'text/plain') {
      // For text files, content would be extracted directly
      extractedText = `Text content from ${filePath}`;
    } else if (mimeType === 'application/pdf') {
      // For PDFs, you'd use a PDF parsing library
      extractedText = `PDF content extracted from ${filePath}`;
    } else if (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed') {
      // For ZIP files, extract and process contained files
      try {
        const extractedTexts = await processZipFile(fileId, filePath);
        extractedText = extractedTexts.join('\n\n---\n\n');
        console.log(`Extracted ${extractedTexts.length} files from zip`);
      } catch (zipError) {
        console.error(`Error processing zip file ${fileId}:`, zipError);
        extractedText = `Zip file processing failed: ${zipError instanceof Error ? zipError.message : 'Unknown error'}`;
      }
    } else {
      extractedText = `Document content from ${filePath}`;
    }
    
    // Upload to vector store if configured
    let vectorStoreFileId = null;
    if (extractedText.trim()) {
      vectorStoreFileId = await openaiService.uploadToVectorStore(extractedText, `kb_${fileId}.txt`);
    }
    
    // Store the extracted text content for search
    await storage.updateKnowledgeBaseFile(fileId, { 
      isProcessed: true,
      extractedText: extractedText,
      vectorStoreFileId: vectorStoreFileId,
      processedAt: new Date()
    });
    
    console.log(`File ${fileId} processed successfully for knowledge base`);
  } catch (error) {
    console.error(`Error processing file ${fileId}:`, error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware
  app.use(cookieParser());
  
  // Multer configuration for file uploads
  const upload = multer({
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip',
        'application/x-zip-compressed'
      ];
      cb(null, allowedTypes.includes(file.mimetype));
    },
  });
  
  // Register authentication routes
  registerAuthRoutes(app);
  
  // Streaming chat endpoint for real-time responses
  // Reference: https://platform.openai.com/docs/api-reference/responses-streaming
  app.post("/api/chat/stream", async (req, res) => {
    try {
      const { message, topic, conversationHistory } = req.body;

      if (!message || !topic) {
        return res.status(400).json({ error: "Message and topic are required" });
      }

      // Validate conversation history if provided
      if (conversationHistory) {
        const historySchema = z.array(messageSchema);
        const validationResult = historySchema.safeParse(conversationHistory);
        if (!validationResult.success) {
          return res.status(400).json({ error: "Invalid conversation history format" });
        }
      }

      // Get user LGP360 data for personalization
      let userLGP360Data;
      try {
        const authResult = await authenticateUser(req);
        if (authResult.success && authResult.user) {
          if (authResult.user.lgp360Assessment) {
            userLGP360Data = {
              assessment: authResult.user.lgp360Assessment,
              originalContent: authResult.user.lgp360OriginalContent
            };
          }
        }
      } catch (authError) {
        console.log("No authenticated user for personalization");
      }

      // Set up server-sent events headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Cache-Control");
      res.flushHeaders();

      // Get streaming response from OpenAI
      const stream = await openaiService.getStreamingLeadershipResponse(
        message,
        topic,
        conversationHistory || [],
        userLGP360Data
      );

      // Process streaming events as per official docs
      // Reference: https://platform.openai.com/docs/api-reference/responses-streaming
      for await (const event of stream) {
        // Forward token/text chunks; shape per streaming docs
        if (event.type === "response.output_text.delta") {
          res.write(`data: ${JSON.stringify({ delta: event.delta })}\n\n`);
        }
        if (event.type === "response.completed") {
          res.write(`data: ${JSON.stringify({ completed: true })}\n\n`);
          break;
        }
        // Log unknown events in development as per mitigation strategy
        if (process.env.NODE_ENV === "development" && !["response.output_text.delta", "response.completed"].includes(event.type)) {
          console.log("Unknown streaming event type:", event.type);
        }
      }
      
      res.write("data: [DONE]\n\n");
      res.end();

    } catch (error) {
      console.error("Error in streaming chat:", error);
      res.write(`data: ${JSON.stringify({ error: "Sorry, I'm having a hiccup processing that. Try again in a moment." })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  });

  // Non-streaming chat endpoint (fallback)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, topic, conversationHistory } = req.body;

      if (!message || !topic) {
        return res.status(400).json({ error: "Message and topic are required" });
      }

      // Validate conversation history if provided
      if (conversationHistory) {
        const historySchema = z.array(messageSchema);
        const validationResult = historySchema.safeParse(conversationHistory);
        if (!validationResult.success) {
          return res.status(400).json({ error: "Invalid conversation history format" });
        }
      }

      // Get user LGP360 data for personalization
      let userLGP360Data;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const { verifyToken } = await import("./auth");
          const token = authHeader.substring(7);
          const decoded = verifyToken(token);
          if (decoded) {
            const user = await storage.getUser(decoded.userId);
            if (user?.lgp360Assessment) {
              userLGP360Data = { 
                assessment: user.lgp360Assessment,
                originalContent: user.lgp360OriginalContent || undefined
              };
            }
          }
        } catch (error) {
          // If token is invalid or user not found, continue without personalization
          console.log("Could not get user data for personalization:", error);
        }
      }

      const response = await openaiService.getTopicSpecificResponse(
        message, 
        topic, 
        conversationHistory || [],
        userLGP360Data
      );

      res.json(response);
    } catch (error) {
      console.error("Chat endpoint error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Save conversation endpoint
  app.post("/api/conversations", async (req, res) => {
    try {
      const validationResult = insertConversationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid conversation data" });
      }

      const conversation = await storage.createConversation(validationResult.data);
      res.json(conversation);
    } catch (error) {
      console.error("Save conversation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get conversations endpoint
  app.get("/api/conversations", async (req, res) => {
    try {
      const { status, topic, search } = req.query;
      
      let conversations;
      if (search) {
        conversations = await storage.searchConversations(search as string);
      } else if (topic) {
        conversations = await storage.getConversationsByTopic(topic as string);
      } else {
        conversations = await storage.getConversations(status as string);
      }
      
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get specific conversation
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update conversation
  app.patch("/api/conversations/:id", async (req, res) => {
    try {
      const updates = req.body;
      const conversation = await storage.updateConversation(req.params.id, updates);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Update conversation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const success = await storage.deleteConversation(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Delete conversation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Star/unstar conversation
  app.patch("/api/conversations/:id/star", async (req, res) => {
    try {
      const { isStarred } = req.body;
      const conversation = await storage.starConversation(req.params.id, isStarred);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Star conversation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Archive conversation
  app.patch("/api/conversations/:id/archive", async (req, res) => {
    try {
      const conversation = await storage.archiveConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Archive conversation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Export conversation endpoint
  app.get("/api/conversations/:id/export", async (req, res) => {
    try {
      const { format = 'json' } = req.query;
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const title = conversation.title || `Conversation ${conversation.topic}`;
      const timestamp = new Date().toISOString().split('T')[0];
      
      if (format === 'txt') {
        const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
        const textContent = `${title}\n${'='.repeat(title.length)}\n\nTopic: ${conversation.topic}\nDate: ${new Date(conversation.createdAt || '').toLocaleString()}\n\n` +
          messages.map((msg: any) => `${msg.sender.toUpperCase()}: ${msg.text}`).join('\n\n');
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.txt"`);
        res.send(textContent);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.json"`);
        res.json(conversation);
      }
    } catch (error) {
      console.error("Export conversation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics/stats", async (req, res) => {
    try {
      const stats = await storage.getConversationStats();
      res.json(stats);
    } catch (error) {
      console.error("Analytics stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/topic-engagement", async (req, res) => {
    try {
      const engagement = await storage.getTopicEngagement();
      res.json(engagement);
    } catch (error) {
      console.error("Topic engagement error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Prompt template endpoints
  app.post("/api/prompt-templates", async (req, res) => {
    try {
      const validationResult = insertPromptTemplateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid prompt template data" });
      }

      const template = await storage.createPromptTemplate(validationResult.data);
      res.json(template);
    } catch (error) {
      console.error("Create prompt template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/prompt-templates", async (req, res) => {
    try {
      const { category } = req.query;
      const templates = await storage.getPromptTemplates(category as string);
      res.json(templates);
    } catch (error) {
      console.error("Get prompt templates error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/prompt-templates/:id", async (req, res) => {
    try {
      const template = await storage.getPromptTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Prompt template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Get prompt template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/prompt-templates/:id", async (req, res) => {
    try {
      const updates = req.body;
      const template = await storage.updatePromptTemplate(req.params.id, updates);
      if (!template) {
        return res.status(404).json({ error: "Prompt template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Update prompt template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/prompt-templates/:id", async (req, res) => {
    try {
      const success = await storage.deletePromptTemplate(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Prompt template not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Delete prompt template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/prompt-templates/:id/use", async (req, res) => {
    try {
      await storage.incrementTemplateUsage(req.params.id);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Increment template usage error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Knowledge Base File endpoints
  const objectStorageService = new ObjectStorageService();

  // Get upload URL for knowledge base files
  app.post("/api/knowledge-base/upload-url", async (req, res) => {
    try {
      const { fileName } = req.body;
      
      if (!fileName) {
        return res.status(400).json({ error: "fileName is required" });
      }

      const uploadURL = await objectStorageService.getKnowledgeBaseUploadURL(fileName);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Upload URL generation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Process uploaded file and save metadata
  app.post("/api/knowledge-base/files", async (req, res) => {
    try {
      const { 
        originalName, 
        fileName, 
        filePath, 
        fileSize, 
        mimeType, 
        tags, 
        description 
      } = req.body;

      // Validate required fields
      if (!originalName || !fileName || !filePath || !fileSize || !mimeType) {
        return res.status(400).json({ 
          error: "originalName, fileName, filePath, fileSize, and mimeType are required" 
        });
      }

      // Create knowledge base file record
      const fileData = {
        originalName,
        fileName,
        filePath: objectStorageService.normalizeKnowledgeBaseFilePath(filePath),
        fileSize,
        mimeType,
        tags: tags || [],
        description: description || null,
        isProcessed: false,
      };

      const kbFile = await storage.createKnowledgeBaseFile(fileData);
      
      // Process file in background for knowledge base integration
      setImmediate(async () => {
        try {
          await processFileForKnowledgeBase(kbFile.id, filePath, mimeType);
        } catch (error) {
          console.error("Background file processing error:", error);
          await storage.updateKnowledgeBaseFile(kbFile.id, { 
            isProcessed: false,
            processingError: error instanceof Error ? error.message : 'Processing failed'
          });
        }
      });

      res.json(kbFile);
    } catch (error) {
      console.error("Knowledge base file creation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all knowledge base files
  app.get("/api/knowledge-base/files", async (req, res) => {
    try {
      const files = await storage.getKnowledgeBaseFiles();
      res.json(files);
    } catch (error) {
      console.error("Get knowledge base files error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get specific knowledge base file
  app.get("/api/knowledge-base/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const file = await storage.getKnowledgeBaseFile(id);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      res.json(file);
    } catch (error) {
      console.error("Get knowledge base file error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update knowledge base file
  app.patch("/api/knowledge-base/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedFile = await storage.updateKnowledgeBaseFile(id, updates);
      
      if (!updatedFile) {
        return res.status(404).json({ error: "File not found" });
      }

      res.json(updatedFile);
    } catch (error) {
      console.error("Update knowledge base file error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete knowledge base file
  app.delete("/api/knowledge-base/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get file details first
      const file = await storage.getKnowledgeBaseFile(id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // Delete from storage
      const deleted = await storage.deleteKnowledgeBaseFile(id);
      
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete file" });
      }

      // TODO: Also delete from object storage and vector store

      res.json({ success: true });
    } catch (error) {
      console.error("Delete knowledge base file error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Search knowledge base files
  app.get("/api/knowledge-base/search", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Search query 'q' is required" });
      }

      const files = await storage.searchKnowledgeBaseFiles(q);
      res.json(files);
    } catch (error) {
      console.error("Search knowledge base files error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve knowledge base files
  app.get("/kb/:fileName(*)", async (req, res) => {
    try {
      const fileName = req.params.fileName;
      const objectFile = await objectStorageService.getKnowledgeBaseFile(`/kb/${fileName}`);
      
      // For now, allow public access to knowledge base files
      // TODO: Implement proper access control
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Serve knowledge base file error:", error);
      if (error instanceof Error && error.name === "ObjectNotFoundError") {
        return res.status(404).json({ error: "File not found" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // LGP360 Report endpoints
  app.post("/api/lgp360", authenticateUser, async (req, res) => {
    try {
      // Validate LGP360 data (now just a summary)
      const validationResult = lgp360ReportSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid LGP360 data", details: validationResult.error.errors });
      }

      // Save LGP360 summary to user profile (user is available from middleware)
      const updatedUser = await storage.updateUserLGP360(req.user!.id, validationResult.data);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ success: true, message: "LGP360 report saved successfully" });
    } catch (error) {
      console.error("Save LGP360 report error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // AI Document Analysis endpoint
  app.post("/api/lgp360/analyze", authenticateUser, upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No document uploaded" });
      }

      // Process document with professional AI analysis (user is available from middleware)
      const analysisResult = await openaiService.analyzeDocumentProfessional(req.file.buffer, req.file.originalname, req.file.mimetype);
      
      res.json(analysisResult);
    } catch (error) {
      console.error("Document analysis error:", error);
      res.status(500).json({ error: "Failed to analyze document" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
