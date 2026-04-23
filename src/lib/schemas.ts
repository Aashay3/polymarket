/**
 * Zod schemas — the single source of truth for every server-side write boundary.
 *
 * Every API route and socket handler MUST validate untrusted input against
 * these schemas. Do not `as any` your way past them.
 */

import { z } from "zod";

// ─── Primitive helpers ────────────────────────────────────────

export const OutcomeSchema = z.enum(["YES", "NO"]);
export const TradeSideSchema = z.enum(["BUY", "SELL"]);
export const MarketStatusSchema = z.enum(["OPEN", "CLOSED", "RESOLVED", "VOIDED"]);

// USDC amount: positive, max 6 decimals, reasonable upper bound.
// String-first because floats can't represent 6-decimal USDC exactly.
export const USDCAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,6})?$/, "Must be a decimal with up to 6 places")
  .refine((s) => Number(s) > 0, "Must be positive")
  .refine((s) => Number(s) <= 10_000_000, "Exceeds single-trade cap");

// Ethereum address — checksummed or lowercase; we'll normalize later.
export const EthAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");

// ─── Market ───────────────────────────────────────────────────

export const CreateMarketSchema = z.object({
  question: z.string().min(10).max(280),
  description: z.string().min(10).max(4000),
  rules: z.string().min(10).max(4000),
  category: z.string().min(2).max(40),
  imageUrl: z.string().url().optional(),
  endTime: z.coerce.date().refine((d) => d.getTime() > Date.now(), {
    message: "endTime must be in the future",
  }),
  initialLiquidity: USDCAmountSchema, // shared equally across YES/NO on mint
  feeBps: z.number().int().min(0).max(1000).default(200),
});

export const ResolveMarketSchema = z.object({
  marketId: z.string().cuid(),
  outcome: OutcomeSchema,
  resolutionNote: z.string().max(2000).optional(),
});

export const VoidMarketSchema = z.object({
  marketId: z.string().cuid(),
  reason: z.string().min(5).max(2000),
});

// ─── Trading ──────────────────────────────────────────────────

export const PlaceTradeSchema = z.object({
  marketId: z.string().cuid(),
  outcome: OutcomeSchema,
  amount: USDCAmountSchema,
  // Client-provided slippage tolerance: minimum shares they'll accept.
  minSharesOut: z.string().regex(/^\d+(\.\d{0,18})?$/).optional(),
  // Client-provided expected price — server revalidates, aborts if stale.
  expectedPrice: z.number().min(0).max(1).optional(),
});

export const ClosePositionSchema = z.object({
  marketId: z.string().cuid(),
  outcome: OutcomeSchema,
  // Optional: partial close. Default = close entire position.
  shares: z.string().regex(/^\d+(\.\d{0,18})?$/).optional(),
  minProceeds: USDCAmountSchema.optional(),
});

// ─── Social ───────────────────────────────────────────────────

export const CreateCommentSchema = z.object({
  marketId: z.string().cuid(),
  body: z.string().min(1).max(2000).trim(),
  parentId: z.string().cuid().optional(),
});

export const ToggleBookmarkSchema = z.object({
  marketId: z.string().cuid(),
});

export const ToggleFollowSchema = z.object({
  marketId: z.string().cuid(),
});

// ─── Auth ─────────────────────────────────────────────────────

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(12, "Use at least 12 characters")
    .max(128)
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a digit"),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, digits, underscore only")
    .optional(),
});

export const SIWEVerifySchema = z.object({
  message: z.string().min(10).max(4000),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

// ─── Admin / settings ─────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  image: z.string().url().optional(),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: SignupSchema.shape.password,
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "New passwords don't match",
    path: ["confirmNewPassword"],
  });

// ─── Pagination / queries ─────────────────────────────────────

export const PaginationSchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const MarketListQuerySchema = PaginationSchema.extend({
  status: MarketStatusSchema.optional(),
  category: z.string().min(1).max(40).optional(),
  search: z.string().min(1).max(100).optional(),
  sort: z.enum(["volume", "endTime", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// ─── Deposits & withdrawals ───────────────────────────────────

export const TxHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid 32-byte transaction hash");

export const SubmitDepositSchema = z.object({
  txHash: TxHashSchema,
});

export const RequestWithdrawalSchema = z.object({
  toAddress: EthAddressSchema,
  amount: USDCAmountSchema,
});

export const CompleteWithdrawalSchema = z.object({
  txHash: TxHashSchema,
});

export const RejectWithdrawalSchema = z.object({
  reason: z.string().min(3).max(500),
});
