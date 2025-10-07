import { 
  type User, 
  type InsertUser, 
  type SignupData,
  type LoginData,
  type LGP360ReportData,
  type Conversation, 
  type InsertConversation,
  type KnowledgeBaseFile,
  type InsertKnowledgeBaseFile,
  type PromptTemplate,
  type InsertPromptTemplate,
  type Goal,
  type InsertGoal,
  type CheckIn,
  type InsertCheckIn,
  type Plan,
  type InsertPlan,
  type Milestone,
  type InsertMilestone,
  type NextAction,
  type InsertNextAction,
  type Checkpoint,
  type InsertCheckpoint,
  type PrepareBrief,
  type InsertPrepareBrief,
  type RolePlaySession,
  type InsertRolePlaySession,
  type PulseSurvey,
  type InsertPulseSurvey,
  createUserSchema,
  users, 
  conversations, 
  knowledgeBaseFiles,
  promptTemplates,
  goals,
  checkIns,
  plans,
  milestones,
  nextActions,
  checkpoints,
  prepareBriefs,
  rolePlaySessions,
  pulseSurveys
} from "@shared/schema";
import { hashPassword, verifyPassword } from "./auth";
import { db } from "./db";
import { eq, ilike, or, desc, and, count, avg, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: Pick<SignupData, 'email' | 'password' | 'fullName' | 'role'>): Promise<User>;
  validateLogin(email: string, password: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserLGP360(id: string, lgp360Data: LGP360ReportData): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversations(status?: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;
  searchConversations(query: string): Promise<Conversation[]>;
  getConversationsByTopic(topic: string): Promise<Conversation[]>;
  starConversation(id: string, isStarred: boolean): Promise<Conversation | undefined>;
  archiveConversation(id: string): Promise<Conversation | undefined>;
  
  // Analytics operations
  getConversationStats(): Promise<{
    total: number;
    byTopic: { topic: string; count: number; avgMessages: number }[];
    byStatus: { status: string; count: number }[];
    recentActivity: { date: string; count: number }[];
    totalMessages: number;
    avgConversationLength: number;
  }>;
  getTopicEngagement(): Promise<{ topic: string; totalMessages: number; avgLength: number; lastUsed: string }[]>;
  
  // Prompt template operations
  createPromptTemplate(template: InsertPromptTemplate): Promise<PromptTemplate>;
  getPromptTemplates(category?: string): Promise<PromptTemplate[]>;
  getPromptTemplate(id: string): Promise<PromptTemplate | undefined>;
  updatePromptTemplate(id: string, updates: Partial<PromptTemplate>): Promise<PromptTemplate | undefined>;
  deletePromptTemplate(id: string): Promise<boolean>;
  incrementTemplateUsage(id: string): Promise<void>;
  
  // Knowledge base file operations
  createKnowledgeBaseFile(file: InsertKnowledgeBaseFile): Promise<KnowledgeBaseFile>;
  getKnowledgeBaseFiles(): Promise<KnowledgeBaseFile[]>;
  getKnowledgeBaseFile(id: string): Promise<KnowledgeBaseFile | undefined>;
  updateKnowledgeBaseFile(id: string, updates: Partial<KnowledgeBaseFile>): Promise<KnowledgeBaseFile | undefined>;
  deleteKnowledgeBaseFile(id: string): Promise<boolean>;
  searchKnowledgeBaseFiles(query: string): Promise<KnowledgeBaseFile[]>;
  
  // Goal operations (Journey 2)
  createGoal(goal: InsertGoal): Promise<Goal>;
  getGoals(userId: string): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | undefined>;
  updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<boolean>;
  getGoalsByStatus(userId: string, status: string): Promise<Goal[]>;

  // Check-in operations (Journey 2)
  createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn>;
  getCheckIns(userId: string, limit?: number): Promise<CheckIn[]>;
  getCheckIn(id: string): Promise<CheckIn | undefined>;
  updateCheckIn(id: string, updates: Partial<CheckIn>): Promise<CheckIn | undefined>;
  deleteCheckIn(id: string): Promise<boolean>;
  getCheckInStreak(userId: string): Promise<number>;
  getCheckInByDate(userId: string, date: Date): Promise<CheckIn | undefined>;

  // Analytics operations (Journey 2)
  getGoalStats(userId: string): Promise<{
    total: number;
    completed: number;
    active: number;
    avgProgress: number;
  }>;
  getCheckInTrends(userId: string, days?: number): Promise<{
    date: string;
    mood: number;
    energy: number;
    focus: number;
  }[]>;

  // Plan operations (Journey 2)
  createPlan(plan: InsertPlan): Promise<Plan>;
  getPlans(userId: string): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | undefined>;
  updatePlan(id: string, updates: Partial<Plan>): Promise<Plan | undefined>;
  deletePlan(id: string): Promise<boolean>;

  // Milestone operations
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  getMilestones(planId: string): Promise<Milestone[]>;
  updateMilestone(id: string, updates: Partial<Milestone>): Promise<Milestone | undefined>;
  deleteMilestone(id: string): Promise<boolean>;

  // Next Actions operations
  createNextAction(action: InsertNextAction): Promise<NextAction>;
  getNextActions(userId: string, planId?: string): Promise<NextAction[]>;
  updateNextAction(id: string, updates: Partial<NextAction>): Promise<NextAction | undefined>;
  deleteNextAction(id: string): Promise<boolean>;

  // Checkpoint operations
  createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint>;
  getUserCheckpoints(userId: string): Promise<Checkpoint[]>;
  hasCheckpoint(userId: string, type: string): Promise<boolean>;

  // Prepare Brief operations
  createPrepareBrief(brief: InsertPrepareBrief): Promise<PrepareBrief>;
  getPrepareBriefs(userId: string): Promise<PrepareBrief[]>;
  getPrepareBrief(id: string): Promise<PrepareBrief | undefined>;
  updatePrepareBrief(id: string, updates: Partial<PrepareBrief>): Promise<PrepareBrief | undefined>;
  deletePrepareBrief(id: string): Promise<boolean>;

  // Role Play Session operations
  createRolePlaySession(session: InsertRolePlaySession): Promise<RolePlaySession>;
  getRolePlaySessions(userId: string): Promise<RolePlaySession[]>;
  getRolePlaySession(id: string): Promise<RolePlaySession | undefined>;
  updateRolePlaySession(id: string, updates: Partial<RolePlaySession>): Promise<RolePlaySession | undefined>;
  deleteRolePlaySession(id: string): Promise<boolean>;

  // Pulse Survey operations
  createPulseSurvey(survey: InsertPulseSurvey): Promise<PulseSurvey>;
  getPulseSurveys(userId: string, limit?: number): Promise<PulseSurvey[]>;
  getPulseSurvey(id: string): Promise<PulseSurvey | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Pick<SignupData, 'email' | 'password' | 'fullName' | 'role'>): Promise<User> {
    const hashedPassword = await hashPassword(userData.password);
    const [user] = await db.insert(users).values({
      email: userData.email,
      password: hashedPassword,
      fullName: userData.fullName,
      role: userData.role || 'user'
    }).returning();
    return user;
  }

  async validateLogin(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await verifyPassword(password, user.password);
    return isValid ? user : null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserLGP360(id: string, lgp360Data: LGP360ReportData): Promise<User | undefined> {
    const updateData: any = {
      lgp360OriginalContent: lgp360Data.originalContent || null,
      lgp360Assessment: lgp360Data.assessment,
      lgp360UploadedAt: new Date(),
      updatedAt: new Date()
    };

    // Add structured insights if provided
    if (lgp360Data.personalValues !== undefined) {
      updateData.personalValues = lgp360Data.personalValues;
    }
    if (lgp360Data.growthProfile !== undefined) {
      updateData.growthProfile = lgp360Data.growthProfile;
    }
    if (lgp360Data.redZones !== undefined) {
      updateData.redZones = lgp360Data.redZones;
    }
    if (lgp360Data.greenZones !== undefined) {
      updateData.greenZones = lgp360Data.greenZones;
    }
    if (lgp360Data.recommendations !== undefined) {
      updateData.recommendations = lgp360Data.recommendations;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Conversation operations
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(insertConversation).returning();
    return conversation;
  }

  async getConversations(status?: string): Promise<Conversation[]> {
    const query = db.select().from(conversations);
    if (status) {
      return await query.where(eq(conversations.status, status)).orderBy(desc(conversations.updatedAt));
    }
    return await query.where(eq(conversations.status, 'active')).orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await db.delete(conversations).where(eq(conversations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async searchConversations(query: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.status, 'active'),
          or(
            ilike(conversations.title, `%${query}%`),
            ilike(conversations.summary, `%${query}%`),
            ilike(conversations.topic, `%${query}%`)
          )
        )
      )
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversationsByTopic(topic: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.topic, topic),
          eq(conversations.status, 'active')
        )
      )
      .orderBy(desc(conversations.updatedAt));
  }

  async starConversation(id: string, isStarred: boolean): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({ isStarred, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  async archiveConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  // Analytics operations
  async getConversationStats() {
    // Get total conversations
    const totalResult = await db.select({ count: count() }).from(conversations);
    const total = totalResult[0]?.count || 0;

    // Get conversations by topic
    const byTopicResult = await db
      .select({
        topic: conversations.topic,
        count: count(),
        avgMessages: avg(conversations.messageCount)
      })
      .from(conversations)
      .groupBy(conversations.topic);

    // Get conversations by status
    const byStatusResult = await db
      .select({
        status: conversations.status,
        count: count()
      })
      .from(conversations)
      .groupBy(conversations.status);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentActivityResult = await db
      .select({
        date: sql<string>`DATE(${conversations.createdAt})`,
        count: count()
      })
      .from(conversations)
      .where(sql`${conversations.createdAt} >= ${thirtyDaysAgo}`)
      .groupBy(sql`DATE(${conversations.createdAt})`)
      .orderBy(sql`DATE(${conversations.createdAt})`);

    // Get total messages and average conversation length
    const statsResult = await db
      .select({
        totalMessages: sql<number>`COALESCE(SUM(${conversations.messageCount}), 0)`,
        avgLength: sql<number>`COALESCE(AVG(${conversations.messageCount}), 0)`
      })
      .from(conversations);

    return {
      total,
      byTopic: byTopicResult.map(row => ({
        topic: row.topic,
        count: Number(row.count),
        avgMessages: Number(row.avgMessages) || 0
      })),
      byStatus: byStatusResult.map(row => ({
        status: row.status || 'unknown',
        count: Number(row.count)
      })),
      recentActivity: recentActivityResult.map(row => ({
        date: row.date,
        count: Number(row.count)
      })),
      totalMessages: Number(statsResult[0]?.totalMessages) || 0,
      avgConversationLength: Number(statsResult[0]?.avgLength) || 0
    };
  }

  async getTopicEngagement() {
    const result = await db
      .select({
        topic: conversations.topic,
        totalMessages: sql<number>`COALESCE(SUM(${conversations.messageCount}), 0)`,
        avgLength: sql<number>`COALESCE(AVG(${conversations.messageCount}), 0)`,
        lastUsed: sql<string>`MAX(${conversations.lastMessageAt})`
      })
      .from(conversations)
      .where(eq(conversations.status, 'active'))
      .groupBy(conversations.topic)
      .orderBy(desc(sql<number>`COALESCE(SUM(${conversations.messageCount}), 0)`));

    return result.map(row => ({
      topic: row.topic,
      totalMessages: Number(row.totalMessages),
      avgLength: Number(row.avgLength),
      lastUsed: row.lastUsed || ''
    }));
  }

  // Prompt template operations
  async createPromptTemplate(template: InsertPromptTemplate): Promise<PromptTemplate> {
    const [promptTemplate] = await db.insert(promptTemplates).values(template).returning();
    return promptTemplate;
  }

  async getPromptTemplates(category?: string): Promise<PromptTemplate[]> {
    const query = db.select().from(promptTemplates);
    if (category) {
      return await query.where(eq(promptTemplates.category, category)).orderBy(desc(promptTemplates.usageCount));
    }
    return await query.orderBy(desc(promptTemplates.usageCount));
  }

  async getPromptTemplate(id: string): Promise<PromptTemplate | undefined> {
    const [template] = await db.select().from(promptTemplates).where(eq(promptTemplates.id, id));
    return template;
  }

  async updatePromptTemplate(id: string, updates: Partial<PromptTemplate>): Promise<PromptTemplate | undefined> {
    const [template] = await db
      .update(promptTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(promptTemplates.id, id))
      .returning();
    return template;
  }

  async deletePromptTemplate(id: string): Promise<boolean> {
    const result = await db.delete(promptTemplates).where(eq(promptTemplates.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async incrementTemplateUsage(id: string): Promise<void> {
    await db
      .update(promptTemplates)
      .set({ 
        usageCount: sql`${promptTemplates.usageCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(promptTemplates.id, id));
  }

  // Knowledge base file operations
  async createKnowledgeBaseFile(file: InsertKnowledgeBaseFile): Promise<KnowledgeBaseFile> {
    const [kbFile] = await db.insert(knowledgeBaseFiles).values(file).returning();
    return kbFile;
  }

  async getKnowledgeBaseFiles(): Promise<KnowledgeBaseFile[]> {
    return await db.select().from(knowledgeBaseFiles).orderBy(knowledgeBaseFiles.createdAt);
  }

  async getKnowledgeBaseFile(id: string): Promise<KnowledgeBaseFile | undefined> {
    const [file] = await db.select().from(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.id, id));
    return file;
  }

  async updateKnowledgeBaseFile(id: string, updates: Partial<KnowledgeBaseFile>): Promise<KnowledgeBaseFile | undefined> {
    const [file] = await db
      .update(knowledgeBaseFiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(knowledgeBaseFiles.id, id))
      .returning();
    return file;
  }

  async deleteKnowledgeBaseFile(id: string): Promise<boolean> {
    const result = await db.delete(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async searchKnowledgeBaseFiles(query: string): Promise<KnowledgeBaseFile[]> {
    return await db
      .select()
      .from(knowledgeBaseFiles)
      .where(
        or(
          ilike(knowledgeBaseFiles.originalName, `%${query}%`),
          ilike(knowledgeBaseFiles.description, `%${query}%`),
        )
      );
  }

  // Goal operations (Journey 2)
  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [newGoal] = await db.insert(goals).values(goal).returning();
    return newGoal;
  }

  async getGoals(userId: string): Promise<Goal[]> {
    return await db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));
  }

  async getGoal(id: string): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal;
  }

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | undefined> {
    const [goal] = await db
      .update(goals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();
    return goal;
  }

  async deleteGoal(id: string): Promise<boolean> {
    const result = await db.delete(goals).where(eq(goals.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getGoalsByStatus(userId: string, status: string): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, status)))
      .orderBy(desc(goals.createdAt));
  }

  // Check-in operations (Journey 2)
  async createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn> {
    const [newCheckIn] = await db.insert(checkIns).values(checkIn).returning();
    return newCheckIn;
  }

  async getCheckIns(userId: string, limit?: number): Promise<CheckIn[]> {
    const query = db
      .select()
      .from(checkIns)
      .where(eq(checkIns.userId, userId))
      .orderBy(desc(checkIns.date));
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async getCheckIn(id: string): Promise<CheckIn | undefined> {
    const [checkIn] = await db.select().from(checkIns).where(eq(checkIns.id, id));
    return checkIn;
  }

  async updateCheckIn(id: string, updates: Partial<CheckIn>): Promise<CheckIn | undefined> {
    const [checkIn] = await db
      .update(checkIns)
      .set(updates)
      .where(eq(checkIns.id, id))
      .returning();
    return checkIn;
  }

  async deleteCheckIn(id: string): Promise<boolean> {
    const result = await db.delete(checkIns).where(eq(checkIns.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getCheckInStreak(userId: string): Promise<number> {
    const allCheckIns = await db
      .select()
      .from(checkIns)
      .where(eq(checkIns.userId, userId))
      .orderBy(desc(checkIns.date));

    if (allCheckIns.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentDate = new Date(today);
    
    for (const checkIn of allCheckIns) {
      const checkInDate = new Date(checkIn.date);
      checkInDate.setHours(0, 0, 0, 0);
      
      if (checkInDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (checkInDate.getTime() < currentDate.getTime()) {
        break;
      }
    }
    
    return streak;
  }

  async getCheckInByDate(userId: string, date: Date): Promise<CheckIn | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const [checkIn] = await db
      .select()
      .from(checkIns)
      .where(
        and(
          eq(checkIns.userId, userId),
          sql`${checkIns.date} >= ${startOfDay}`,
          sql`${checkIns.date} <= ${endOfDay}`
        )
      )
      .limit(1);
    
    return checkIn;
  }

  // Analytics operations (Journey 2)
  async getGoalStats(userId: string): Promise<{
    total: number;
    completed: number;
    active: number;
    avgProgress: number;
  }> {
    const allGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId));

    const total = allGoals.length;
    const completed = allGoals.filter(g => g.status === 'completed').length;
    const active = allGoals.filter(g => g.status !== 'completed' && g.status !== 'abandoned').length;
    
    const totalProgress = allGoals.reduce((sum, g) => sum + (g.progress || 0), 0);
    const avgProgress = total > 0 ? Math.round(totalProgress / total) : 0;

    return {
      total,
      completed,
      active,
      avgProgress
    };
  }

  async getCheckInTrends(userId: string, days: number = 30): Promise<{
    date: string;
    mood: number;
    energy: number;
    focus: number;
  }[]> {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    daysAgo.setHours(0, 0, 0, 0);

    const result = await db
      .select({
        date: sql<string>`DATE(${checkIns.date})`,
        mood: sql<number>`ROUND(AVG(${checkIns.mood})::numeric, 1)`,
        energy: sql<number>`ROUND(AVG(${checkIns.energy})::numeric, 1)`,
        focus: sql<number>`ROUND(AVG(${checkIns.focus})::numeric, 1)`
      })
      .from(checkIns)
      .where(
        and(
          eq(checkIns.userId, userId),
          sql`${checkIns.date} >= ${daysAgo}`
        )
      )
      .groupBy(sql`DATE(${checkIns.date})`)
      .orderBy(sql`DATE(${checkIns.date})`);

    return result.map(row => ({
      date: row.date,
      mood: Number(row.mood) || 0,
      energy: Number(row.energy) || 0,
      focus: Number(row.focus) || 0
    }));
  }

  // Plan operations (Journey 2)
  async createPlan(plan: InsertPlan): Promise<Plan> {
    const [newPlan] = await db.insert(plans).values(plan).returning();
    return newPlan;
  }

  async getPlans(userId: string): Promise<Plan[]> {
    return await db.select().from(plans).where(eq(plans.userId, userId)).orderBy(desc(plans.createdAt));
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async updatePlan(id: string, updates: Partial<Plan>): Promise<Plan | undefined> {
    const [plan] = await db
      .update(plans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(plans.id, id))
      .returning();
    return plan;
  }

  async deletePlan(id: string): Promise<boolean> {
    const result = await db.delete(plans).where(eq(plans.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Milestone operations
  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [newMilestone] = await db.insert(milestones).values(milestone).returning();
    return newMilestone;
  }

  async getMilestones(planId: string): Promise<Milestone[]> {
    return await db
      .select()
      .from(milestones)
      .where(eq(milestones.planId, planId))
      .orderBy(milestones.order);
  }

  async updateMilestone(id: string, updates: Partial<Milestone>): Promise<Milestone | undefined> {
    const [milestone] = await db
      .update(milestones)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(milestones.id, id))
      .returning();
    return milestone;
  }

  async deleteMilestone(id: string): Promise<boolean> {
    const result = await db.delete(milestones).where(eq(milestones.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Next Actions operations
  async createNextAction(action: InsertNextAction): Promise<NextAction> {
    const [newAction] = await db.insert(nextActions).values(action).returning();
    return newAction;
  }

  async getNextActions(userId: string, planId?: string): Promise<NextAction[]> {
    const query = db.select().from(nextActions).where(eq(nextActions.userId, userId));
    
    if (planId) {
      return await query.where(and(eq(nextActions.userId, userId), eq(nextActions.planId, planId))).orderBy(desc(nextActions.createdAt));
    }
    
    return await query.orderBy(desc(nextActions.createdAt));
  }

  async updateNextAction(id: string, updates: Partial<NextAction>): Promise<NextAction | undefined> {
    const [action] = await db
      .update(nextActions)
      .set(updates)
      .where(eq(nextActions.id, id))
      .returning();
    return action;
  }

  async deleteNextAction(id: string): Promise<boolean> {
    const result = await db.delete(nextActions).where(eq(nextActions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Checkpoint operations
  async createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint> {
    const [newCheckpoint] = await db.insert(checkpoints).values(checkpoint).returning();
    return newCheckpoint;
  }

  async getUserCheckpoints(userId: string): Promise<Checkpoint[]> {
    return await db
      .select()
      .from(checkpoints)
      .where(eq(checkpoints.userId, userId))
      .orderBy(desc(checkpoints.achievedAt));
  }

  async hasCheckpoint(userId: string, type: string): Promise<boolean> {
    const [checkpoint] = await db
      .select()
      .from(checkpoints)
      .where(and(eq(checkpoints.userId, userId), eq(checkpoints.type, type)))
      .limit(1);
    return !!checkpoint;
  }

  // Prepare Brief operations
  async createPrepareBrief(brief: InsertPrepareBrief): Promise<PrepareBrief> {
    const [newBrief] = await db.insert(prepareBriefs).values(brief).returning();
    return newBrief;
  }

  async getPrepareBriefs(userId: string): Promise<PrepareBrief[]> {
    return await db
      .select()
      .from(prepareBriefs)
      .where(eq(prepareBriefs.userId, userId))
      .orderBy(desc(prepareBriefs.createdAt));
  }

  async getPrepareBrief(id: string): Promise<PrepareBrief | undefined> {
    const [brief] = await db.select().from(prepareBriefs).where(eq(prepareBriefs.id, id));
    return brief;
  }

  async updatePrepareBrief(id: string, updates: Partial<PrepareBrief>): Promise<PrepareBrief | undefined> {
    const [brief] = await db
      .update(prepareBriefs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(prepareBriefs.id, id))
      .returning();
    return brief;
  }

  async deletePrepareBrief(id: string): Promise<boolean> {
    const result = await db.delete(prepareBriefs).where(eq(prepareBriefs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Role Play Session operations
  async createRolePlaySession(session: InsertRolePlaySession): Promise<RolePlaySession> {
    const [newSession] = await db.insert(rolePlaySessions).values(session).returning();
    return newSession;
  }

  async getRolePlaySessions(userId: string): Promise<RolePlaySession[]> {
    return await db
      .select()
      .from(rolePlaySessions)
      .where(eq(rolePlaySessions.userId, userId))
      .orderBy(desc(rolePlaySessions.createdAt));
  }

  async getRolePlaySession(id: string): Promise<RolePlaySession | undefined> {
    const [session] = await db.select().from(rolePlaySessions).where(eq(rolePlaySessions.id, id));
    return session;
  }

  async updateRolePlaySession(id: string, updates: Partial<RolePlaySession>): Promise<RolePlaySession | undefined> {
    const [session] = await db
      .update(rolePlaySessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rolePlaySessions.id, id))
      .returning();
    return session;
  }

  async deleteRolePlaySession(id: string): Promise<boolean> {
    const result = await db.delete(rolePlaySessions).where(eq(rolePlaySessions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Pulse Survey operations
  async createPulseSurvey(survey: InsertPulseSurvey): Promise<PulseSurvey> {
    const [newSurvey] = await db.insert(pulseSurveys).values(survey).returning();
    return newSurvey;
  }

  async getPulseSurveys(userId: string, limit?: number): Promise<PulseSurvey[]> {
    let query = db
      .select()
      .from(pulseSurveys)
      .where(eq(pulseSurveys.userId, userId))
      .orderBy(desc(pulseSurveys.date));
    
    if (limit) {
      query = query.limit(limit) as any;
    }
    
    return await query;
  }

  async getPulseSurvey(id: string): Promise<PulseSurvey | undefined> {
    const [survey] = await db.select().from(pulseSurveys).where(eq(pulseSurveys.id, id));
    return survey;
  }
}

export const storage = new DatabaseStorage();
