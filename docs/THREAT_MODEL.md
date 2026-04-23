# NEXORA Threat Model

*This document is written for security auditors and the engineering team. It is not a marketing page.*

## System overview

NEXORA is a binary prediction-market platform.

- Users deposit USDC to a platform-controlled address on Polygon
- Balance is held in Postgres (off-chain) for Phase 1–5
- Users trade against an FPMM (constant-product AMM) implemented off-chain
- Admins resolve markets manually; winners get credited 1 USDC per winning share
- Users withdraw USDC via operator-processed payouts (no hot wallet key on the server)
- Phase 6 replaces the off-chain balance with on-chain escrow contracts

### Architecture

```
Browser  <--HTTPS-->  Next.js app  <-->  Postgres (Neon / self-hosted)
                         |                  ^
                         |                  |
                         +-- viem RPC -> Polygon (read-only)
                         |
                         +-- SSE push (in-process)
```

One stateful component: Postgres. Everything else (SSE bus, rate limiter, lifecycle scheduler) is in-process and ephemeral — restart-safe.

## Assets and their value

| Asset | Where it lives | Value if compromised |
|---|---|---|
| User balance (Balance.available) | Postgres row | Full value of user funds on the platform |
| Deposit tracker (Deposit.txHash unique) | Postgres row | Replay attacks can double-credit deposits |
| Session JWTs | httpOnly cookie | Account takeover for stolen cookies |
| Admin role flag (User.role) | Postgres row | Unlimited market create/resolve, approve arbitrary withdrawals |
| Password hash (User.passwordHash) | Postgres row | Offline cracking (bcrypt cost 12) |
| Deposit address | env DEPOSIT_ADDRESS | Not secret; on-chain data |
| Admin signing key | Not on server (external wallet) | Out of server's threat model |

## Trust boundaries

1. **Browser ↔ Server** — untrusted; all inputs validated with Zod before reaching any write path
2. **Server ↔ Database** — trusted; we own the connection string
3. **Server ↔ Polygon RPC** — mostly trusted; we treat RPC as read-only and only trust tx data after ≥12 confirmations
4. **Server ↔ Email/notification providers** — trusted for delivery; no secrets leak there
5. **Admin operator ↔ Server** — trusted per role flag, but rate-limited and audit-logged

## Threat catalog

### T1 — Double-credit via deposit replay

**Scenario:** Attacker submits a valid txHash twice (same hash, different accounts; or same account, race condition).

**Mitigation:**

- `Deposit.txHash` has a `UNIQUE` DB constraint. Duplicate insert throws and the second request sees the existing row.
- Credit runs inside a Serializable Prisma transaction; two parallel requests cannot both succeed.
- Verification requires `from` address to match the requesting user's linked wallet — Alice cannot credit herself from Bob's tx.

**Residual risk:** None known. Tested.

### T2 — Credit from failed / reverted transaction

**Scenario:** Attacker sends USDC, then front-runs a chain reorg to make the tx "fail" after we've credited.

**Mitigation:**

- `verifyUsdcDeposit` requires `receipt.status === "success"`.
- `MIN_CONFIRMATIONS` (default 12) ensures the tx is at reorg depth infeasible on Polygon under normal operation.

**Residual risk:** A >12-block reorg on Polygon is catastrophic for many protocols, not just us. We accept this.

### T3 — Wrong-token / wrong-chain deposit

**Scenario:** User sends DAI, or USDC on a different chain, expecting credit.

**Mitigation:**

- Verifier checks `receipt.to === USDC_CONTRACT_ADDRESS`.
- Transfer log must originate from the expected token contract.
- Chain id is pinned server-side — we don't trust client-submitted chain info.

**Residual risk:** User support load when people send wrong-chain funds. Funds are unrecoverable without manual off-chain intervention.

### T4 — Withdrawal double-spend

**Scenario:** User requests the same amount to two different addresses in parallel, exceeding their balance.

**Mitigation:**

- The available→locked move happens inside a Serializable transaction.
- Balance check (`available >= amount`) and the decrement are in the same transaction; Postgres guarantees serialization between concurrent requesters.

**Residual risk:** None known.

### T5 — Admin account takeover

**Scenario:** An admin's credentials are stolen; attacker approves a fraudulent withdrawal.

**Mitigation:**

- Rate limiting on signin (10/min/IP)
- bcrypt cost 12 (offline crack ~30k guesses/sec on a modern GPU)
- All admin actions are recorded in `AuditLog` with actorId + action + targetId
- Admin approving a withdrawal must supply a real on-chain tx hash; we check it's not already attached to another withdrawal
- Withdrawal completion does NOT send funds on-chain — admin still has to execute the payout from a separate wallet, so taking over the web admin alone doesn't move money

**Residual risk:** If the admin's own wallet is compromised in addition to the admin account, funds can be routed to an attacker-controlled address by (a) taking over the admin account, (b) creating a withdrawal to the attacker's address, (c) signing from the admin wallet. Mitigation at launch: 2-of-3 multisig for the operations wallet, and out-of-band verification for withdrawals over $10k.

### T6 — Session token theft (XSS, malicious browser extension)

**Scenario:** Attacker steals a user's session cookie and impersonates them.

**Mitigation:**

- Session cookies are `HttpOnly` + `Secure` (in prod) + `SameSite=Lax` — browser won't expose them to JS, won't send cross-site
- CSP blocks unexpected script origins (see `next.config.ts`)
- `X-Frame-Options: DENY` prevents click-jacking

**Residual risk:** A malicious browser extension with permission to read cookies can still steal the session. User-level mitigation; out of scope for us.

### T7 — Stale role propagation in JWT

**Scenario:** User's role is changed to ADMIN (or demoted from ADMIN). The change doesn't take effect until their JWT expires (up to 30 days).

**Mitigation:** Admin role changes are rare and logged. For demotion cases, we can invalidate sessions manually by rotating `AUTH_SECRET` (kicks everyone out). A proper session-version field in User is a Phase 8 item.

**Residual risk:** Documented. Accept at MVP launch.

### T8 — Brute-force signin / enumeration

**Scenario:** Attacker iterates through email/password combos.

**Mitigation:**

- Rate limit: 10 attempts / minute / IP (configurable in `src/lib/rate-limit.ts`)
- bcrypt cost 12 means each attempt costs ~100ms server time even without the rate limit
- Signin response is identical for "no such user" and "wrong password" — no user enumeration

**Residual risk:** A well-distributed botnet can still test passwords slowly. Mitigations at scale: CAPTCHAs, IP reputation, account lockout after repeated failures (not implemented).

### T9 — SIWE nonce flood

**Scenario:** Attacker spams the nonce endpoint, bloating the VerificationToken table.

**Mitigation:**

- Rate limit: 30 nonces / minute / IP
- Each new nonce deletes prior unclaimed nonces for the same address
- Nonces expire after 10 minutes

**Residual risk:** Minimal.

### T10 — Trade slippage / stale price sandwich

**Scenario:** User places a trade; an attacker front-runs to manipulate the AMM price, extracts value on the back-run.

**Mitigation:**

- Client passes `minSharesOut` and `expectedPrice`; server aborts if price has drifted more than 100 bps
- All writes are Serializable — no TOCTOU between price quote and balance debit

**Residual risk:** An attacker can still burn the target's slippage budget if they're willing to spend capital. Standard AMM MEV; unavoidable without a CLOB.

### T11 — Price oracle manipulation for resolution

**Scenario:** Admin resolves a market to the wrong outcome, pays fraudulent "winners."

**Mitigation at MVP:** Admin role is restricted; AuditLog records every resolution; users can appeal. Manual recourse only.

**Mitigation post-audit:** Phase 6 introduces UMA Optimistic Oracle resolution, removing manual admin discretion.

### T12 — Funds stuck in-flight during a withdrawal

**Scenario:** User requests a withdrawal, admin processes it, but the txHash fails to confirm on-chain.

**Mitigation:**

- Admin completes *after* the on-chain tx is confirmed, not before
- If the tx later reorgs, admin can revert the withdrawal record manually via SQL + re-credit the user
- Balance remains in `locked` until admin completes or rejects, so nothing is double-accounted

**Residual risk:** Operator error can cause loss if they mark COMPLETED against a tx hash that later reverts. Phase 6 smart contract escrow removes this risk entirely.

### T13 — Rate limit bypass via rotating IPs

**Scenario:** Attacker rotates IPs to bypass our per-IP rate limits.

**Mitigation:**

- Authenticated endpoints are rate-limited per user id, not just IP
- Cost per attempt is non-trivial (bcrypt on signin, RPC call on deposit, DB tx on trade)

**Residual risk:** A motivated attacker with a proxy pool can exceed our per-IP caps. Phase 8 hardening: fingerprint-based rate limiting, WAF rules.

### T14 — Dependency supply chain

**Scenario:** A malicious version of a dependency is published, exfiltrates secrets or forges signatures.

**Mitigation:**

- `package-lock.json` pins exact versions
- `npm audit` runs in CI
- Dependencies are major OSS projects (viem, Prisma, Next.js, Auth.js) with active maintenance

**Residual risk:** Zero-day supply chain attacks exist. Mitigation: watch Socket.dev / Snyk alerts, dependabot.

## Known limitations and accepted risks

- **In-process rate limiter** is per-process. Behind N instances behind a load balancer, effective rate = N × limit. Acceptable for MVP; upgrade to Redis-backed (Upstash / Cluster) for Phase 8.
- **In-process SSE bus** only delivers to clients connected to the same Node process. Multi-instance deployments need Redis pub/sub — trivially swappable via the public API in `src/lib/events.ts`.
- **No 2FA yet.** Planned post-audit. TOTP + WebAuthn for admins.
- **No account lockout** after repeated failed logins. Rate limiting is the first line; lockout would provide defense in depth. Phase 8.
- **Manual withdrawal processing.** Human in the loop is a feature for MVP — it prevents automated draining if something else breaks. Phase 6 replaces this with on-chain escrow.
- **Role changes** take effect on JWT refresh. See T7.
- **`unsafe-inline` in CSP** for script and style — framer-motion + Tailwind need it. Nonce-based CSP is a Phase 8 item.

## Invariants the auditor should verify

- **I1:** For every confirmed Deposit row, `balance.totalDeposited >= Σ(confirmed Deposit.amount)` — we never under-credit.
- **I2:** `balance.available + balance.locked >= 0` at all times. Never negative.
- **I3:** For every SELL Trade, there was a prior BUY (or a resolution payout) with cumulative shares ≥ the SELL. AMM math in `src/lib/amm.ts` guarantees this algorithmically; enforced by position-row checks before every close.
- **I4:** `yesShares * noShares` (the AMM invariant `k`) is monotonically non-decreasing over time. Fees grow k.
- **I5:** Only users with `role = ADMIN` can call `/api/admin/*`. Enforced by `src/proxy.ts`.
- **I6:** No route returns a stack trace or internal ID in its error body. Generic 500 envelope only. Enforced by `handler()` in `src/lib/api.ts`.
