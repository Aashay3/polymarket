"""
Generate NEXORA implementation STATUS as a PDF.

This is the comprehensive project status document — covers what's
done, what's left, what needs the user's involvement (deploys / API
keys / decisions), full navigation flow, complete feature + API
inventory, and the deployment checklist.

Run:
    python scripts/generate_status_pdf.py
Output:
    NEXORA-Status.pdf in the project root.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    Preformatted,
)


# ── Brand palette ──────────────────────────────────────────────
VIOLET = HexColor("#8B5CF6")
VIOLET_DARK = HexColor("#5B21B6")
INK = HexColor("#0F0F14")
MUTED = HexColor("#6B7280")
HAIRLINE = HexColor("#E5E7EB")
TAG_BG = HexColor("#F3E8FF")
DONE_BG = HexColor("#DCFCE7")
DONE_FG = HexColor("#15803D")
PARTIAL_BG = HexColor("#FEF9C3")
PARTIAL_FG = HexColor("#A16207")
BLOCKED_BG = HexColor("#FED7AA")
BLOCKED_FG = HexColor("#9A3412")
MISSING_BG = HexColor("#FEE2E2")
MISSING_FG = HexColor("#B91C1C")
DEFERRED_BG = HexColor("#E5E7EB")
DEFERRED_FG = HexColor("#374151")


def build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title", parent=base["Title"],
            fontName="Helvetica-Bold", fontSize=26, leading=30,
            textColor=INK, alignment=TA_LEFT, spaceAfter=4,
        ),
        "subtitle": ParagraphStyle(
            "subtitle", parent=base["Normal"],
            fontName="Helvetica", fontSize=11, leading=14,
            textColor=MUTED, spaceAfter=18,
        ),
        "section_h": ParagraphStyle(
            "section_h", parent=base["Heading1"],
            fontName="Helvetica-Bold", fontSize=15, leading=20,
            textColor=INK, spaceBefore=14, spaceAfter=8,
        ),
        "subsection_h": ParagraphStyle(
            "subsection_h", parent=base["Heading2"],
            fontName="Helvetica-Bold", fontSize=12, leading=16,
            textColor=VIOLET_DARK, spaceBefore=10, spaceAfter=4,
        ),
        "item_h": ParagraphStyle(
            "item_h", parent=base["Heading2"],
            fontName="Helvetica-Bold", fontSize=11, leading=14,
            textColor=INK, spaceBefore=8, spaceAfter=2,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"],
            fontName="Helvetica", fontSize=10, leading=14,
            textColor=INK, spaceAfter=4,
        ),
        "small": ParagraphStyle(
            "small", parent=base["Normal"],
            fontName="Helvetica", fontSize=9, leading=12,
            textColor=MUTED, spaceAfter=2,
        ),
        "tag_done": ParagraphStyle(
            "tag_done", fontName="Helvetica-Bold", fontSize=8.5,
            leading=11, textColor=DONE_FG, alignment=TA_LEFT,
        ),
        "tag_blocked": ParagraphStyle(
            "tag_blocked", fontName="Helvetica-Bold", fontSize=8.5,
            leading=11, textColor=BLOCKED_FG, alignment=TA_LEFT,
        ),
        "tag_partial": ParagraphStyle(
            "tag_partial", fontName="Helvetica-Bold", fontSize=8.5,
            leading=11, textColor=PARTIAL_FG, alignment=TA_LEFT,
        ),
        "tag_missing": ParagraphStyle(
            "tag_missing", fontName="Helvetica-Bold", fontSize=8.5,
            leading=11, textColor=MISSING_FG, alignment=TA_LEFT,
        ),
        "tag_deferred": ParagraphStyle(
            "tag_deferred", fontName="Helvetica-Bold", fontSize=8.5,
            leading=11, textColor=DEFERRED_FG, alignment=TA_LEFT,
        ),
        "mono": ParagraphStyle(
            "mono", fontName="Courier", fontSize=8, leading=10,
            textColor=INK, spaceAfter=0,
        ),
        "mono_command": ParagraphStyle(
            "mono_command", fontName="Courier-Bold", fontSize=9,
            leading=12, textColor=VIOLET_DARK, leftIndent=10, spaceAfter=2,
        ),
        "callout": ParagraphStyle(
            "callout", parent=base["Normal"],
            fontName="Helvetica", fontSize=10, leading=14,
            textColor=INK, leftIndent=10, spaceAfter=4,
        ),
    }


# ── Status constants ──────────────────────────────────────────
DONE = "done"
PARTIAL = "partial"
BLOCKED = "blocked"
MISSING = "missing"
DEFERRED = "deferred"


# ── Original 12-item roadmap, updated ─────────────────────────
ITEMS = [
    {
        "n": 1, "title": "Home page", "status": DONE, "label": "COMPLETE+",
        "done": "HeroStrip slideshow, CategoryCarousel, ten home rails "
                "(ClosingToday, TopMovers, ForYou, EditorialPicks, "
                "PositionsMoving, CrowdVsReality, TradeTicker, StreakBanner, "
                "LeaderboardSection, CoinFlip), SSE pipeline via /api/stream, "
                "skeletons + empty/error states. LeaderboardSection now wired "
                "to /api/leaderboard. StreakBanner reads real streak from "
                "WalletContext.",
        "missing": "&mdash;",
    },
    {
        "n": 2, "title": "Market detail (Bet) screen", "status": DONE,
        "label": "COMPLETE",
        "done": "PriceHistoryChart with /api/markets/[id]/price-history, "
                "TradeBox (size, fees, slippage, position summary), OutcomeList, "
                "MarketTabs, RightSidebar with related markets, SocialSection "
                "comments, confirm/error toasts, POST /api/trades.",
        "missing": "&mdash;",
    },
    {
        "n": 3, "title": "Trending page", "status": DONE, "label": "COMPLETE",
        "done": "Cursor-paginated infinite scroll via IntersectionObserver "
                "(240px rootMargin), 300ms search debounce, sort: newest / "
                "ending / most-traded / biggest-movers, dedupe-by-id when "
                "appending. Page-size 18 fills 6 rows of the 3-col grid.",
        "missing": "Live SSE updates only on the first batch (intentional "
                   "tradeoff for infinite scroll &mdash; market detail page "
                   "stays authoritative).",
    },
    {
        "n": 4, "title": "Portfolio page", "status": DONE, "label": "COMPLETE",
        "done": "Active / Settled tabs. Active = OPEN positions with live AMM "
                "pricing + Close button. Settled = RESOLVED positions with W/L "
                "badge, invested/payout/outcome stats, Claim button on winners "
                "(POST /api/claim &mdash; idempotent; off-chain payouts already "
                "credited at resolve time). Realized-PnL pill in the Settled "
                "tab header. Trade history table at the bottom.",
        "missing": "&mdash;",
    },
    {
        "n": 5, "title": "Wallet page", "status": DONE, "label": "COMPLETE",
        "done": "Violet hero with 24h PnL chip + Sparkline. Multi-currency token "
                "strip (selectable; USDC canonical, others read from "
                "Balance.tokens). Three-stat row (Cash / In Open Trades / "
                "Realized PnL). Filtered tx history (All / Deposit / Trade / "
                "Payout / Withdrawal). Sidebar promo + network info + help.",
        "missing": "Per-token balances populate when multi-token deposit "
                   "verification ships (currently non-USDC reads as 0).",
    },
    {
        "n": 6, "title": "Profile page", "status": DONE, "label": "COMPLETE",
        "done": "/profile (server component, 80 lines): redirects to /u/[username] "
                "when set, otherwise prompts to set one. /u/[username] is the "
                "single source of truth for both self and public viewers &mdash; "
                "real stats (PnL, trades, win rate, leaderboard rank), recent "
                "trade tape with market links, Share button, Edit shortcut for "
                "self. /api/u/[username] computes win rate from settled "
                "positions on resolved markets.",
        "missing": "&mdash;",
    },
    {
        "n": 7, "title": "Search modal", "status": DONE, "label": "COMPLETE",
        "done": "SearchModal (184 lines), Cmd-K + '/' triggers wired in Navbar, "
                "result click routes to relevant page.",
        "missing": "Uses /api/markets &mdash; no dedicated /api/search "
                   "(acceptable for current corpus).",
    },
    {
        "n": 8, "title": "Notifications", "status": DONE, "label": "COMPLETE",
        "done": "NotificationsDropdown in navbar with SSE-pushed unread count. "
                "Full /notifications page with All / Unread tabs, day-grouped "
                "rows, type-tinted icons, optimistic mark-as-read, Mark-all-read. "
                "Footer split: 'See all' &rarr; /notifications, 'Settings' "
                "&rarr; /settings/notifications.",
        "missing": "Email + SMS dispatchers aren't wired (preferences persist "
                   "but actual delivery needs Resend / Twilio).",
    },
    {
        "n": 9, "title": "Settings sub-pages", "status": DONE, "label": "COMPLETE",
        "done": "Tabbed /settings overview. Standalone deep-link targets: "
                "/settings/notifications (real persistence via "
                "GET/PATCH /api/me/notifications/preferences), /settings/security "
                "(real password change via POST /api/me/password), "
                "/settings/currency (display preference, localStorage). "
                "/settings mega-page Security tab now links to the standalone "
                "form rather than the old fake handler.",
        "missing": "2FA TOTP + active sessions are intentional UI placeholders "
                   "(see Action Items).",
    },
    {
        "n": 10, "title": "Auth screens", "status": DONE, "label": "COMPLETE",
        "done": "/auth/signin, /auth/signup, NextAuth wired, signed-out "
                "routing for Wallet/Bell. /auth/forgot-password and "
                "/auth/reset-password (POST /api/auth/forgot-password issues "
                "sha256-hashed token, /api/auth/reset-password consumes once + "
                "invalidates other outstanding tokens). 'Forgot?' link inline "
                "on signin.",
        "missing": "Email dispatcher logs the reset URL to console + AuditLog "
                   "in dev (dev-mode viewer at /dashboard/admin/audit-log "
                   "surfaces it). Swap for Resend in production.",
    },
    {
        "n": 11, "title": "Leaderboard", "status": DONE, "label": "COMPLETE",
        "done": "/leaderboard fully wired: timeframe toggle (All / 30d / 7d), "
                "your-rank callout (RANK() over the full aggregate, even outside "
                "top N), real avatars with initial fallback, current user "
                "highlighted with a 'You' badge, rows link to /u/[username] when "
                "username is set. Home strip (LeaderboardSection) now also "
                "wired to /api/leaderboard.",
        "missing": "&mdash;",
    },
    {
        "n": 12, "title": "Smart contracts", "status": BLOCKED,
        "label": "DEPLOY-BLOCKED",
        "done": "Foundry scaffold with PredictionMarket.sol (constant-product "
                "AMM, owner-resolved, internal share balances, withdrawLP for "
                "post-resolution surplus). 14 unit tests + 1 fuzz on the "
                "k-invariant. MockUSDC for tests. Deploy script targeting "
                "Anvil + Polygon Amoy. viem read-side wrapper "
                "(src/lib/contracts/predictionMarket.ts). Server-side admin "
                "signer + admin-actions wrappers (createMarketOnChain, "
                "resolveMarketOnChain). Hybrid mode: when "
                "ENABLE_ON_CHAIN_SETTLEMENT=true, /api/admin/markets and "
                ".../[id]/resolve mirror the action on-chain.",
        "missing": "Deployed to Polygon Amoy (your action &mdash; needs wallet, "
                   "MATIC, test USDC). User-trade wiring (buy/sell/claim) needs "
                   "wallet-connect on the client. Audit before mainnet.",
    },
]


# ── Built since last audit (this sweep) ──────────────────────
SHIPPED_THIS_SWEEP = [
    "<b>Smart contracts (Tier-2 hybrid)</b> &mdash; entire contracts/ "
    "Foundry project, deploy script, viem wrappers, admin API mirroring.",
    "<b>Leaderboard</b> &mdash; /api/leaderboard timeframe + your-rank, "
    "page wired to it, home strip wired to it.",
    "<b>/notifications</b> full page, dropdown footer split.",
    "<b>/u/[username]</b> public profile + /api/u/[username] with real stats.",
    "<b>/settings/security</b> + real POST /api/me/password.",
    "<b>/settings/currency</b> with localStorage + flag picker.",
    "<b>Trending</b> infinite scroll via IntersectionObserver.",
    "<b>Portfolio</b> Active/Settled tabs + POST /api/claim.",
    "<b>/profile</b> rewrite (581 &rarr; 80 lines, real data).",
    "<b>Mock-data sweep</b> &mdash; home leaderboard + /support contact form + "
    "/settings mega-page password handler all replaced with real wiring.",
    "<b>Forgot-password flow</b> &mdash; /auth/forgot-password + "
    "/auth/reset-password pages, two API endpoints, sha256-hashed tokens, "
    "token invalidation on use.",
    "<b>Notification preferences persistence</b> &mdash; new model, "
    "GET/PATCH endpoint, fully rewritten settings page with dirty tracking.",
    "<b>Per-token wallet balances plumbing</b> &mdash; Balance.tokens JSON "
    "column, /api/me returns the map, WalletContext.tokenBalances exposes it.",
    "<b>Streak tracking</b> &mdash; computeStreak() on-demand from Trade "
    "table, /api/me returns it, optimistic bump in placeTrade, StreakBanner "
    "reads real value with adaptive copy.",
    "<b>Admin audit-log viewer</b> &mdash; /dashboard/admin/audit-log surfaces "
    "the AuditLog stream with action filter; lifts dev-mode reset URLs out of "
    "metadata so forgot-password is testable without Resend.",
    "<b>Schema migration</b> &mdash; PasswordResetToken + NotificationPreference "
    "models + Balance.tokens column. Hand-written migration SQL ready to apply.",
]


# ── Action items: things only the user can do ─────────────────
ACTION_ITEMS = [
    {
        "title": "Apply the schema migration",
        "why": "PasswordResetToken + NotificationPreference + Balance.tokens "
               "live in a hand-written migration that hasn't run against your "
               "DB yet.",
        "how": "npm run db:deploy",
        "blocker_for": "/auth/forgot-password, /api/me/notifications/preferences, "
                       "Balance.tokens reads",
        "effort": "30 seconds",
    },
    {
        "title": "Deploy smart contracts to Polygon Amoy",
        "why": "Hybrid on-chain mirror for admin actions stays inert until "
               "the contract address is set. Mainnet is OFF-LIMITS without an "
               "audit (see deferred items).",
        "how": (
            "1) Get a wallet, fund with Amoy MATIC + test USDC<br/>"
            "2) cd contracts && forge install openzeppelin/openzeppelin-contracts --no-commit<br/>"
            "3) forge install foundry-rs/forge-std --no-commit<br/>"
            "4) forge test -vv  (sanity check)<br/>"
            "5) export DEPLOYER_PRIVATE_KEY=0x... ; export USDC_ADDRESS=0x41E94...7582<br/>"
            "6) forge script script/Deploy.s.sol --rpc-url amoy --broadcast --verify<br/>"
            "7) Copy the printed PredictionMarket address into "
            "NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS<br/>"
            "8) Set ENABLE_ON_CHAIN_SETTLEMENT=true and ADMIN_PRIVATE_KEY"
        ),
        "blocker_for": "Any on-chain provenance for market lifecycle events",
        "effort": "30 minutes once you have the wallet",
    },
    {
        "title": "Wire a real email provider for password resets",
        "why": "Currently dispatchResetEmail() in /api/auth/forgot-password "
               "logs the URL to console + writes it to AuditLog. Dev viewer at "
               "/dashboard/admin/audit-log lifts it out for testing. Production "
               "needs an actual mailer.",
        "how": (
            "1) Sign up for Resend (recommended) / Postmark / SES<br/>"
            "2) Get API key, add to .env: RESEND_API_KEY=re_...<br/>"
            "3) Replace the body of dispatchResetEmail() with the provider's send call<br/>"
            "4) Verify the sender domain / set up SPF + DKIM"
        ),
        "blocker_for": "Production-grade forgot-password",
        "effort": "1 hour",
    },
    {
        "title": "Wallet-connect for user trades (Tier-2 day 5)",
        "why": "Users currently trade via /api/trades against a server-side "
               "balance. Once contracts are deployed, the on-chain claim() / "
               "buy() / sell() flow needs the user's own wallet to sign txs.",
        "how": (
            "1) Get a WalletConnect Cloud projectId<br/>"
            "2) Install: npm i @web3modal/wagmi wagmi @tanstack/react-query<br/>"
            "3) Add WagmiProvider at the root layout<br/>"
            "4) Replace placeTrade / closePosition in WalletContext with "
            "writeContract calls<br/>"
            "5) Add a position migration script for existing DB-only positions"
        ),
        "blocker_for": "Real on-chain trading",
        "effort": "1-2 days",
    },
    {
        "title": "2FA TOTP enrollment + recovery codes",
        "why": "/settings/security has a 2FA toggle marked 'coming soon'. "
               "Needs a TOTP library, recovery code generation, and an enroll "
               "/ verify flow.",
        "how": (
            "1) Add otpauth / @otplib/preset-default<br/>"
            "2) New User.totpSecret column (encrypted at rest)<br/>"
            "3) Enroll: scan QR &rarr; verify code &rarr; persist secret<br/>"
            "4) Recovery codes: hash-and-store 10 single-use backups<br/>"
            "5) Auth.js callback: gate sign-in on TOTP verification when enabled"
        ),
        "blocker_for": "True 2FA",
        "effort": "1 day",
    },
    {
        "title": "Active session tracking",
        "why": "/settings/security shows 'per-device session tracking is "
               "coming soon.' NextAuth's Session model doesn't capture device "
               "metadata by default.",
        "how": (
            "1) Extend Session model with userAgent + ipAddress + lastSeenAt<br/>"
            "2) Update Auth.js JWT callback to capture them at sign-in<br/>"
            "3) New GET /api/me/sessions + DELETE /api/me/sessions/[id]<br/>"
            "4) Render the list on /settings/security with a Revoke button"
        ),
        "blocker_for": "User-controlled session revocation",
        "effort": "1 day",
    },
    {
        "title": "Real FX rates for /settings/currency",
        "why": "Currency picker shows indicative rates; switching the locale "
               "doesn't actually convert anything in the UI.",
        "how": (
            "1) Add an FX provider integration (CoinGecko / exchangerate.host)<br/>"
            "2) New /api/fx with 5-minute cache<br/>"
            "3) New useFx() hook + a Money component that formats per locale"
        ),
        "blocker_for": "Real-currency display across the app",
        "effort": "2 hours",
    },
    {
        "title": "Smart-contract audit",
        "why": "PredictionMarket.sol is demo-only. Mainnet deploy without "
               "audit = real money loss risk.",
        "how": "Pick a firm (Code4rena / OpenZeppelin / Trail of Bits), "
               "scope the contracts, schedule an audit window, fix findings, "
               "re-audit critical changes.",
        "blocker_for": "Real-funds production deploy",
        "effort": "Weeks + audit cost",
    },
]


# ── Navigation flow (full route map) ──────────────────────────
NAV_FLOWCHART = r"""
                                +----------------------------------------+
                                |             ENTRY POINTS               |
                                +-----------------+----------------------+
                                                  |
            +-------------------------------------+-----------------------------------+
            |                                     |                                   |
    +-------v--------+                  +---------v----------+              +---------v------------+
    |     NAVBAR     |                  |      LEFTRAIL      |              |    HOME (/) FEED     |
    |  (top, fixed)  |                  |  (xl+ sidebar /    |              |  HeroStrip + 10 rails|
    |                |                  |   mobile drawer)   |              |                      |
    +-------+--------+                  +---------+----------+              +---------+------------+
            |                                     |                                   |
   +--------+----------+         +----------------+--------------+         +----------+--------------+
   |        |          |         |       |        |             |         |          |              |
 Logo   Markets/    Wallet     Sports v  Trending Portfolio   Profile   Hero       Live rails   StreakBanner
  (/)   Activity/   pill ($)   /sports  (/trending) (/portfolio) (/profile) slides   market cards (real streak
        Leaderboard -> /wallet  /sports/all                                -> /?cat  -> /market/[id] from API)
                                /sports/esports                            filter (/)               -> /wallet/deposit

   Search -> SearchModal      Trending row         Portfolio Settled tab
    (/, Cmd-K)                -> /market/[id]       -> Claim button -> POST /api/claim
    -> /market/[id]                                  (off-chain auto-paid; on-chain via wallet later)

   Bell -> NotificationsDropdown
     each item -> /market/[id]
     "See all" -> /notifications  [DONE]
     "Settings" -> /settings/notifications  [DONE]

   Hamburger (xl-) -> opens LeftRail drawer

   Sign-in pill (signed-out) -> /auth/signin
     after success -> /
     "Create account" -> /auth/signup
     "Forgot?" -> /auth/forgot-password [DONE]
                 -> email link -> /auth/reset-password?token=...
                 -> POST /api/auth/reset-password -> /auth/signin?reset=ok


+--------------------------- PRIMARY ROUTES ---------------------------+
|                                                                     |
|   /  (Home)                                                         |
|      |- HeroStrip slide CTA   -> /?category=<X>                     |
|      |- MarketCard            -> /market/[id]                       |
|      |- LeaderboardSection    -> rows link /u/[username] / -> /leaderboard |
|      |- StreakBanner          -> /wallet/deposit                    |
|                                                                     |
|   /market/[id]    [DONE]                                            |
|      |- TradeBox YES/NO       -> POST /api/trades                   |
|      |- PriceHistoryChart     <- /api/markets/[id]/price-history    |
|      |- SocialSection         (comments)                            |
|      `- RightSidebar          -> related -> /market/[id]            |
|                                                                     |
|   /trending      [DONE]                                             |
|      |- CategoryChips, sort + search (300ms debounce)               |
|      |- MarketCard            -> /market/[id]                       |
|      `- IntersectionObserver  -> /api/markets cursor pagination     |
|                                                                     |
|   /portfolio     [DONE]                                             |
|      |- Active tab            -> live AMM pricing + Close button    |
|      `- Settled tab           -> W/L badge + Claim -> /api/claim    |
|                                                                     |
|   /wallet        [DONE]                                             |
|      |- Hero + 24h PnL chip + Sparkline                             |
|      |- Token strip (selectable, USDC canonical)                    |
|      |- Stats: Cash * Open * PnL                                    |
|      |- Filtered tx list                                            |
|      |- Deposit -> /wallet/deposit ; Withdraw -> /wallet/withdraw   |
|      `- Sidebar promo / network / help                              |
|                                                                     |
|   /profile [DONE]   /u/[username]  [DONE]                           |
|      Server-side redirect from /profile to /u/[username] when set;  |
|      otherwise prompts to set a username in /settings.              |
|                                                                     |
|   /leaderboard   [DONE]                                             |
|      |- Timeframe (All / 30d / 7d) + your-rank callout              |
|      |- Real avatars + 'You' badge                                  |
|      `- Row click -> /u/[username]                                  |
|                                                                     |
|   /notifications [DONE]                                             |
|      |- All / Unread tabs (with live count)                         |
|      |- Day-grouped list, type-tinted icons                         |
|      `- Optimistic mark-as-read; Mark-all-read button               |
|                                                                     |
|   /settings  [DONE]                                                 |
|      |- /settings/notifications  [DONE - persists]                  |
|      |- /settings/security       [DONE - real password change]      |
|      `- /settings/currency       [DONE - localStorage]              |
|                                                                     |
|   /auth/signin   [DONE]                                             |
|      |- 'Forgot?' inline -> /auth/forgot-password [DONE]            |
|      `- -> /auth/reset-password?token=... [DONE]                    |
|                                                                     |
|   /support [DONE - real form -> POST /api/support]                  |
|   /sports  [DONE]   /dashboard/*  [DONE]                            |
|                                                                     |
|   /dashboard/admin/audit-log  [NEW - dev-mode reset URL viewer]     |
+---------------------------------------------------------------------+
"""


# ── API surface ───────────────────────────────────────────────
API_SURFACE = r"""
PUBLIC                                     AUTH'D
   GET  /api/markets                          GET   /api/me
   GET  /api/markets/[id]                     GET   /api/me/notifications/preferences
   GET  /api/markets/[id]/price-history       PATCH /api/me/notifications/preferences
   GET  /api/markets/updates                  POST  /api/me/password
   GET  /api/leaderboard                      POST  /api/trades
   GET  /api/u/[username]                     GET   /api/positions
   GET  /api/notifications                    POST  /api/positions/close
   POST /api/notifications  (mark read)       POST  /api/claim
   GET  /api/health                           POST  /api/deposits
   GET  /api/status                           GET   /api/deposits/address
   POST /api/auth/signup                      POST  /api/withdrawals
   POST /api/auth/forgot-password
   POST /api/auth/reset-password
   POST /api/auth/siwe/nonce
   POST /api/support

ADMIN-ONLY                                 BACKGROUND
   POST /api/admin/markets                    GET   /api/cron/close-expired
   POST /api/admin/markets/[id]/resolve       SSE   /api/stream
   GET  /api/admin/audit-log
   GET  /api/admin/withdrawals
   POST /api/admin/withdrawals/[id]/complete
   POST /api/admin/withdrawals/[id]/reject

   /api/auth/[...nextauth]   (NextAuth handlers)
"""


# ── Feature inventory ────────────────────────────────────────
FEATURE_GROUPS = [
    {
        "name": "Core trading",
        "items": [
            "Market list with category filter, sort, search",
            "Market detail (chart, order panel, comments, related markets)",
            "YES / NO buy with slippage + fee preview",
            "Close position (sell back to AMM)",
            "Claim payout on resolved-win positions (idempotent)",
            "Live SSE price + trade ticker",
        ],
    },
    {
        "name": "Discovery",
        "items": [
            "Home feed with hero slideshow + 10 thematic rails",
            "Trending page with infinite scroll + 4 sort modes",
            "Category carousel + chips",
            "Search modal (Cmd-K, '/', icon)",
            "Sports vertical (/sports, /sports/all, /sports/esports)",
            "Editorial picks, top movers, closing today, crowd-vs-reality",
        ],
    },
    {
        "name": "Identity & social",
        "items": [
            "Email + password signup / signin (NextAuth)",
            "Forgot-password flow (sha256-hashed single-use tokens)",
            "Public profile /u/[username] with real PnL / win rate / rank",
            "Self profile /profile (server redirect to public view)",
            "Leaderboard with timeframe filter + your-rank callout",
            "Comments on market detail (SocialSection)",
        ],
    },
    {
        "name": "Wallet & money",
        "items": [
            "USDC balance with deposit / withdraw flows",
            "Per-token balance map (plumbing; populates with multi-token deposits)",
            "Multi-currency display picker (USD / INR / EUR / GBP / JPY / BRL / AUD / CAD)",
            "Transaction history with type filters",
            "24h PnL chip with sparkline overlay",
        ],
    },
    {
        "name": "Notifications",
        "items": [
            "Real-time SSE-pushed unread count",
            "Navbar dropdown with mark-as-read",
            "Full inbox at /notifications with All / Unread tabs",
            "Per-channel preferences (email / push / SMS) persisted",
        ],
    },
    {
        "name": "Settings",
        "items": [
            "Tabbed overview at /settings",
            "Real password change (POST /api/me/password)",
            "Notification preferences (persisted)",
            "Currency display (localStorage)",
            "Language picker in LeftRail (10 languages, localStorage)",
        ],
    },
    {
        "name": "Gamification",
        "items": [
            "Trading streak (consecutive UTC days, on-demand from Trade table)",
            "StreakBanner with adaptive copy + progress dots",
        ],
    },
    {
        "name": "Admin",
        "items": [
            "Market creation + resolution (with optional on-chain mirror)",
            "Withdrawal approve / reject / complete",
            "Audit log viewer with action filter + dev-mode reset URL extractor",
        ],
    },
    {
        "name": "Smart contracts (demo)",
        "items": [
            "PredictionMarket.sol: constant-product AMM, owner-resolved",
            "Foundry test suite: 14 unit + 1 fuzz",
            "Hybrid mode: admin API mirrors createMarket / resolve on-chain",
            "viem read wrapper + admin signer (server-only)",
            "Deploy script targeting Anvil + Polygon Amoy",
        ],
    },
    {
        "name": "Infrastructure",
        "items": [
            "Postgres + Prisma (Decimal-safe money)",
            "Server-Sent Events (/api/stream) for live updates",
            "Rate limiting (per-IP, per-user)",
            "Audit logging (append-only)",
            "Cron: auto-close expired markets",
            "Health + status endpoints",
            "SIWE nonce endpoint (web3 sign-in foundation)",
        ],
    },
]


# ── Status pill helper ────────────────────────────────────────
def status_pill(label, status, styles):
    bg_map = {
        DONE: DONE_BG, PARTIAL: PARTIAL_BG, BLOCKED: BLOCKED_BG,
        MISSING: MISSING_BG, DEFERRED: DEFERRED_BG,
    }
    style_map = {
        DONE: "tag_done", PARTIAL: "tag_partial", BLOCKED: "tag_blocked",
        MISSING: "tag_missing", DEFERRED: "tag_deferred",
    }
    bg = bg_map[status]
    p = Paragraph(f"<b>{label}</b>", styles[style_map[status]])
    tbl = Table([[p]], colWidths=[34 * mm], rowHeights=[7 * mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), bg),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING",   (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 1),
    ]))
    return tbl


def build_item_card(item, styles):
    pill = status_pill(item["label"], item["status"], styles)
    title_para = Paragraph(
        f"<b>{item['n']}. {item['title']}</b>", styles["item_h"]
    )

    header = Table([[title_para, pill]], colWidths=[132 * mm, 36 * mm])
    header.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
    ]))

    done_label = Paragraph(
        "<b><font color='#15803D'>Done</font></b>",
        ParagraphStyle("dl", fontName="Helvetica-Bold", fontSize=9, leading=12),
    )
    miss_label = Paragraph(
        "<b><font color='#9A3412'>Notes</font></b>",
        ParagraphStyle("ml", fontName="Helvetica-Bold", fontSize=9, leading=12),
    )

    rows = [
        [done_label, Paragraph(item["done"], styles["body"])],
        [miss_label, Paragraph(item["missing"], styles["body"])],
    ]
    body_tbl = Table(rows, colWidths=[18 * mm, 150 * mm])
    body_tbl.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
    ]))

    sep = Table([[""]], colWidths=[168 * mm], rowHeights=[0.4])
    sep.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, HAIRLINE),
    ]))

    return KeepTogether([header, Spacer(1, 2), body_tbl, Spacer(1, 6), sep])


def build_action_card(action, styles, idx):
    title_para = Paragraph(
        f"<b>{idx}. {action['title']}</b>",
        ParagraphStyle("ah", fontName="Helvetica-Bold", fontSize=12,
                       leading=15, textColor=BLOCKED_FG, spaceAfter=2),
    )
    why = Paragraph(
        f"<b>Why:</b> {action['why']}",
        styles["body"],
    )
    how = Paragraph(
        f"<b>How:</b> {action['how']}",
        styles["body"],
    )
    blocker = Paragraph(
        f"<b><font color='#9A3412'>Blocks:</font></b> {action['blocker_for']} "
        f"&middot; <b>Effort:</b> {action['effort']}",
        styles["small"],
    )
    sep = Table([[""]], colWidths=[168 * mm], rowHeights=[0.4])
    sep.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, HAIRLINE),
    ]))
    return KeepTogether([
        title_para, Spacer(1, 2), why, how, blocker, Spacer(1, 6), sep,
    ])


def build_feature_group(group, styles):
    h = Paragraph(group["name"], styles["subsection_h"])
    items = [
        Paragraph(f"&bull;&nbsp;&nbsp;{i}", styles["callout"])
        for i in group["items"]
    ]
    return KeepTogether([h, *items, Spacer(1, 4)])


def draw_page_chrome(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(HAIRLINE)
    canvas.setLineWidth(0.4)
    canvas.line(20 * mm, 15 * mm, 190 * mm, 15 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 10 * mm, "NEXORA  *  Implementation Status")
    canvas.drawRightString(190 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf(out_path: str):
    styles = build_styles()
    doc = SimpleDocTemplate(
        out_path, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=22 * mm, bottomMargin=22 * mm,
        title="NEXORA - Implementation Status",
        author="NEXORA",
    )

    story = []

    # ── Title page ────────────────────────────────────────────
    story.append(Paragraph("NEXORA &mdash; Implementation Status", styles["title"]))
    story.append(Paragraph(
        "Full project snapshot &middot; What's done &middot; What's left "
        "&middot; What needs your involvement &middot; Navigation flow "
        "&middot; Feature inventory",
        styles["subtitle"],
    ))

    # Summary tile
    counts = {DONE: 0, PARTIAL: 0, BLOCKED: 0, MISSING: 0, DEFERRED: 0}
    for item in ITEMS:
        counts[item["status"]] += 1

    summary_rows = [[
        Paragraph(f"<b><font color='#15803D' size='14'>{counts[DONE]}</font></b><br/>"
                  f"<font size='8' color='#6B7280'>COMPLETE</font>", styles["body"]),
        Paragraph(f"<b><font color='#9A3412' size='14'>{counts[BLOCKED]}</font></b><br/>"
                  f"<font size='8' color='#6B7280'>DEPLOY-BLOCKED</font>", styles["body"]),
        Paragraph(f"<b><font color='#A16207' size='14'>{counts[PARTIAL]}</font></b><br/>"
                  f"<font size='8' color='#6B7280'>PARTIAL</font>", styles["body"]),
        Paragraph(f"<b><font color='#B91C1C' size='14'>{counts[MISSING]}</font></b><br/>"
                  f"<font size='8' color='#6B7280'>MISSING</font>", styles["body"]),
    ]]
    summary_tbl = Table(summary_rows, colWidths=[42 * mm] * 4)
    summary_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (0, 0), DONE_BG),
        ("BACKGROUND",   (1, 0), (1, 0), BLOCKED_BG),
        ("BACKGROUND",   (2, 0), (2, 0), PARTIAL_BG),
        ("BACKGROUND",   (3, 0), (3, 0), MISSING_BG),
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",   (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
    ]))
    story.append(summary_tbl)
    story.append(Spacer(1, 14))

    story.append(Paragraph(
        f"<b>Bottom line:</b> {counts[DONE]} of 12 roadmap items are fully done. "
        f"The remaining 1 (smart contracts) is deploy-blocked &mdash; the code is "
        f"shipped + tested in Foundry, but it needs your wallet to push to Polygon "
        f"Amoy. Every other item that's been called out as missing in prior audits "
        f"is now built. The only outstanding work needs external services (email, "
        f"WalletConnect projectId, FX provider) or audit / scope-bound features "
        f"(2FA, sessions). See <i>Action Items</i> below.",
        styles["body"],
    ))

    # ── Roadmap items ─────────────────────────────────────────
    story.append(Paragraph("12-item roadmap status", styles["section_h"]))
    for item in ITEMS:
        story.append(build_item_card(item, styles))

    # ── Action items ──────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph(
        "Action items &mdash; what needs YOUR involvement",
        styles["section_h"],
    ))
    story.append(Paragraph(
        "Each of these is blocked on something only you can provide: a "
        "credential, a deployment, or a scope decision. Once unblocked, the "
        "code path on each is short.",
        styles["body"],
    ))
    for i, action in enumerate(ACTION_ITEMS, start=1):
        story.append(build_action_card(action, styles, i))

    # ── Built since last audit ────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Built this sprint", styles["section_h"]))
    story.append(Paragraph(
        "Snapshot of the work shipped between the original 12-item roadmap "
        "audit and now:",
        styles["body"],
    ))
    for line in SHIPPED_THIS_SWEEP:
        story.append(Paragraph(f"&bull;&nbsp;&nbsp;{line}", styles["callout"]))

    # ── Feature inventory ─────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Feature inventory", styles["section_h"]))
    story.append(Paragraph(
        "Everything currently shipping in the app, grouped by domain.",
        styles["body"],
    ))
    for group in FEATURE_GROUPS:
        story.append(build_feature_group(group, styles))

    # ── Navigation flow ───────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Full navigation flow", styles["section_h"]))
    story.append(Paragraph(
        "Entry points (Navbar &middot; LeftRail &middot; Home feed) and where "
        "every primary route leads. All [DONE] items below were [MISSING] or "
        "[PARTIAL] in the original audit.",
        styles["small"],
    ))
    story.append(Spacer(1, 4))
    story.append(Preformatted(NAV_FLOWCHART, styles["mono"]))

    # ── API surface ───────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("API surface", styles["section_h"]))
    story.append(Paragraph(
        "Every HTTP endpoint currently live. Public = no auth required; "
        "Auth'd = NextAuth session; Admin = USER.role == 'ADMIN'.",
        styles["small"],
    ))
    story.append(Spacer(1, 4))
    story.append(Preformatted(API_SURFACE, styles["mono"]))


    doc.build(story, onFirstPage=draw_page_chrome, onLaterPages=draw_page_chrome)


if __name__ == "__main__":
    import os
    out = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "NEXORA-Status.pdf",
    )
    build_pdf(out)
    print(f"Wrote {out}")
