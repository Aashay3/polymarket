"""
Generate NEXORA implementation STATUS audit as a PDF.

Includes:
  - Per-item status against the original roadmap (12 items)
  - Extras shipped that weren't in the original spec
  - Remaining / incomplete punch-list
  - Full navigation flowchart (monospace block)
  - Recommended build order to close out the gaps

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
        "item_h": ParagraphStyle(
            "item_h", parent=base["Heading2"],
            fontName="Helvetica-Bold", fontSize=12, leading=16,
            textColor=INK, spaceBefore=10, spaceAfter=2,
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
        "callout": ParagraphStyle(
            "callout", parent=base["Normal"],
            fontName="Helvetica", fontSize=10, leading=14,
            textColor=INK, leftIndent=10, spaceAfter=4,
        ),
    }


# ── Status data ────────────────────────────────────────────────
# Each item: (n, title, status, status_label, done, missing)
STATUS = "status"
DONE = "done"
PARTIAL = "partial"
MISSING = "missing"
DEFERRED = "deferred"

ITEMS = [
    {
        "n": 1,
        "title": "Home page",
        "status": DONE,
        "label": "COMPLETE+",
        "done": "HeroStrip, CategoryCarousel, multiple live rails (ClosingToday, "
                "TopMovers, ForYou, EditorialPicks, PositionsMoving, "
                "CrowdVsReality, TradeTicker, StreakBanner), SSE pipe via "
                "/api/stream, MarketCardSkeleton, empty/error states.",
        "missing": "Far exceeds the original spec; nothing critical missing.",
    },
    {
        "n": 2,
        "title": "Market detail (Bet) screen",
        "status": DONE,
        "label": "COMPLETE",
        "done": "PriceHistoryChart + /api/markets/[id]/price-history, TradeBox "
                "(size, fees, slippage, position summary), OutcomeList, "
                "MarketTabs, RightSidebar, SocialSection (comments), "
                "confirm/error toasts via ToastContext, POST /api/trades.",
        "missing": "—",
    },
    {
        "n": 3,
        "title": "Trending page",
        "status": PARTIAL,
        "label": "PARTIAL",
        "done": "Filter + sort (volume / movers / ending / newest) + search "
                "wired to live SSE markets via WalletContext.",
        "missing": "Infinite scroll. Dedicated /api/trending endpoint with "
                   "cursor pagination (currently re-uses /api/markets).",
    },
    {
        "n": 4,
        "title": "Portfolio page",
        "status": PARTIAL,
        "label": "PARTIAL",
        "done": "Open-positions grouping by market+outcome, P&amp;L sparkline, "
                "history list, close-position via /api/positions/close.",
        "missing": "Claim button on resolved-win rows. POST /api/claim endpoint.",
    },
    {
        "n": 5,
        "title": "Wallet page",
        "status": DONE,
        "label": "COMPLETE",
        "done": "Hero balance + 24h PnL chip, multi-currency token strip "
                "(selectable), 3-stat row (Cash / In Open Trades / Realized "
                "PnL), filtered tx history (All / Deposit / Trade / Payout / "
                "Withdrawal), deposit + withdraw subroutes, sidebar promo / "
                "network / help cards. Just redesigned.",
        "missing": "Per-token balances are mocked (USDC=real, others=0) "
                   "until /api/me returns a per-token map.",
    },
    {
        "n": 6,
        "title": "Profile page",
        "status": PARTIAL,
        "label": "PARTIAL",
        "done": "/profile (581 lines &mdash; stats, badges, etc.), /api/me.",
        "missing": "Public route /u/[username]/page.tsx. Public-vs-private "
                   "toggle + endpoint.",
    },
    {
        "n": 7,
        "title": "Search modal",
        "status": DONE,
        "label": "COMPLETE",
        "done": "SearchModal (184 lines), Cmd-K + '/' triggers wired in Navbar, "
                "result click routes to relevant page.",
        "missing": "Uses /api/markets &mdash; no dedicated /api/search "
                   "(acceptable for current corpus size).",
    },
    {
        "n": 8,
        "title": "Notifications",
        "status": PARTIAL,
        "label": "PARTIAL",
        "done": "NotificationsDropdown in navbar, /api/notifications, "
                "SSE-pushed unread count, /settings/notifications for prefs, "
                "NotificationsPrompt component.",
        "missing": "Full /notifications page. PATCH read-state endpoint "
                   "(/api/notifications/[id]/read).",
    },
    {
        "n": 9,
        "title": "Settings sub-pages",
        "status": PARTIAL,
        "label": "PARTIAL",
        "done": "/settings (general), /settings/notifications.",
        "missing": "/settings/security (password, 2FA, sessions). "
                   "/settings/currency.",
    },
    {
        "n": 10,
        "title": "Auth screens",
        "status": PARTIAL,
        "label": "PARTIAL",
        "done": "/auth/signin, /auth/signup, NextAuth wired, signed-out "
                "routing for Wallet/Bell.",
        "missing": "/auth/forgot-password (request) + /auth/reset-password "
                   "(token consume).",
    },
    {
        "n": 11,
        "title": "Leaderboard",
        "status": PARTIAL,
        "label": "PARTIAL",
        "done": "/leaderboard page exists. /api/leaderboard endpoint exists.",
        "missing": "Page renders 5 hardcoded mock rows &mdash; no fetch wired. "
                   "No timeframe toggle. No 'your rank' callout.",
    },
    {
        "n": 12,
        "title": "Smart contracts",
        "status": DEFERRED,
        "label": "DEFERRED",
        "done": "&mdash;",
        "missing": "Deferred by design. USDC custody, on-chain settlement, "
                   "fee router. Ship centralised first; migrate later.",
    },
]


EXTRAS = [
    "<b>LeftRail</b> &mdash; full collapsible / mobile-drawer sidebar; "
    "replaced the old AccountDrawer + NavigationDrawer.",
    "<b>Sports vertical</b> &mdash; /sports, /sports/all, /sports/esports.",
    "<b>CurrencyPicker</b> in navbar &mdash; multi-token switching, "
    "glow-ring active state, Check badge, scrollbar-hide.",
    "<b>Dashboard subroutes</b> &mdash; /dashboard/activity, "
    "/dashboard/admin, /dashboard/markets.",
    "<b>Admin tools</b> &mdash; market resolution, withdrawal "
    "approve / reject / complete (/api/admin/markets/[id]/resolve, "
    "/api/admin/withdrawals/*).",
    "<b>Audit log API</b> &mdash; /api/admin/audit-log.",
    "<b>Cron job</b> &mdash; /api/cron/close-expired auto-closes "
    "expired markets.",
    "<b>Health + status endpoints</b> &mdash; /api/health, /api/status.",
    "<b>SIWE nonce endpoint</b> &mdash; /api/auth/siwe/nonce "
    "(web3 sign-in foundation).",
    "<b>Coin Flip game</b> &mdash; CoinFlip.tsx home module.",
    "<b>CryptoIcon</b> + 7-token spec system with PNG fallbacks.",
    "<b>Navbar polish</b> &mdash; icon-pill nav, narrower search, hamburger "
    "on the right, profile-icon removed, Wallet+Bell always visible.",
    "<b>Wallet hero redesign</b> &mdash; violet&rarr;fuchsia gradient, "
    "sparkline overlay, sidebar promo column.",
]


PUNCH_LIST = [
    ("Trending",      "Infinite scroll + dedicated /api/trending with cursor pagination"),
    ("Portfolio",     "Claim button on resolved-win rows + POST /api/claim"),
    ("Profile",       "Public route /u/[username]/page.tsx + public-toggle prefs"),
    ("Notifications", "/notifications full page + PATCH /api/notifications/[id]/read"),
    ("Settings",      "/settings/security (password, 2FA, sessions). /settings/currency."),
    ("Auth",          "/auth/forgot-password (request) + /auth/reset-password (token)"),
    ("Leaderboard",   "Wire /api/leaderboard, timeframe toggle, your-rank callout (kill mock data)"),
    ("Wallet",        "Real per-token balances on /api/me (replace tokenBalance() mock)"),
    ("Smart contracts","Deferred (item 12; needs Solidity engineer)"),
]


BUILD_ORDER = [
    "<b>Wire /leaderboard to /api/leaderboard</b> + add timeframe toggle. "
    "Lowest risk; removes the only fully-mocked page in the app.",
    "<b>/notifications full page</b> + PATCH read-state. UI exists in "
    "NotificationsDropdown; just needs a list page.",
    "<b>/u/[username] public profile</b> + /api/u/[username]. Unblocks "
    "leaderboard row clicks.",
    "<b>/auth/forgot-password</b> + reset flow. NextAuth supports email "
    "providers out of the box.",
    "<b>/settings/security</b> + /settings/currency. Add stub pages first; "
    "wire endpoints after.",
    "<b>Trending infinite scroll</b> + cursor endpoint.",
    "<b>Portfolio Claim</b> button + /api/claim.",
    "<b>Per-token wallet balances</b> on /api/me. Replace the tokenBalance() "
    "mock in src/app/wallet/page.tsx.",
    "<b>Smart contracts</b> &mdash; deferred indefinitely.",
]


# ── Flowchart (monospace) ─────────────────────────────────────
FLOWCHART = r"""
                                +----------------------------------------+
                                |             ENTRY POINTS               |
                                +-----------------+----------------------+
                                                  |
            +-------------------------------------+-------------------------------------+
            |                                     |                                     |
    +-------v--------+                  +---------v----------+              +-----------v----------+
    |     NAVBAR     |                  |      LEFTRAIL      |              |    HOME (/) FEED     |
    |  (top, fixed)  |                  |  (xl+ sidebar /    |              |   (HeroStrip rails)  |
    |                |                  |   mobile drawer)   |              |                      |
    +-------+--------+                  +---------+----------+              +-----------+----------+
            |                                     |                                     |
   +--------+----------+         +----------------+-------------+         +-------------+-------------+
   |        |          |         |                |             |         |             |             |
 Logo   Markets/    Wallet     Sports v        Trending      Portfolio  Hero        Live rails    Streak/Promo
  (/)   Activity/   pill ($)   /sports          (/trending)  (/portfolio) slides     market cards   banners
        Leaderboard  -> /wallet /sports/all                              -> /?cat    -> /market/[id] -> /wallet/deposit
                                /sports/esports                          filter (/)

   Search -> SearchModal      Trending row         Portfolio row
    (/, Cmd-K)                -> /market/[id]       -> /market/[id]
    -> /market/[id]                                  (Claim btn MISSING on resolved wins)

   Bell -> NotificationsDropdown
     each item -> /market/[id]
     "View all" -> /notifications  [MISSING - full page not built]

   Hamburger (xl-) -> opens LeftRail drawer

   Sign-in pill (signed-out) -> /auth/signin
     after success -> /
     "Create account" -> /auth/signup
     "Forgot password?" -> [MISSING]


+--------------------------- PRIMARY PAGES ---------------------------+
|                                                                     |
|   /  (Home)                                                         |
|      ├── HeroStrip slide CTA   -> /?category=<X>                    |
|      ├── MarketCard            -> /market/[id]                      |
|      ├── StreakBanner          -> /wallet/deposit                   |
|      └── LeaderboardSection    -> /leaderboard                      |
|                                                                     |
|   /market/[id]    [COMPLETE]                                        |
|      ├── TradeBox YES/NO       -> POST /api/trades                  |
|      │     (toast confirm; SSE updates portfolio)                   |
|      ├── PriceHistoryChart     <- /api/markets/[id]/price-history   |
|      ├── SocialSection         (comments)                           |
|      └── RightSidebar          -> related -> /market/[id]           |
|                                                                     |
|   /trending      [PARTIAL]                                          |
|      ├── CategoryChips         (filter in place)                    |
|      ├── Sort + search         (in place)                           |
|      ├── MarketCard            -> /market/[id]                      |
|      └── Infinite scroll       [MISSING - currently shows all]      |
|                                                                     |
|   /portfolio     [PARTIAL]                                          |
|      ├── Holdings table        -> /market/[id]                      |
|      ├── Close position        -> POST /api/positions/close         |
|      └── Claim resolved win    [MISSING - no /api/claim]            |
|                                                                     |
|   /wallet        [COMPLETE - just redesigned]                       |
|      ├── Hero balance + 24h PnL                                     |
|      ├── Token strip (multi-currency, switchable)                   |
|      ├── Stats: Cash * Open * PnL                                   |
|      ├── Filtered tx list                                           |
|      ├── Deposit CTA           -> /wallet/deposit                   |
|      ├── Withdraw CTA          -> /wallet/withdraw                  |
|      ├── Sidebar bonus tile    -> /wallet/deposit                   |
|      └── Sidebar help tile     -> /support                          |
|                                                                     |
|   /profile       [PARTIAL]                                          |
|      ├── Own stats / badges    (uses /api/me)                       |
|      └── /u/[username]         [MISSING - public profile route]     |
|                                                                     |
|   /leaderboard   [PARTIAL]                                          |
|      ├── Top traders table     [5 MOCK ROWS - not wired]            |
|      └── row click             -> /u/[username] (route missing)     |
|                                                                     |
|   /settings      [PARTIAL]                                          |
|      ├── /settings/notifications  [DONE]                            |
|      ├── /settings/security       [MISSING]                         |
|      └── /settings/currency       [MISSING]                         |
|                                                                     |
|   /auth/signin   [DONE]                                             |
|      ├── -> /auth/signup                                            |
|      └── -> /auth/forgot-password [MISSING]                         |
|                                                                     |
|   /support  [DONE]   /sports  [DONE]   /dashboard/*  [DONE]         |
|                                                                     |
|   /notifications  [MISSING - full page not built]                   |
+---------------------------------------------------------------------+


            API SURFACE  [LIVE]                              [GAPS]
   /api/markets             /api/trades             /api/claim
   /api/markets/[id]        /api/positions          /api/trending
   /api/markets/[id]/       /api/positions/close    /api/notifications/[id]/read
       price-history        /api/notifications      /api/u/[username]
   /api/markets/updates     /api/leaderboard        /api/auth/forgot-password
   /api/me                  /api/health
   /api/deposits            /api/status
   /api/deposits/address    /api/admin/markets/[id]/resolve
   /api/withdrawals         /api/admin/withdrawals/*
   /api/auth/[...nextauth]  /api/cron/close-expired
   /api/auth/signup         /api/admin/audit-log
   /api/auth/siwe/nonce     /api/stream  (SSE)
"""


# ── Status pill ───────────────────────────────────────────────
def status_pill(label, status, styles):
    bg = {DONE: DONE_BG, PARTIAL: PARTIAL_BG, MISSING: MISSING_BG, DEFERRED: DEFERRED_BG}[status]
    style_key = {DONE: "tag_done", PARTIAL: "tag_partial",
                 MISSING: "tag_missing", DEFERRED: "tag_deferred"}[status]
    p = Paragraph(f"<b>{label}</b>", styles[style_key])
    tbl = Table([[p]], colWidths=[26 * mm], rowHeights=[7 * mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), bg),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING",   (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 1),
        ("ROUNDEDCORNERS", [3, 3, 3, 3]),
    ]))
    return tbl


def build_item_card(item, styles):
    pill = status_pill(item["label"], item["status"], styles)
    title_para = Paragraph(
        f"<b>{item['n']}. {item['title']}</b>", styles["item_h"]
    )

    # Header row: title + pill on the right
    header = Table(
        [[title_para, pill]],
        colWidths=[140 * mm, 28 * mm],
    )
    header.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
    ]))

    # Done / Missing rows
    done_label = Paragraph(
        "<b><font color='#15803D'>Done</font></b>",
        ParagraphStyle("dl", fontName="Helvetica-Bold", fontSize=9, leading=12),
    )
    miss_label = Paragraph(
        "<b><font color='#B91C1C'>Missing</font></b>",
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

    # Hairline separator
    sep = Table([[""]], colWidths=[168 * mm], rowHeights=[0.4])
    sep.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, HAIRLINE),
    ]))

    return KeepTogether([header, Spacer(1, 2), body_tbl, Spacer(1, 6), sep])


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
        out_path,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=22 * mm,
        bottomMargin=22 * mm,
        title="NEXORA - Implementation Status",
        author="NEXORA",
    )

    story = []

    # ── Header ────────────────────────────────────────────────
    story.append(Paragraph("NEXORA &mdash; Implementation Status", styles["title"]))
    story.append(Paragraph(
        "Audit of the original 12-item roadmap &middot; "
        "Extras shipped &middot; Punch-list &middot; Navigation flowchart",
        styles["subtitle"],
    ))

    # ── Summary stats ─────────────────────────────────────────
    counts = {DONE: 0, PARTIAL: 0, MISSING: 0, DEFERRED: 0}
    for item in ITEMS:
        counts[item["status"]] += 1

    summary_rows = [[
        Paragraph(f"<b><font color='#15803D' size='14'>{counts[DONE]}</font></b><br/>"
                  f"<font size='8' color='#6B7280'>COMPLETE</font>",
                  styles["body"]),
        Paragraph(f"<b><font color='#A16207' size='14'>{counts[PARTIAL]}</font></b><br/>"
                  f"<font size='8' color='#6B7280'>PARTIAL</font>",
                  styles["body"]),
        Paragraph(f"<b><font color='#B91C1C' size='14'>{counts[MISSING]}</font></b><br/>"
                  f"<font size='8' color='#6B7280'>MISSING</font>",
                  styles["body"]),
        Paragraph(f"<b><font color='#374151' size='14'>{counts[DEFERRED]}</font></b><br/>"
                  f"<font size='8' color='#6B7280'>DEFERRED</font>",
                  styles["body"]),
    ]]
    summary_tbl = Table(summary_rows, colWidths=[42 * mm] * 4)
    summary_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (0, 0), DONE_BG),
        ("BACKGROUND",   (1, 0), (1, 0), PARTIAL_BG),
        ("BACKGROUND",   (2, 0), (2, 0), MISSING_BG),
        ("BACKGROUND",   (3, 0), (3, 0), DEFERRED_BG),
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",   (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
        ("LEFTPADDING",  (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(summary_tbl)
    story.append(Spacer(1, 14))

    # ── Items section ─────────────────────────────────────────
    story.append(Paragraph("Per-item status", styles["section_h"]))
    for item in ITEMS:
        story.append(build_item_card(item, styles))

    # ── Extras section ────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Extras shipped (not on the original roadmap)",
                           styles["section_h"]))
    for line in EXTRAS:
        story.append(Paragraph(f"&bull;&nbsp;&nbsp;{line}", styles["callout"]))

    # ── Punch list ────────────────────────────────────────────
    story.append(Spacer(1, 14))
    story.append(Paragraph("Remaining / incomplete (punch-list)",
                           styles["section_h"]))
    punch_rows = []
    for area, item in PUNCH_LIST:
        punch_rows.append([
            Paragraph(f"<b>{area}</b>",
                      ParagraphStyle("pa", fontName="Helvetica-Bold",
                                     fontSize=10, leading=14, textColor=VIOLET_DARK)),
            Paragraph(item, styles["body"]),
        ])
    punch_tbl = Table(punch_rows, colWidths=[34 * mm, 134 * mm])
    punch_tbl.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
        ("LINEBELOW",    (0, 0), (-1, -1), 0.3, HAIRLINE),
        ("BACKGROUND",   (0, 0), (0, -1), TAG_BG),
    ]))
    story.append(punch_tbl)

    # ── Build order ───────────────────────────────────────────
    story.append(Spacer(1, 14))
    story.append(Paragraph("Recommended build order to close out gaps",
                           styles["section_h"]))
    story.append(Paragraph("Cheapest wins first &mdash; top to bottom:",
                           styles["body"]))
    story.append(Spacer(1, 4))
    for i, line in enumerate(BUILD_ORDER, start=1):
        story.append(Paragraph(f"{i}.&nbsp;&nbsp;{line}", styles["callout"]))

    # ── Flowchart ─────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Full navigation flowchart", styles["section_h"]))
    story.append(Paragraph(
        "Entry points (Navbar &middot; LeftRail &middot; Home feed) and where "
        "every primary route leads. <font color='#B91C1C'>Red</font> labels mark "
        "missing pieces.",
        styles["small"],
    ))
    story.append(Spacer(1, 4))
    story.append(Preformatted(FLOWCHART, styles["mono"]))

    doc.build(story, onFirstPage=draw_page_chrome, onLaterPages=draw_page_chrome)


if __name__ == "__main__":
    import os
    out = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "NEXORA-Status.pdf",
    )
    build_pdf(out)
    print(f"Wrote {out}")
