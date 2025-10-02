import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openaiService } from "./services/openai";
import {
  insertConversationSchema,
  insertPromptTemplateSchema,
  lgp360ReportSchema,
  messageSchema,
  insertGoalSchema,
  insertCheckInSchema,
  insertPlanSchema,
  insertMilestoneSchema,
  insertNextActionSchema,
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

  // Journey 2 - Goals API
  app.get("/api/journey/goals", authenticateUser, async (req, res) => {
    try {
      const goals = await storage.getGoals(req.user!.id);
      res.json(goals);
    } catch (error) {
      console.error("Get goals error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/journey/goals", authenticateUser, async (req, res) => {
    try {
      const validationResult = insertGoalSchema.safeParse({
        ...req.body,
        userId: req.user!.id,
      });

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid goal data",
          details: validationResult.error.issues,
        });
      }

      const goal = await storage.createGoal(validationResult.data);
      res.json(goal);
    } catch (error) {
      console.error("Create goal error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/journey/goals/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const goal = await storage.getGoal(id);

      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      if (goal.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(goal);
    } catch (error) {
      console.error("Get goal error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/journey/goals/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const goal = await storage.getGoal(id);

      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      if (goal.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updatedGoal = await storage.updateGoal(id, {
        ...req.body,
        updatedAt: new Date(),
      });

      res.json(updatedGoal);
    } catch (error) {
      console.error("Update goal error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/journey/goals/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const goal = await storage.getGoal(id);

      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      if (goal.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const deleted = await storage.deleteGoal(id);

      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete goal" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete goal error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/journey/goals/status/:status", authenticateUser, async (req, res) => {
    try {
      const { status } = req.params;
      const goals = await storage.getGoalsByStatus(req.user!.id, status);
      res.json(goals);
    } catch (error) {
      console.error("Get goals by status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Journey 2 - Check-ins API
  app.get("/api/journey/check-ins", authenticateUser, async (req, res) => {
    try {
      const { limit } = req.query;
      const checkIns = await storage.getCheckIns(
        req.user!.id,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(checkIns);
    } catch (error) {
      console.error("Get check-ins error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/journey/check-ins", authenticateUser, async (req, res) => {
    try {
      const validationResult = insertCheckInSchema.safeParse({
        ...req.body,
        userId: req.user!.id,
      });

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid check-in data",
          details: validationResult.error.issues,
        });
      }

      const checkIn = await storage.createCheckIn(validationResult.data);
      res.json(checkIn);
    } catch (error) {
      console.error("Create check-in error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/journey/check-ins/streak", authenticateUser, async (req, res) => {
    try {
      const streak = await storage.getCheckInStreak(req.user!.id);
      res.json({ streak });
    } catch (error) {
      console.error("Get check-in streak error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/journey/check-ins/today", authenticateUser, async (req, res) => {
    try {
      const today = new Date();
      const checkIn = await storage.getCheckInByDate(req.user!.id, today);
      res.json(checkIn || null);
    } catch (error) {
      console.error("Get today's check-in error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/journey/check-ins/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const checkIn = await storage.getCheckIn(id);

      if (!checkIn) {
        return res.status(404).json({ error: "Check-in not found" });
      }

      if (checkIn.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(checkIn);
    } catch (error) {
      console.error("Get check-in error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/journey/check-ins/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const checkIn = await storage.getCheckIn(id);

      if (!checkIn) {
        return res.status(404).json({ error: "Check-in not found" });
      }

      if (checkIn.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updatedCheckIn = await storage.updateCheckIn(id, req.body);
      res.json(updatedCheckIn);
    } catch (error) {
      console.error("Update check-in error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/journey/check-ins/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const checkIn = await storage.getCheckIn(id);

      if (!checkIn) {
        return res.status(404).json({ error: "Check-in not found" });
      }

      if (checkIn.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const deleted = await storage.deleteCheckIn(id);

      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete check-in" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete check-in error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Journey 2 - Plans API
  app.get("/api/journey/plans", authenticateUser, async (req, res) => {
    try {
      const plans = await storage.getPlans(req.user!.id);
      res.json(plans);
    } catch (error) {
      console.error("Get plans error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/journey/plans", authenticateUser, async (req, res) => {
    try {
      const validatedData = insertPlanSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const plan = await storage.createPlan(validatedData);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Create plan error:", error);
      res.status(400).json({ error: "Invalid plan data" });
    }
  });

  app.get("/api/journey/plans/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const plan = await storage.getPlan(id);

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      if (plan.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(plan);
    } catch (error) {
      console.error("Get plan error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/journey/plans/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const plan = await storage.getPlan(id);

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      if (plan.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updated = await storage.updatePlan(id, req.body);

      if (!updated) {
        return res.status(500).json({ error: "Failed to update plan" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Update plan error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/journey/plans/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const plan = await storage.getPlan(id);

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      if (plan.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const deleted = await storage.deletePlan(id);

      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete plan" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete plan error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Journey 2 - Milestones API
  app.get("/api/journey/plans/:planId/milestones", authenticateUser, async (req, res) => {
    try {
      const { planId } = req.params;
      const plan = await storage.getPlan(planId);

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      if (plan.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const milestones = await storage.getMilestones(planId);
      res.json(milestones);
    } catch (error) {
      console.error("Get milestones error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/journey/plans/:planId/milestones", authenticateUser, async (req, res) => {
    try {
      const { planId } = req.params;
      const plan = await storage.getPlan(planId);

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      if (plan.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const validatedData = insertMilestoneSchema.parse({
        ...req.body,
        planId,
      });

      const milestone = await storage.createMilestone(validatedData);
      res.status(201).json(milestone);
    } catch (error) {
      console.error("Create milestone error:", error);
      res.status(400).json({ error: "Invalid milestone data" });
    }
  });

  app.patch("/api/journey/milestones/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const milestone = await storage.updateMilestone(id, req.body);

      if (!milestone) {
        return res.status(404).json({ error: "Milestone not found" });
      }

      res.json(milestone);
    } catch (error) {
      console.error("Update milestone error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/journey/milestones/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMilestone(id);

      if (!deleted) {
        return res.status(404).json({ error: "Milestone not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete milestone error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Journey 2 - Next Actions API
  app.get("/api/journey/next-actions", authenticateUser, async (req, res) => {
    try {
      const { planId } = req.query;
      const actions = await storage.getNextActions(
        req.user!.id,
        planId as string | undefined
      );
      res.json(actions);
    } catch (error) {
      console.error("Get next actions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/journey/next-actions", authenticateUser, async (req, res) => {
    try {
      const validatedData = insertNextActionSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const action = await storage.createNextAction(validatedData);
      res.status(201).json(action);
    } catch (error) {
      console.error("Create next action error:", error);
      res.status(400).json({ error: "Invalid next action data" });
    }
  });

  app.patch("/api/journey/next-actions/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const action = await storage.getNextActions(req.user!.id);
      const existing = action.find(a => a.id === id);

      if (!existing) {
        return res.status(404).json({ error: "Next action not found" });
      }

      if (existing.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updated = await storage.updateNextAction(id, req.body);

      if (!updated) {
        return res.status(500).json({ error: "Failed to update next action" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Update next action error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/journey/next-actions/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const action = await storage.getNextActions(req.user!.id);
      const existing = action.find(a => a.id === id);

      if (!existing) {
        return res.status(404).json({ error: "Next action not found" });
      }

      if (existing.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const deleted = await storage.deleteNextAction(id);

      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete next action" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete next action error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Journey 2 - Insights/Analytics API
  app.get("/api/journey/insights/goals", authenticateUser, async (req, res) => {
    try {
      const stats = await storage.getGoalStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      console.error("Get goal stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/journey/insights/check-ins/trends", authenticateUser, async (req, res) => {
    try {
      const { days } = req.query;
      const trends = await storage.getCheckInTrends(
        req.user!.id,
        days ? parseInt(days as string) : 30
      );
      res.json(trends);
    } catch (error) {
      console.error("Get check-in trends error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
