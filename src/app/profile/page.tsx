import Link from "next/link";
import { redirect } from "next/navigation";
import { User, Settings as SettingsIcon, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";

/**
 * /profile — your own profile.
 *
 * Server component. Three branches:
 *   1. Not signed in    → /auth/signin?callbackUrl=/profile
 *   2. Signed in, has username → redirect to /u/[username]
 *      (the public profile page renders the same identity + real
 *      stats; an "Edit profile" CTA shows there when self === viewer)
 *   3. Signed in, no username → show a CTA to set one in /settings
 *      (the leaderboard + public profile system needs a username to
 *      hand out a permalink)
 *
 * Replaces ~580 lines of mock-data UI (BADGES, LEVELS, DAILY_PNL
 * sparklines, achievements). When real gamification ships, build
 * those features as additive sections on /u/[username] so the public
 * and self views don't drift.
 */

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin?callbackUrl=/profile");
  }

  if (user.username) {
    redirect(`/u/${user.username}`);
  }

  // Fall-through: signed in but no username yet.
  return (
    <div className="max-w-2xl mx-auto pb-12 pt-12">
      <div className="bg-[#121217] border border-white/8 rounded-3xl p-8 md:p-10 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Set up your public profile
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Pick a username so traders can find you on the leaderboard,
            link to your profile, and see your trade history in one place.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            Open settings
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
          >
            See top traders
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground pt-4 border-t border-white/5">
          Already linked? Your public page lives at{" "}
          <code className="font-mono text-white/70">/u/&lt;username&gt;</code>.
        </p>
      </div>
    </div>
  );
}
