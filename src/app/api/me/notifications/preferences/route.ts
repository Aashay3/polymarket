/**
 * GET  /api/me/notifications/preferences — fetch current channel prefs.
 * PATCH /api/me/notifications/preferences — partial update.
 *
 * Lazy-creates a NotificationPreference row with sensible defaults
 * (important alerts on, marketing-style alerts off) the first time
 * the user opens /settings/notifications.
 */

import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const PreferencesSchema = z.object({
  emailTradeFills:        z.boolean().optional(),
  emailMarketResolutions: z.boolean().optional(),
  emailSecurityAlerts:    z.boolean().optional(),
  pushPriceAlerts:        z.boolean().optional(),
  pushTrendingMarkets:    z.boolean().optional(),
  pushSystemUpdates:      z.boolean().optional(),
  smsSecurityAlerts:      z.boolean().optional(),
});

export const GET = handler(async () => {
  const user = await requireUser();

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  return ok({ preferences: stripMeta(prefs) });
});

export const PATCH = handler(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, PreferencesSchema);

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...input },
    update: input,
  });

  return ok({ preferences: stripMeta(prefs) });
});

function stripMeta(p: {
  userId: string;
  emailTradeFills: boolean;
  emailMarketResolutions: boolean;
  emailSecurityAlerts: boolean;
  pushPriceAlerts: boolean;
  pushTrendingMarkets: boolean;
  pushSystemUpdates: boolean;
  smsSecurityAlerts: boolean;
  updatedAt: Date;
}) {
  // Don't ship userId / updatedAt back — UI doesn't need them and
  // they leak nothing useful.
  return {
    emailTradeFills: p.emailTradeFills,
    emailMarketResolutions: p.emailMarketResolutions,
    emailSecurityAlerts: p.emailSecurityAlerts,
    pushPriceAlerts: p.pushPriceAlerts,
    pushTrendingMarkets: p.pushTrendingMarkets,
    pushSystemUpdates: p.pushSystemUpdates,
    smsSecurityAlerts: p.smsSecurityAlerts,
  };
}
