"""
Generate NEXORA implementation roadmap as a PDF.

Run:
    python scripts/generate_roadmap_pdf.py
Output:
    NEXORA-Roadmap.pdf in the project root.
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
)


# ── Brand palette ──────────────────────────────────────────────
VIOLET = HexColor("#8B5CF6")
VIOLET_DARK = HexColor("#5B21B6")
INK = HexColor("#0F0F14")
MUTED = HexColor("#6B7280")
HAIRLINE = HexColor("#E5E7EB")
TAG_BG = HexColor("#F3E8FF")


# ── Styles ─────────────────────────────────────────────────────
def build_styles():
    base = getSampleStyleSheet()

    title = ParagraphStyle(
        "title",
        parent=base["Title"],
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=30,
        textColor=INK,
        alignment=TA_LEFT,
        spaceAfter=4,
    )
    subtitle = ParagraphStyle(
        "subtitle",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=14,
        textColor=MUTED,
        spaceAfter=18,
    )
    h2 = ParagraphStyle(
        "h2",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=VIOLET_DARK,
        spaceBefore=14,
        spaceAfter=2,
    )
    h2_note = ParagraphStyle(
        "h2_note",
        parent=base["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9.5,
        leading=12,
        textColor=MUTED,
        spaceAfter=6,
    )
    body = ParagraphStyle(
        "body",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=INK,
        spaceAfter=4,
    )
    section_h = ParagraphStyle(
        "section_h",
        parent=base["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=20,
        textColor=INK,
        spaceBefore=18,
        spaceAfter=8,
    )
    callout = ParagraphStyle(
        "callout",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=INK,
        leftIndent=10,
        spaceAfter=4,
    )

    return {
        "title": title,
        "subtitle": subtitle,
        "h2": h2,
        "h2_note": h2_note,
        "body": body,
        "section_h": section_h,
        "callout": callout,
    }


# ── Data ───────────────────────────────────────────────────────
ITEMS = [
    {
        "n": 1,
        "title": "Home page",
        "fe": "designed banners for remaining hero slides (US election, Iran), "
              "Live Markets section under the hero (\"Trading now\" + \"Closing soon\" "
              "horizontal strips), skeleton/empty/error states.",
        "be": "SSE feed pushing realtime price + volume + 24h trend into the market cards.",
        "nav": "hero CTAs &rarr; correct <font face='Courier'>/?category=</font> filter, "
               "market cards &rarr; <font face='Courier'>/market/[id]</font>.",
    },
    {
        "n": 2,
        "title": "Market detail (Bet) screen",
        "note": "biggest build",
        "fe": "price chart, YES/NO order panel, size input, slippage/fees display, "
              "position summary, comments, related markets, trade confirmation + error toasts.",
        "be": "GET market detail, POST trade through existing AMM, position writes, "
              "comments endpoints.",
        "nav": "every market card &rarr; <font face='Courier'>/market/[id]</font>; "
               "after trade &rarr; portfolio updates instantly via SSE.",
    },
    {
        "n": 3,
        "title": "Trending page",
        "fe": "filterable + sortable list (volume / 24h change / recently launched), "
              "infinite scroll.",
        "be": "GET <font face='Courier'>/trending</font> with sort, filter, pagination.",
        "nav": "hero \"Trending\" card + LeftRail \"Trending\" &rarr; "
               "<font face='Courier'>/trending</font>; rows &rarr; "
               "<font face='Courier'>/market/[id]</font>.",
    },
    {
        "n": 4,
        "title": "Portfolio page",
        "fe": "open-positions table, P&amp;L summary, trade history, "
              "claim button for resolved wins.",
        "be": "GET <font face='Courier'>/portfolio</font> (positions + history + P&amp;L), "
              "POST <font face='Courier'>/claim</font>.",
        "nav": "LeftRail \"Portfolio\" &rarr; <font face='Courier'>/portfolio</font>; "
               "rows &rarr; <font face='Courier'>/market/[id]</font>.",
    },
    {
        "n": 5,
        "title": "Wallet page",
        "fe": "balance card, deposit flow (you've started), withdraw flow, "
              "transaction history.",
        "be": "GET balance + transactions, POST deposit address, POST withdraw.",
        "nav": "Navbar \"Wallet\" button + LeftRail \"Wallet\" &rarr; "
               "<font face='Courier'>/wallet</font>; subroute "
               "<font face='Courier'>/wallet/deposit</font>.",
    },
    {
        "n": 6,
        "title": "Profile page",
        "fe": "username, avatar, stats (win rate, P&amp;L, trade count, badges), "
              "public/private toggle, shareable link.",
        "be": "GET <font face='Courier'>/profile/me</font>, "
              "GET <font face='Courier'>/u/[username]</font> for public, PATCH for edits.",
        "nav": "AccountDrawer + LeftRail \"Profile\" &rarr; "
               "<font face='Courier'>/profile</font>; public via "
               "<font face='Courier'>/u/[username]</font>.",
    },
    {
        "n": 7,
        "title": "Search modal",
        "fe": "fuzzy results grouped (markets / categories / users), "
              "recent-searches in localStorage, keyboard nav.",
        "be": "GET <font face='Courier'>/search?q=</font>.",
        "nav": "Navbar icon + <font face='Courier'>/</font> + "
               "<font face='Courier'>Cmd-K</font> already trigger it; "
               "result click &rarr; relevant page.",
    },
    {
        "n": 8,
        "title": "Notifications",
        "fe": "dropdown content (you have the shell), full "
              "<font face='Courier'>/notifications</font> page, "
              "mark-read / mark-all-read.",
        "be": "GET <font face='Courier'>/notifications</font>, PATCH read state, "
              "push via existing SSE on "
              "<font face='Courier'>trade.executed</font> / "
              "<font face='Courier'>market.resolved</font> / "
              "<font face='Courier'>payout</font>.",
        "nav": "Bell &rarr; dropdown; \"View all\" &rarr; "
               "<font face='Courier'>/notifications</font>; each item &rarr; "
               "relevant market/trade.",
    },
    {
        "n": 9,
        "title": "Settings sub-pages",
        "fe": "<font face='Courier'>/settings</font> (general), "
              "<font face='Courier'>/settings/notifications</font> (channel prefs), "
              "<font face='Courier'>/settings/security</font> (password, 2FA, sessions), "
              "<font face='Courier'>/settings/currency</font>.",
        "be": "GET/PATCH user prefs.",
        "nav": "AccountDrawer + LeftRail \"Settings\" &rarr; "
               "<font face='Courier'>/settings</font>; LeftRail \"Notifications\" &rarr; "
               "<font face='Courier'>/settings/notifications</font>.",
    },
    {
        "n": 10,
        "title": "Auth screens",
        "fe": "signin + signup matched to new design (started), forgot-password flow.",
        "be": "already wired via NextAuth &mdash; no work.",
        "nav": "signed-out clicks on Wallet/Bell route to "
               "<font face='Courier'>/auth/signin</font> (done); "
               "from signin &rarr; signup link.",
    },
    {
        "n": 11,
        "title": "Leaderboard",
        "fe": "top traders by P&amp;L / volume / win-rate, "
              "weekly + all-time toggle, \"your rank\" callout.",
        "be": "GET <font face='Courier'>/leaderboard?timeframe=</font>.",
        "nav": "already in Navbar pill; rows &rarr; "
               "<font face='Courier'>/u/[username]</font>.",
    },
    {
        "n": 12,
        "title": "Smart contracts",
        "note": "deferred &mdash; needs Solidity engineer",
        "single": "USDC custody, on-chain settlement, fee router. Ship centralized first; "
                  "migrate later.",
    },
]


BUILD_ORDER = [
    "<b>Realtime SSE pipeline</b> &mdash; cuts across home, trending, portfolio, "
    "bet screen. Land this first or every screen looks dead.",
    "<b>Bet screen</b> &mdash; core loop, where users actually trade.",
    "<b>Home Live Markets section</b> &mdash; gives the hero somewhere to lead into.",
    "<b>Portfolio &rarr; Wallet</b> &mdash; closing the trade loop "
    "(place trade &rarr; see position &rarr; manage funds).",
    "<b>Trending &rarr; Profile &rarr; Leaderboard</b> &mdash; discovery + identity.",
    "<b>Search &rarr; Notifications &rarr; Settings &rarr; Auth polish</b> "
    "&mdash; final polish.",
    "<b>Smart contracts</b> &mdash; last.",
]


# ── Item card builder ─────────────────────────────────────────
def build_item_card(item, styles):
    n = item["n"]
    title_html = f"<b>{n}. {item['title']}</b>"
    if item.get("note"):
        title_html += f"  <font color='#6B7280' size='10'>&mdash; {item['note']}</font>"

    flowables = [Paragraph(title_html, styles["section_h"])]

    if item.get("single"):
        # Single-paragraph item (e.g. smart contracts)
        flowables.append(Paragraph(item["single"], styles["body"]))
    else:
        rows = [
            ("FE",  item["fe"]),
            ("BE",  item["be"]),
            ("Nav", item["nav"]),
        ]
        data = []
        for tag, text in rows:
            tag_para = Paragraph(
                f"<b><font color='#5B21B6'>{tag}</font></b>",
                ParagraphStyle("tag", fontName="Helvetica-Bold", fontSize=9.5,
                               leading=14, textColor=VIOLET_DARK),
            )
            body_para = Paragraph(text, styles["body"])
            data.append([tag_para, body_para])

        tbl = Table(data, colWidths=[18 * mm, 150 * mm])
        tbl.setStyle(TableStyle([
            ("VALIGN",       (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING",  (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING",   (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
        ]))
        flowables.append(tbl)

    # Hairline separator after each card
    sep = Table([[""]], colWidths=[168 * mm], rowHeights=[0.4])
    sep.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, HAIRLINE),
    ]))
    flowables.append(Spacer(1, 6))
    flowables.append(sep)

    return KeepTogether(flowables)


# ── Page chrome ────────────────────────────────────────────────
def draw_page_chrome(canvas, doc):
    canvas.saveState()
    # Footer hairline
    canvas.setStrokeColor(HAIRLINE)
    canvas.setLineWidth(0.4)
    canvas.line(20 * mm, 15 * mm, 190 * mm, 15 * mm)
    # Footer text
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 10 * mm, "NEXORA  ·  Implementation Roadmap")
    canvas.drawRightString(190 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


# ── Build the document ────────────────────────────────────────
def build_pdf(out_path: str):
    styles = build_styles()
    doc = SimpleDocTemplate(
        out_path,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=22 * mm,
        bottomMargin=22 * mm,
        title="NEXORA — Implementation Roadmap",
        author="NEXORA",
    )

    story = []

    # Header
    story.append(Paragraph("NEXORA &mdash; Implementation Roadmap", styles["title"]))
    story.append(Paragraph(
        "Website only &middot; FE / BE / Nav per screen &middot; "
        "12 items + suggested build order",
        styles["subtitle"],
    ))

    # Items
    for item in ITEMS:
        story.append(build_item_card(item, styles))

    # Build order section
    story.append(Spacer(1, 14))
    story.append(Paragraph("Build order", styles["section_h"]))
    story.append(Paragraph(
        "What I'd suggest, top to bottom:",
        styles["body"],
    ))
    story.append(Spacer(1, 4))
    for i, line in enumerate(BUILD_ORDER, start=1):
        story.append(Paragraph(f"{i}.&nbsp;&nbsp;{line}", styles["callout"]))

    doc.build(story, onFirstPage=draw_page_chrome, onLaterPages=draw_page_chrome)


if __name__ == "__main__":
    import os
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "NEXORA-Roadmap.pdf")
    build_pdf(out)
    print(f"Wrote {out}")
