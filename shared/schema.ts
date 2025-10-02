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

// Journey 2 Tables
export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  status: text("status").notNull().default('active'),
  progress: integer("progress").default(0),
  targetDate: timestamp("target_date"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const checkIns = pgTable("check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull().defaultNow(),
  mood: integer("mood").notNull(),
  energy: integer("energy"),
  focus: integer("focus"),
  note: text("note"),
  isWeekly: boolean("is_weekly").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const milestones = pgTable("milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => plans.id),
  goalId: varchar("goal_id").references(() => goals.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default('pending'),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default('draft'),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const nextActions = pgTable("next_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  planId: varchar("plan_id").references(() => plans.id),
  goalId: varchar("goal_id").references(() => goals.id),
  text: text("text").notNull(),
  priority: text("priority").default('medium'),
  status: text("status").notNull().default('pending'),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Journey 2 Insert Schemas
export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
});

export const insertCheckInSchema = createInsertSchema(checkIns).omit({
  id: true,
  createdAt: true,
});

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNextActionSchema = createInsertSchema(nextActions).omit({
  id: true,
  createdAt: true,
});

// Journey 2 Types
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = ReturnType<typeof insertGoalSchema['parse']>;
export type CheckIn = typeof checkIns.$inferSelect;
export type InsertCheckIn = ReturnType<typeof insertCheckInSchema['parse']>;
export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = ReturnType<typeof insertMilestoneSchema['parse']>;
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = ReturnType<typeof insertPlanSchema['parse']>;
export type NextAction = typeof nextActions.$inferSelect;
export type InsertNextAction = ReturnType<typeof insertNextActionSchema['parse']>;
