# Audit Scope — NEXORA Web App (Phases 1–5 + 7 hardening)

*This is the document we hand to an external audit firm.*

## What we want audited

The Next.js web application + database + Prisma schema, **excluding** smart contracts (those will be audited separately in Phase 6).

### In scope (must audit)

| Area | Files | Why it matters |
|---|---|---|
| Authentication | `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/lib/auth-helpers.ts`, `src/lib/password.ts`, `src/proxy.ts`, `src/app/api/auth/**` | Account takeover; session theft; admin bypass |
| Money paths | `src/app/api/trades/**`, `src/app/api/positions/close/**`, `src/app/api/deposits/**`, `src/app/api/withdrawals/**`, `src/app/api/admin/withdrawals/**`, `src/app/api/admin/markets/[id]/resolve/**` | Theft / loss of user funds |
| AMM math | `src/lib/amm.ts`, `src/lib/amm.test.ts` | Wrong prices = systemic loss |
| On-chain verification | `src/lib/chain.ts` | A wrong verifier credits anyone who submits any tx hash |
| Database transactions | every `prisma.$transaction(...)` call site | Race conditions = double-spend |
| Rate limiting | `src/lib/rate-limit.ts`, all routes that call `rateLimit()` | DoS, brute force |
| Input validation | `src/lib/schemas.ts`, every Zod parse boundary | Injection, type confusion |
| Schemas | `prisma/schema.prisma`, `prisma/migrations/**` | Constraint enforcement, indexing |
| Security headers | `next.config.ts` | Click-jacking, MIME sniffing, mixed content |

### Out of scope (do not audit yet)

- Smart contracts — separate audit in Phase 6
- Frontend UX / accessibility
- Performance / scalability (Phase 8 concern)
- Marketing pages
- Email templates

## Code locations to start from

```
src/
├── lib/                    # All business logic + security primitives
│   ├── auth.config.ts      # Session / cookie config
│   ├── auth.ts             # Credentials + SIWE providers
│   ├── auth-helpers.ts     # requireUser, requireAdmin
│   ├── password.ts         # bcrypt wrappers, weak-password blocklist
│   ├── chain.ts            # Read-only on-chain verification
│   ├── amm.ts              # Constant-product market maker math
│   ├── api.ts              # Request handler wrapper, error envelope
│   ├── events.ts           # SSE pub/sub bus
│   ├── lifecycle.ts        # Background market closer
│   ├── prisma.ts           # DB client (lazy-init Proxy)
│   ├── rate-limit.ts       # In-process sliding window
│   ├── schemas.ts          # All Zod schemas (single source of truth)
│   └── serialize.ts        # Decimal/Date -> JSON DTO mappers
├── app/api/                # Every HTTP route lives here
│   ├── auth/[...nextauth]/ # Auth.js handlers
│   ├── auth/signup/        # Email signup
│   ├── auth/siwe/nonce/    # SIWE nonce issuer
│   ├── markets/            # List, detail, updates polling
│   ├── trades/             # POST trade (atomic)
│   ├── positions/          # GET portfolio, POST close (atomic)
│   ├── deposits/           # POST submit txHash, GET history, GET address
│   ├── withdrawals/        # POST request, GET history
│   ├── leaderboard/        # Public ranking (raw SQL)
│   ├── notifications/      # GET list, POST mark-read
│   ├── stream/             # SSE long-lived endpoint
│   ├── me/                 # Current user + balance
│   └── admin/              # Admin-only (gated by src/proxy.ts)
│       ├── markets/                    # Create market
│       ├── markets/[id]/resolve/        # Resolve + pay winners
│       ├── withdrawals/                 # Pending queue
│       └── withdrawals/[id]/{complete,reject}/
├── proxy.ts                # Edge-runtime auth gate for /api/admin
└── instrumentation.ts      # Server boot hook (starts lifecycle scheduler)
```

## How to run

```bash
cp .env.example .env.local                 # fill in real values
npx prisma migrate deploy                  # apply migrations
npm install
npm test                                   # 170+ tests, all passing
npm run typecheck
npm run lint
npm run build
npm run dev                                # http://localhost:3000
```

## What we've already done

- Internal security review (this audit prep)
- Rate limiting on all sensitive routes (signin, signup, SIWE, trade, deposit, withdrawal)
- Strict CSP + HSTS + X-Frame-Options + Permissions-Policy
- httpOnly + Secure + SameSite=Lax session cookies
- All money-path writes inside Serializable Prisma transactions
- Audit log for every admin action and money movement
- Generic 500 responses (no stack traces leaked)
- Decimal arithmetic everywhere money touches (no floats)
- `npm audit` clean of high/critical vulns

## Specific things to look at

These are the bits we feel least confident about — please prioritize:

1. **`verifyUsdcDeposit` in `src/lib/chain.ts`** — does it correctly handle all log shapes? Are there edge cases where a malicious tx can pass verification with the wrong amount?
2. **Cost-basis pro-rating on partial close** — `src/app/api/positions/close/route.ts` line ~85. Does the pro-rata math handle Decimal precision correctly under repeated partial closes?
3. **Resolution payout ordering** — `src/app/api/admin/markets/[id]/resolve/route.ts` iterates positions and credits winners in a single tx. If the position list is large (>1000), does the tx timeout? What happens then?
4. **SSE `isVisibleToUser` filter** — `src/lib/events.ts`. Can a clever client get someone else's user-scoped events?
5. **Race between balance check and decrement** — every money-path tx claims this is safe via Serializable isolation. Validate.
6. **JWT role staleness** — see `T7` in `THREAT_MODEL.md`. Is our 30-day session window acceptable, or do we need shorter / refresh-on-role-change?
7. **Rate limiter eviction** — `src/lib/rate-limit.ts` evicts oldest key when over capacity. Can an attacker use this to evict real users' rate-limit state and bypass the limit?

## Deliverables we expect

- A written report (PDF + markdown) with severity-rated findings (Critical / High / Medium / Low / Informational)
- Reproduction steps for each finding
- Suggested remediation
- A re-test of fixed findings
- Optional: a public summary we can publish

## Test environment

- Production-like staging: `https://staging.nexora.example` (will be set up before audit kickoff)
- Read-only DB snapshot for static review
- One ADMIN account, three USER accounts pre-seeded with USDC on Polygon Amoy
- All env vars set; happy paths work end-to-end

## Engagement logistics

- Audit kickoff: TBD
- Code freeze on `main` for the duration of the audit
- Daily Slack channel for clarifications
- Re-test budget: 1 week post fixes

## Recommended audit firms (for reference)

In approximate order of fit for a Next.js + Postgres + Prisma + Web3 hybrid:

1. **OpenZeppelin** — strong on smart contracts, good on adjacent web infra
2. **Trail of Bits** — broad expertise; expensive but thorough
3. **ConsenSys Diligence** — focused on Ethereum stack
4. **Doyensec** — application-security specialist; less crypto-native but excellent on web app patterns
5. **NCC Group** — large firm; methodical
