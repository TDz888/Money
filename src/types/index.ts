export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: string; code?: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type UserSummary = {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  role: string;
};

export type AdminUserDTO = UserSummary & {
  banned: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string | null;
  conversationCount: number;
  messageCount: number;
};

export type ModelInfo = {
  id: string;
  label: string;
  provider: "openai" | "anthropic" | "google" | "groq";
  costPerMsg: number;
};

export type MessageDTO = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  tokensUsed: number;
  creditsCharged: number;
  createdAt: string;
};

export type ConversationDTO = {
  id: string;
  title: string;
  model: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  userEmail?: string;
  messageCount?: number;
  messages?: MessageDTO[];
};

export type YeumoneyLogDTO = {
  id: string;
  userId: string;
  userEmail: string;
  yeumoneyTxId: string;
  shortUrl: string | null;
  credits: number;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
  completedAt: string | null;
};

export type CreditLedgerDTO = {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  reason: string;
  refId: string | null;
  createdAt: string;
};

export type YeumoneyStatus = {
  eligible: boolean;
  shortUrl: string | null;
  pendingTxId: string | null;
  lastStatus: "PENDING" | "COMPLETED" | "FAILED" | null;
  reward: number;
};

export type AdminStats = {
  users: {
    total: number;
    admins: number;
    banned: number;
    verified: number;
    newLast7d: number;
    newLast24h: number;
  };
  conversations: { total: number; newLast24h: number };
  messages: { total: number; newLast24h: number };
  credits: {
    totalIssued: number;
    totalSpent: number;
    outstanding: number;
  };
  yeumoney: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    completionRate: number;
  };
  system: {
    cacheMode: "memory" | "redis";
    uptime: number;
    nodeVersion: string;
  };
};
