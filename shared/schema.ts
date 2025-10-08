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
  // 360 Structured Insights
  growthProfile: jsonb("growth_profile").default('[]'), // Leadership style and characteristics (structured data)
  personalValues: jsonb("personal_values").default('[]'), // Array of values
  redZones: jsonb("red_zones").default('[]'), // Watch-outs/behaviors to be mindful of
  greenZones: jsonb("green_zones").default('[]'), // Strengths to leverage
  recommendations: jsonb("recommendations").default('[]'), // Practical next steps
  // Planning Areas
  obpData: jsonb("obp_data"), // One Big Practice: {objective, checklists, notes}
  immunityToChangeData: jsonb("immunity_to_change_data"), // {commitments, competingCommitments, experiments}
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

// Clean signup schema with only required fields for user registration
export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  fullName: z.string().min(1, "Full name is required"),
  role: z.string().optional().default("user"),
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
  name: z.string().optional(),
  role: z.string().optional(),
  personalValues: z.array(z.string()).optional(),
  growthProfile: z.any().optional(),
  redZones: z.array(z.string()).optional(),
  greenZones: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
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
export type SignupData = z.infer<typeof signupSchema>;
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

// Success Checkpoints
export const checkpoints = pgTable("checkpoints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'report_parsed', 'first_recommendation', 'first_profile_chat', 'first_brief', 'first_roleplay', 'first_pulse'
  achievedAt: timestamp("achieved_at").defaultNow(),
  metadata: jsonb("metadata"), // Optional data about the achievement
}, (table) => ({
  uniqueUserCheckpoint: sql`UNIQUE (user_id, type)`, // Ensure each milestone is recorded once per user
}));

// Prepare Briefs (Conversation Prep Tool)
export const prepareBriefs = pgTable("prepare_briefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  goal: text("goal").notNull(),
  stakeholders: jsonb("stakeholders").default('[]'), // Array of stakeholder names
  keyPoints: jsonb("key_points").default('[]'), // Array of key points to cover
  blockers: jsonb("blockers").default('[]'), // Likely obstacles
  actions: jsonb("actions").default('[]'), // Follow-up actions
  brief: text("brief"), // AI-generated one-page brief
  checklist: jsonb("checklist").default('[]'), // [{item: string, completed: boolean}]
  isExported: boolean("is_exported").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Role Play Sessions
export const rolePlaySessions = pgTable("role_play_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  scenario: text("scenario").notNull(),
  persona: text("persona").notNull(), // Who the AI is playing
  transcript: jsonb("transcript").default('[]'), // [{speaker: 'user'|'ai', message: string, timestamp: string}]
  feedback: jsonb("feedback"), // {strengths: [], improvements: [], suggestedLines: []}
  status: text("status").default('in_progress'), // 'in_progress', 'completed'
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pulse Surveys
export const pulseSurveys = pgTable("pulse_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull().defaultNow(),
  responses: jsonb("responses").notNull(), // {question: string, answer: string/number}[]
  source: text("source").default('manual'), // 'manual' or 'org_integration'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schemas for new tables
export const insertCheckpointSchema = createInsertSchema(checkpoints).omit({
  id: true,
  achievedAt: true,
});

export const insertPrepareBriefSchema = createInsertSchema(prepareBriefs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRolePlaySessionSchema = createInsertSchema(rolePlaySessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPulseSurveySchema = createInsertSchema(pulseSurveys).omit({
  id: true,
  createdAt: true,
});

// Types for new tables
export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = ReturnType<typeof insertCheckpointSchema['parse']>;
export type PrepareBrief = typeof prepareBriefs.$inferSelect;
export type InsertPrepareBrief = ReturnType<typeof insertPrepareBriefSchema['parse']>;
export type RolePlaySession = typeof rolePlaySessions.$inferSelect;
export type InsertRolePlaySession = ReturnType<typeof insertRolePlaySessionSchema['parse']>;
export type PulseSurvey = typeof pulseSurveys.$inferSelect;
export type InsertPulseSurvey = ReturnType<typeof insertPulseSurveySchema['parse']>;
