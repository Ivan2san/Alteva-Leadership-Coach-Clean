import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openaiService } from "./services/openai";
import {
  insertConversationSchema,
  insertPromptTemplateSchema,
  lgp360ReportSchema,
  messageSchema,
} from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";
import { registerAuthRoutes } from "./auth-routes";
import { authenticateUser } from "./middleware/auth";
import cookieParser from "cookie-parser";
import multer from "multer";
import { z } from "zod";
import * as yauzl from "yauzl";
import { Buffer } from "node:buffer";

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
        reject(new Error("Failed to open zip file"));
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
          if (
            fileName.endsWith(".txt") ||
            fileName.endsWith(".md") ||
            fileName.endsWith(".pdf") ||
            fileName.endsWith(".doc") ||
            fileName.endsWith(".docx")
          ) {
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
              readStream.on("data", (chunk) => chunks.push(chunk));
              readStream.on("end", () => {
                const content = Buffer.concat(chunks);
                if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
                  extractedTexts.push(`File: ${entry.fileName}\n${content.toString("utf-8")}`);
                } else {
                  extractedTexts.push(`File: ${entry.fileName}\nBinary content extracted`);
                }
                zipfile.readEntry();
              });
              readStream.on("error", (err) => {
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

    let extractedText = "";

    // Basic text extraction based on file type
    if (mimeType === "text/plain") {
      extractedText = `Text content from ${filePath}`;
    } else if (mimeType === "application/pdf") {
      extractedText = `PDF content extracted from ${filePath}`;
    } else if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") {
      try {
        const extractedTexts = await processZipFile(fileId, filePath);
        extractedText = extractedTexts.join("\n\n---\n\n");
        console.log(`Extracted ${extractedTexts.length} files from zip`);
      } catch (zipError) {
        console.error(`Error processing zip file ${fileId}:`, zipError);
        extractedText = `Zip file processing failed: ${
          zipError instanceof Error ? zipError.message : "Unknown error"
        }`;
      }
    } else {
      extractedText = `Document content from ${filePath}`;
    }

    // Upload to vector store if we have content
    let vectorStoreFileId: string | null = null;
    if (extractedText.trim()) {
      const fileBuffer = Buffer.from(extractedText, "utf-8");
      vectorStoreFileId = await openaiService.uploadFileToVectorStore(
        fileBuffer,
        `kb_${fileId}.txt`,
        "text/plain"
      );
    }

    await storage.updateKnowledgeBaseFile(fileId, {
      isProcessed: true,
      extractedText,
      vectorStoreFileId,
      processedAt: new Date(),
      processingError: null,
    });

    console.log(`File ${fileId} processed successfully for knowledge base`);
  } catch (error) {
    console.error(`Error processing file ${fileId}:`, error);
    await storage.updateKnowledgeBaseFile(fileId, {
      isProcessed: false,
      processingError: error instanceof Error ? error.message : "Processing failed",
    });
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware
  app.use(cookieParser());

  // Multer configuration for file uploads
  const upload = multer({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/x-zip-compressed",
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

      // Get user LGP360 data for personalization (soft auth, same pattern as non-streaming)
      let userLGP360Data: { assessment: any; originalContent?: string } | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const { verifyToken } = await import("./auth");
          const token = authHeader.substring(7);
          const decoded = verifyToken(token);
          if (decoded) {
            const user = await storage.getUser((decoded as any).userId);
            if (user?.lgp360Assessment) {
              userLGP360Data = {
                assessment: user.lgp360Assessment,
                originalContent: user.lgp360OriginalContent || undefined,
              };
            }
          }
        } catch (authError) {
          // Proceed without personalization if token invalid or user not found
          if (process.env.NODE_ENV === "development") {
            console.log("No authenticated user for personalization:", authError);
          }
        }
      }

      // Set up server-sent events headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Cache-Control");
      // @ts-ignore flushHeaders exists on Node's res
      res.flushHeaders();

      // Get streaming response from OpenAI
      const stream = await openaiService.getStreamingLeadershipResponse(
        message,
        topic,
        conversationHistory || [],
        userLGP360Data
      );

      // Process streaming events as per official docs
      for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
          res.write(`data: ${JSON.stringify({ delta: event.delta })}\n\n`);
        }
        if (event.type === "response.completed") {
          res.write(`data: ${JSON.stringify({ completed: true })}\n\n`);
          break;
        }
        if (
          process.env.NODE_ENV === "development" &&
          !["response.output_text.delta", "response.completed"].includes(event.type)
        ) {
          console.log("Unknown streaming event type:", event.type);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Error in streaming chat:", error);
      res.write(
        `data: ${JSON.stringify({
          error: "Sorry, I'm having a hiccup processing that. Try again in a moment.",
        })}\n\n`
      );
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
      let userLGP360Data: { assessment: any; originalContent?: string } | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const { verifyToken } = await import("./auth");
          const token = authHeader.substring(7);
          const decoded = verifyToken(token);
          if (decoded) {
            const user = await storage.getUser((decoded as any).userId);
            if (user?.lgp360Assessment) {
              userLGP360Data = {
                assessment: user.lgp360Assessment,
                originalContent: user.lgp360OriginalContent || undefined,
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
      const { format = "json" } = req.query;
      const conversation = await storage.getConversation(req.params.id);

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const title = conversation.title || `Conversation ${conversation.topic}`;
      const timestamp = new Date().toISOString().split("T")[0];

      if (format === "txt") {
        const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
        const textContent =
          `${title}\n${"=".repeat(title.length)}\n\nTopic: ${conversation.topic}\nDate: ${
            new Date(conversation.createdAt || "").toLocaleString()
          }\n\n` +
          messages.map((msg: any) => `${msg.sender.toUpperCase()}: ${msg.text}`).join("\n\n");

        res.setHeader("Content-Type", "text/plain");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}.txt"`
        );
        res.send(textContent);
      } else {
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}.json"`
        );
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
      const { originalName, fileName, filePath, fileSize, mimeType, tags, description } = req.body;

      // Validate required fields
      if (!originalName || !fileName || !filePath || !fileSize || !mimeType) {
        return res.status(400).json({
          error: "originalName, fileName, filePath, fileSize, and mimeType are required",
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
            processingError: error instanceof Error ? error.message : "Processing failed",
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

      if (!q || typeof q !== "string") {
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
      const validationResult = lgp360ReportSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res
          .status(400)
          .json({ error: "Invalid LGP360 data", details: validationResult.error.issues });
      }

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
  app.post("/api/lgp360/analyze", authenticateUser, upload.single("document"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No document uploaded" });
      }

      // Reject legacy .doc files (only .docx supported)
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!allowedTypes.includes(req.file.mimetype) && !req.file.originalname.endsWith('.csv')) {
        return res.status(400).json({ error: "Unsupported file type. Please upload PDF, Word (.docx), CSV, or text files." });
      }

      const analysisResult = await openaiService.analyzeDocumentProfessional(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      res.json(analysisResult);
    } catch (error) {
      console.error("Document analysis error:", error);
      res.status(500).json({ error: "Failed to analyze document" });
    }
  });

  // AI Document Analysis endpoint with structured extraction
  app.post("/api/lgp360/analyze-structured", authenticateUser, upload.single("document"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No document uploaded" });
      }

      // Reject legacy .doc files (only .docx supported)
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!allowedTypes.includes(req.file.mimetype) && !req.file.originalname.endsWith('.csv')) {
        return res.status(400).json({ error: "Unsupported file type. Please upload PDF, Word (.docx), CSV, or text files." });
      }

      const analysisResult = await openaiService.analyzeDocument360Structured(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      res.json(analysisResult);
    } catch (error) {
      console.error("Structured document analysis error:", error);
      res.status(500).json({ error: "Failed to analyze document" });
    }
  });

  // Profile Update APIs
  app.patch("/api/profile/growth-profile", authenticateUser, async (req, res) => {
    try {
      const { growthProfile } = req.body;
      const updatedUser = await storage.updateUser(req.user!.id, { growthProfile });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Update growth profile error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/profile/red-zones", authenticateUser, async (req, res) => {
    try {
      const { redZones } = req.body;
      const updatedUser = await storage.updateUser(req.user!.id, { redZones });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Update red zones error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/profile/green-zones", authenticateUser, async (req, res) => {
    try {
      const { greenZones } = req.body;
      const updatedUser = await storage.updateUser(req.user!.id, { greenZones });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Update green zones error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/profile/recommendations", authenticateUser, async (req, res) => {
    try {
      const { recommendations } = req.body;
      const updatedUser = await storage.updateUser(req.user!.id, { recommendations });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Update recommendations error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/profile/obp", authenticateUser, async (req, res) => {
    try {
      const { obpData } = req.body;
      const updatedUser = await storage.updateUser(req.user!.id, { obpData });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Update OBP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/profile/immunity-to-change", authenticateUser, async (req, res) => {
    try {
      const { immunityToChangeData } = req.body;
      const updatedUser = await storage.updateUser(req.user!.id, { immunityToChangeData });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Update Immunity to Change error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Success Checkpoints API
  app.post("/api/checkpoints", authenticateUser, async (req, res) => {
    try {
      const checkpoint = await storage.createCheckpoint({
        userId: req.user!.id,
        type: req.body.type,
        metadata: req.body.metadata,
      });
      res.json(checkpoint);
    } catch (error) {
      console.error("Create checkpoint error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/checkpoints", authenticateUser, async (req, res) => {
    try {
      const checkpoints = await storage.getUserCheckpoints(req.user!.id);
      res.json(checkpoints);
    } catch (error) {
      console.error("Get checkpoints error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Prepare Briefs API
  app.post("/api/prepare-briefs", authenticateUser, async (req, res) => {
    try {
      const { title, goal, stakeholders, keyPoints, blockers, actions } = req.body;

      // Generate AI brief and checklist
      const prompt = `You are a leadership coach helping someone prepare for an important conversation.

Based on the following information, create a concise, practical one-page brief (max 300 words) and a checklist of 4-6 key items to remember.

CONVERSATION PREP:
Title: ${title}
Goal: ${goal}
${stakeholders.length > 0 ? `Stakeholders: ${stakeholders.join(", ")}` : ""}
${keyPoints.length > 0 ? `Key Points: ${keyPoints.join("; ")}` : ""}
${blockers.length > 0 ? `Potential Blockers: ${blockers.join("; ")}` : ""}
${actions.length > 0 ? `Desired Actions: ${actions.join("; ")}` : ""}

Return ONLY a JSON object (no other text) with:
{
  "brief": "string (conversational, encouraging tone, max 300 words)",
  "checklist": ["item1", "item2", "item3", "item4", "item5", "item6"]
}`;

      const aiResponse = await openaiService.getLeadershipResponse(prompt, "conversation_prep", []);
      const parsed = JSON.parse(aiResponse.message);

      const brief = await storage.createPrepareBrief({
        userId: req.user!.id,
        title,
        goal,
        stakeholders,
        keyPoints,
        blockers,
        actions,
        brief: parsed.brief,
        checklist: parsed.checklist.map((item: string) => ({ item, completed: false })),
      });

      // Track checkpoint
      await storage.createCheckpoint({
        userId: req.user!.id,
        type: 'first_brief',
        metadata: { briefId: brief.id },
      });

      res.json(brief);
    } catch (error) {
      console.error("Create prepare brief error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/prepare-briefs", authenticateUser, async (req, res) => {
    try {
      const briefs = await storage.getPrepareBriefs(req.user!.id);
      res.json(briefs);
    } catch (error) {
      console.error("Get prepare briefs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/prepare-briefs/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const brief = await storage.getPrepareBrief(id);

      if (!brief) {
        return res.status(404).json({ error: "Brief not found" });
      }

      if (brief.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(brief);
    } catch (error) {
      console.error("Get prepare brief error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Role Play API
  app.post("/api/role-play", authenticateUser, async (req, res) => {
    try {
      const { scenario, persona } = req.body;

      // Generate AI's opening line
      const openingPrompt = `You are role-playing as: ${persona}

The scenario is: ${scenario}

You are a difficult stakeholder in this conversation. Be realistic and challenging, but not rude. Start the conversation by greeting the user and asking them what they want to discuss. Keep it brief (1-2 sentences).

Respond ONLY with your opening line, nothing else.`;

      const aiResponse = await openaiService.getLeadershipResponse(openingPrompt, "role_play", []);

      const session = await storage.createRolePlaySession({
        userId: req.user!.id,
        scenario,
        persona,
        transcript: [{
          speaker: "ai",
          message: aiResponse.message,
          timestamp: new Date().toISOString(),
        }],
      });

      res.json({
        id: session.id,
        aiOpening: aiResponse.message,
      });
    } catch (error) {
      console.error("Create role play session error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/role-play/:id/message", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const { message } = req.body;

      const session = await storage.getRolePlaySession(id);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Build conversation history
      const conversationHistory = (session.transcript as any[]).map((msg: any) => ({
        sender: (msg.speaker === "user" ? "user" : "assistant") as "user" | "assistant",
        text: msg.message,
      }));

      // Generate AI response
      const prompt = `You are role-playing as: ${session.persona}

The scenario is: ${session.scenario}

You are a difficult stakeholder in this conversation. Be realistic and challenging, but not rude. The user just said: "${message}"

Respond naturally as this persona would. Keep your response brief (2-3 sentences max).

Respond ONLY with your response, nothing else.`;

      const aiResponse = await openaiService.getLeadershipResponse(prompt, "role_play", conversationHistory);

      // Update transcript
      const updatedTranscript = [
        ...(session.transcript as any[]),
        {
          speaker: "user",
          message,
          timestamp: new Date().toISOString(),
        },
        {
          speaker: "ai",
          message: aiResponse.message,
          timestamp: new Date().toISOString(),
        },
      ];

      await storage.updateRolePlaySession(id, {
        transcript: updatedTranscript,
      });

      res.json({ aiResponse: aiResponse.message });
    } catch (error) {
      console.error("Role play message error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/role-play/sessions", authenticateUser, async (req, res) => {
    try {
      const sessions = await storage.getRolePlaySessions(req.user!.id);
      res.json(sessions);
    } catch (error) {
      console.error("Get role play sessions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/role-play/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getRolePlaySession(id);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updated = await storage.updateRolePlaySession(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update role play session error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Pulse Survey API
  app.post("/api/pulse-surveys", authenticateUser, async (req, res) => {
    try {
      const { responses, notes } = req.body;

      const survey = await storage.createPulseSurvey({
        userId: req.user!.id,
        responses,
        notes: notes || null,
      });

      // Track checkpoint
      await storage.createCheckpoint({
        userId: req.user!.id,
        type: 'first_pulse',
        metadata: { surveyId: survey.id },
      });

      res.json(survey);
    } catch (error) {
      console.error("Create pulse survey error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/pulse-surveys", authenticateUser, async (req, res) => {
    try {
      const surveys = await storage.getPulseSurveys(req.user!.id, 30);
      res.json(surveys);
    } catch (error) {
      console.error("Get pulse surveys error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/role-play/:id/complete", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getRolePlaySession(id);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Generate feedback
      const transcript = (session.transcript as any[])
        .map((msg: any) => `${msg.speaker === "user" ? "User" : session.persona}: ${msg.message}`)
        .join("\n\n");

      const feedbackPrompt = `As a leadership coach, analyze this role-play conversation:

SCENARIO: ${session.scenario}
PERSONA PLAYED: ${session.persona}

TRANSCRIPT:
${transcript}

Provide constructive feedback in JSON format:
{
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "suggestedLines": ["alternative line 1", "alternative line 2"]
}

Focus on communication effectiveness, clarity, and handling the difficult stakeholder. Be specific and actionable.`;

      const feedbackResponse = await openaiService.getLeadershipResponse(feedbackPrompt, "role_play", []);
      const feedback = JSON.parse(feedbackResponse.message);

      await storage.updateRolePlaySession(id, {
        status: "completed",
        completedAt: new Date(),
        feedback,
      });

      // Track checkpoint
      await storage.createCheckpoint({
        userId: req.user!.id,
        type: 'first_roleplay',
        metadata: { sessionId: id },
      });

      res.json({ feedback });
    } catch (error) {
      console.error("Complete role play session error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
