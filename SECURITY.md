# Security Policy

NEXORA handles user funds. We take vulnerability reports very seriously and want to work with the security community to keep users safe.

## Reporting a vulnerability

**Email:** security@nexora.example (replace with real address before launch)

Please include:

- A clear description of the issue and what a realistic attacker could do with it
- Steps to reproduce, including any URLs, inputs, accounts, or screenshots
- The commit hash or production build you tested against
- Your suggested remediation if you have one
- Whether you would like credit in the advisory

Please **do not**:

- Publicly disclose the issue before we've had a chance to fix it
- Run destructive proofs-of-concept against production (account takeover, fund theft, DoS, etc.) — use testnet or ask us for a staging account
- Access data that isn't yours, beyond what's needed to demonstrate the bug
- Exploit the vulnerability beyond the minimum required to prove it

## What we'll do

- Acknowledge your report within **48 hours**
- Keep you updated on progress at least weekly
- Let you know when we've shipped the fix and when we plan to publicly disclose
- Credit you in the advisory (unless you ask us not to)

## Scope

**In scope:**

- Anything on our production or staging web app
- Our public API (`/api/*`)
- Our smart contracts once deployed (see `AUDIT_SCOPE.md`)
- Issues in our `main` branch on GitHub

**Out of scope:**

- Social engineering, phishing, physical attacks
- Denial of service attacks that require significant resources
- Vulnerabilities in third-party dependencies unless we're using them in an unsafe way
- Issues requiring compromise of a user's device or wallet
- Self-XSS, CSRF on logout, and similar low-impact issues
- Missing headers on non-sensitive endpoints
- Best-practice suggestions without a concrete exploit

## Safe harbor

We consider security research conducted in good faith under this policy to be:

- Authorized access under the Computer Fraud and Abuse Act (and equivalents in other jurisdictions)
- Exempt from DMCA claims on any reverse engineering required
- Not a violation of our terms of service

We will not pursue legal action against researchers who follow this policy. If a third party (law enforcement, a payments partner, etc.) initiates action against you for a good-faith report, we'll make it clear you were authorized.

## Rewards

We don't have a formal bug-bounty program at the time of writing. For high-impact reports we'll offer:

- Credit in the public advisory (if you want it)
- A discretionary cash reward proportional to severity and impact
- Free platform credits

We'll update this policy with a formal reward table once we have launched publicly.

## Cryptography

We use standard, well-reviewed primitives:

- `bcryptjs` (cost 12) for password hashing
- Auth.js JWT sessions, httpOnly + SameSite=Lax + Secure (in prod) cookies
- SIWE (EIP-4361) for wallet-based signin; nonces are single-use and 10-minute TTL
- `viem` for all on-chain RPC reads; we never sign transactions server-side in the current architecture

If you find a misuse of any of these, report it.
