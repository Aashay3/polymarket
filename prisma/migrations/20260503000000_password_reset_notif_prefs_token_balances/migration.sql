-- Migration: PasswordResetToken + NotificationPreference + Balance.tokens
--
-- Three additive changes:
--   1. Balance gains a nullable `tokens` JSON column for per-token
--      balance maps (USDC stays in the canonical `available` column;
--      tokens is the prep-work for true multi-token wallets).
--   2. New PasswordResetToken table backs /auth/forgot-password.
--      Tokens are stored as sha256 hashes — the raw value only ever
--      exists in the email URL.
--   3. New NotificationPreference table — one row per user, lazy-
--      created when the user first opens /settings/notifications.
--
-- Pure ALTER TABLE / CREATE TABLE; no data migration needed.

-- ── 1. Balance.tokens (nullable JSON) ───────────────────────────
ALTER TABLE "Balance" ADD COLUMN "tokens" JSONB;

-- ── 2. PasswordResetToken ───────────────────────────────────────
CREATE TABLE "PasswordResetToken" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key"
  ON "PasswordResetToken"("tokenHash");

CREATE INDEX "PasswordResetToken_userId_idx"
  ON "PasswordResetToken"("userId");

CREATE INDEX "PasswordResetToken_expiresAt_idx"
  ON "PasswordResetToken"("expiresAt");

ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 3. NotificationPreference ───────────────────────────────────
CREATE TABLE "NotificationPreference" (
    "userId"                 TEXT NOT NULL,
    "emailTradeFills"        BOOLEAN NOT NULL DEFAULT true,
    "emailMarketResolutions" BOOLEAN NOT NULL DEFAULT true,
    "emailSecurityAlerts"    BOOLEAN NOT NULL DEFAULT true,
    "pushPriceAlerts"        BOOLEAN NOT NULL DEFAULT false,
    "pushTrendingMarkets"    BOOLEAN NOT NULL DEFAULT false,
    "pushSystemUpdates"      BOOLEAN NOT NULL DEFAULT false,
    "smsSecurityAlerts"      BOOLEAN NOT NULL DEFAULT false,
    "updatedAt"              TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
