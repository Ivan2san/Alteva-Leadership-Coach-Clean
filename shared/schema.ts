import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default('user'), // 'user' | 'admin'
  // LGP360 Report Fields
  lgp360OriginalContent: text("lgp360_original_content"), // Raw uploaded document content
  lgp360Assessment: text("lgp360_assessment"), // Professional coaching assessment
  lgp360UploadedAt: timestamp("lgp360_uploaded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title"),
  topic: text("topic").notNull(),
  summary: text("summary"),
  messages: jsonb("messages").notNull().default('[]'),
  messageCount: integer("message_count").default(0),
  userId: varchar("user_id"), // for future user authentication
  isStarred: boolean("is_starred").default(false),
  status: text("status").default('active'), // active, archived, deleted
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const knowledgeBaseFiles = pgTable("knowledge_base_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalName: text("original_name").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  tags: text("tags").array().default([]),
  description: text("description"),
  isProcessed: boolean("is_processed").default(false),
  extractedText: text("extracted_text"), // Extracted text content for search
  vectorStoreFileId: text("vector_store_file_id"),
  processingError: text("processing_error"),
  processedAt: timestamp("processed_at"), // When file was successfully processed
  uploadedBy: varchar("uploaded_by"), // future user reference
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const promptTemplates = pgTable("prompt_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // "coaching", "reflection", "goal-setting", etc.
  description: text("description"),
  template: text("template").notNull(), // The prompt template with placeholders
  variables: text("variables").array().default([]), // Variable names in the template
  tags: text("tags").array().default([]),
  isDefault: boolean("is_default").default(false),
  usageCount: integer("usage_count").default(0),
  createdBy: varchar("created_by"), // future user reference
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const signupSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const createUserSchema = insertUserSchema; // For backend storage use

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// LGP360 Report Schema (professional coaching assessment)
export const lgp360ReportSchema = z.object({
  originalContent: z.string().optional(),
  assessment: z.string().min(1, "Professional coaching assessment is required"),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastMessageAt: true,
});

export const insertKnowledgeBaseFileSchema = createInsertSchema(knowledgeBaseFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromptTemplateSchema = createInsertSchema(promptTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
});

export type InsertUser = ReturnType<typeof insertUserSchema['parse']>;
export type User = typeof users.$inferSelect;
export type SignupData = ReturnType<typeof signupSchema['parse']>;
export type LoginData = z.infer<typeof loginSchema>;
export type LGP360ReportData = z.infer<typeof lgp360ReportSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = ReturnType<typeof insertConversationSchema['parse']>;
export type KnowledgeBaseFile = typeof knowledgeBaseFiles.$inferSelect;
export type InsertKnowledgeBaseFile = ReturnType<typeof insertKnowledgeBaseFileSchema['parse']>;
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = ReturnType<typeof insertPromptTemplateSchema['parse']>;

export const messageSchema = z.object({
  id: z.string(),
  sender: z.enum(['user', 'ai']),
  text: z.string(),
  timestamp: z.string(),
});

export type Message = z.infer<typeof messageSchema>;
