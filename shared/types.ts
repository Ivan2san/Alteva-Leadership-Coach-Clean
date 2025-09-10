
// API Response Types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt?: string;
  lgp360Data?: LGP360Data;
  lgp360UploadedAt?: string;
}

export interface UserProfile extends Omit<User, 'id'> {
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
  timezone: string;
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData extends LoginCredentials {
  fullName: string;
}

export interface AuthResponse extends ApiResponse {
  token?: string;
  user?: User;
}

// Chat Types
export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  topic?: string;
  confidence?: number;
  sources?: string[];
  tokens?: number;
}

export interface ChatRequest {
  message: string;
  topic: string;
  conversationHistory?: Message[];
  conversationId?: string;
}

export interface ChatResponse extends ApiResponse {
  message?: string;
  metadata?: MessageMetadata;
}

// Conversation Types
export interface Conversation {
  id: string;
  userId: string;
  topic: string;
  title: string;
  messages: Message[];
  messageCount: number;
  lastMessageAt: string;
  status: 'active' | 'archived' | 'deleted';
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  topic: string;
  messageCount: number;
  lastMessageAt: string;
  status: 'active' | 'archived' | 'deleted';
}

// Knowledge Base Types
export interface KnowledgeBaseFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface FileUploadRequest {
  file: File;
  description?: string;
}

export interface FileProcessingStatus {
  fileId: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
}

// Topic Configuration Types
export type TopicKey = 
  | 'self-awareness'
  | 'emotional-intelligence'
  | 'communication'
  | 'team-building'
  | 'decision-making'
  | 'strategic-thinking'
  | 'change-management'
  | 'growth-profile';

export interface TopicConfig {
  title: string;
  description: string;
  icon: string;
  systemPrompt: string;
  suggestedPrompts: string[];
  color: string;
}

// LGP360 Report Types
export interface LGP360Data {
  reportId: string;
  scores: LGP360Scores;
  competencies: LGP360Competency[];
  recommendations: string[];
  uploadedAt: string;
}

export interface LGP360Scores {
  overall: number;
  leadership: number;
  communication: number;
  teamwork: number;
  innovation: number;
  results: number;
}

export interface LGP360Competency {
  name: string;
  score: number;
  description: string;
  strengthAreas: string[];
  developmentAreas: string[];
}

// Analytics Types
export interface AnalyticsData {
  conversations: ConversationAnalytics;
  topics: TopicAnalytics[];
  usage: UsageAnalytics;
  timeframe: string;
}

export interface ConversationAnalytics {
  total: number;
  active: number;
  averageLength: number;
  topTopics: Array<{ topic: string; count: number }>;
}

export interface TopicAnalytics {
  topic: TopicKey;
  conversationCount: number;
  messageCount: number;
  averageRating?: number;
  lastUsed?: string;
}

export interface UsageAnalytics {
  dailyActive: Array<{ date: string; count: number }>;
  totalMessages: number;
  averageSessionDuration: number;
  peakUsageHours: Array<{ hour: number; count: number }>;
}

// Component Props Types
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
}

// Form Types
export interface FormErrors {
  [key: string]: string | undefined;
}

export interface FormState<T> {
  data: T;
  errors: FormErrors;
  isSubmitting: boolean;
  isValid: boolean;
}

// Search and Filter Types
export interface SearchFilters {
  query?: string;
  topic?: TopicKey;
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Error Types
export interface AppError extends Error {
  code?: string;
  status?: number;
  context?: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Storage Types
export interface StorageData {
  conversations: Conversation[];
  users: User[];
  files: KnowledgeBaseFile[];
}

export interface DatabaseConfig {
  url?: string;
  type: 'memory' | 'postgres';
  options?: Record<string, unknown>;
}

// OpenAI Service Types
export interface OpenAIConfig {
  apiKey: string;
  vectorStoreId?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface VectorStoreConfig {
  name: string;
  description?: string;
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Event Types
export interface AppEvent {
  type: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface UserEvent extends AppEvent {
  userId: string;
  sessionId?: string;
}

// Configuration Types
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
  };
  auth: {
    tokenExpiry: number;
    refreshTokenExpiry: number;
  };
  features: {
    knowledgeBase: boolean;
    analytics: boolean;
    lgp360Integration: boolean;
  };
  ui: {
    theme: 'light' | 'dark' | 'system';
    animations: boolean;
    compactMode: boolean;
  };
}
