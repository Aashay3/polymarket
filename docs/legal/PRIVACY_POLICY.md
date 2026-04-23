# Privacy Policy — SKELETON

> **⚠️ THIS DOCUMENT IS NOT LEGALLY VALID. Lawyer review required.**
> Read `docs/legal/README.md` first. Must be customized for GDPR (EU), CCPA (California), and any other regime that applies to your users.

Last updated: [FILL IN DATE]

## 1. What we collect

**You give us:**

- Email address and password hash (signup only)
- Ethereum wallet address(es) (SIWE signin)
- Display name, username, profile image (optional)
- Deposit and withdrawal transaction hashes and addresses
- Trades, positions, and comments
- Any information you voluntarily provide via support requests

**Automatically collected:**

- IP address, browser user-agent, approximate geolocation (from IP)
- Request logs with timestamps
- Device fingerprint (hashed, used for fraud detection)
- Session cookies

**On the blockchain (public):**

- Your wallet address and all its transactions are public by design. We do not control this and cannot erase on-chain data.

**We DO NOT collect:**

- Your private keys or seed phrases. Ever.
- Full payment-card numbers (we only accept USDC)
- Your real name / government ID unless KYC is triggered for a large withdrawal

## 2. How we use it

| Purpose | Data used |
|---|---|
| Operating the Platform | All of the above |
| Fraud prevention | IP, fingerprint, wallet history |
| Regulatory compliance (KYC/AML) | Identity info if KYC is triggered |
| Customer support | Whatever you tell us |
| Improving the Platform | Aggregated, non-personal usage data |

We do **not** sell personal data. We do **not** share with advertisers.

## 3. How long we keep it

- Account data: for the life of your account + [7] years after closure (regulatory requirement)
- Audit logs: [7] years (regulatory requirement)
- Support tickets: [3] years
- IP / fingerprint / fraud signals: [2] years

## 4. Where it lives

Our databases are in [REGION]. We use the following subprocessors:

- **[DB PROVIDER]** — Postgres hosting, in [REGION]
- **[EMAIL PROVIDER]** — transactional email
- **[LOG AGGREGATOR]** — application logs, redacted of secrets
- **[ERROR TRACKER]** — error monitoring
- **[RPC PROVIDER]** — blockchain reads
- **[CDN]** — edge caching, DDoS protection
- **[KYC VENDOR]** — identity verification when triggered

All subprocessors are contractually bound to the same data protections we agree to with you.

## 5. Your rights

Depending on your jurisdiction (GDPR, CCPA, etc.) you may have the right to:

- Access a copy of your data
- Correct inaccurate data
- Delete your account and associated off-chain data (on-chain data cannot be deleted)
- Port your data to another service
- Object to certain processing

To exercise any of these, email [PRIVACY EMAIL]. We'll respond within [30] days.

**Exception:** We retain data we are legally required to retain (audit logs, tax records, etc.) regardless of a deletion request.

## 6. Cookies

We use:

- **Session cookie** — `__Secure-nexora.session-token` (or `nexora.session-token` in dev). HttpOnly, SameSite=Lax, Secure. Required for signin.
- **No third-party tracking cookies.**
- **No advertising cookies.**

If we add analytics, we will update this policy and require your opt-in where jurisdiction demands it.

## 7. Children

NEXORA is not for users under 18. We do not knowingly collect data from minors. If you believe we have collected data from a minor, contact [PRIVACY EMAIL] and we'll delete it.

## 8. International transfers

If you access the Platform from outside [OUR JURISDICTION], your data is transferred to and processed in [JURISDICTION]. We rely on [Standard Contractual Clauses / adequacy decisions / etc.] for GDPR-compliant transfers.

## 9. Security

We use:

- Passwords hashed with bcrypt (cost 12)
- Encrypted connections (TLS) everywhere
- Httponly + Secure session cookies
- Strict Content Security Policy
- Rate limiting on sensitive endpoints
- Audit logging of all admin actions
- Regular security reviews (see `SECURITY.md`)

We cannot guarantee absolute security. If a breach occurs that affects your data, we will notify you without undue delay, and in compliance with applicable breach-notification laws.

## 10. Changes

We may update this policy. Material changes will be announced via email and the Platform. Continued use after the effective date is acceptance.

## 11. Contact

- Privacy questions: [PRIVACY EMAIL]
- Data subject rights: [PRIVACY EMAIL]
- EU representative: [IF REQUIRED]
- Data Protection Officer: [IF REQUIRED]
- Supervisory authority complaint: [RELEVANT REGULATOR]
