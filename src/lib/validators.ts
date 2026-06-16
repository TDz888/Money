/**
 * Centralized Zod schemas for all API endpoints.
 * Reject any unknown keys to prevent mass-assignment. Strict typing.
 */

import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email")
  .max(254, "Email too long");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 chars")
  .max(128, "Password too long")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name required")
  .max(60, "Name too long")
  .regex(/^[\p{L}\p{N}\s._-]+$/u, "Invalid name characters");

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    name: nameSchema.optional()
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128)
  })
  .strict();

export const chatMessageSchema = z
  .object({
    conversationId: z.string().min(1).max(64).optional(),
    model: z.string().min(1).max(120).optional(),
    content: z
      .string()
      .min(1, "Message cannot be empty")
      .max(8000, "Message too long (max 8000 chars)")
  })
  .strict();

export const yeumoneyCreateSchema = z
  .object({
    returnUrl: z.string().url().max(2048).optional()
  })
  .strict();

export const yeumoneyWebhookSchema = z
  .object({
    transaction_id: z.string().min(1).max(128),
    status: z.enum(["completed", "success", "failed", "cancelled"]),
    user_id: z.string().min(1).max(128).optional(),
    credits: z.number().int().min(0).max(100000).optional(),
    amount: z.number().int().min(0).max(1000000).optional()
  })
  .passthrough();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type YeumoneyCreateInput = z.infer<typeof yeumoneyCreateSchema>;
export type YeumoneyWebhookInput = z.infer<typeof yeumoneyWebhookSchema>;
