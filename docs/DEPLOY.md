# Deployment Guide

How to deploy NEXORA to your own server. Assumes you own a domain and a VPS with Docker.

## Pre-launch checklist

Don't skip these. They're the difference between "live" and "live AND ok".

### Code

- [ ] `npm test` — all 170+ tests pass
- [ ] `npm run typecheck` — clean
- [ ] `npm run lint` — zero errors (warnings OK)
- [ ] `npm run build` — succeeds without DATABASE_URL (verifies lazy init)
- [ ] Pick a git tag: `git tag v0.1.0 && git push --tags`
- [ ] `APP_VERSION` env var set to the git sha or tag (shows up in `/api/health`)

### Environment

- [ ] Every variable in `.env.example` is set in your production env
- [ ] `AUTH_SECRET` is at least 32 bytes of randomness (`openssl rand -base64 32`)
- [ ] `DATABASE_URL` points at production DB (NOT dev/staging)
- [ ] `DEPOSIT_ADDRESS` is a multisig cold wallet you actually control, not a dev key
- [ ] `NEXT_PUBLIC_CHAIN_ID` matches `USDC_CONTRACT_ADDRESS` (both mainnet or both testnet — no mixing)
- [ ] `CRON_SECRET` set if you're using the HTTP cron trigger instead of in-process
- [ ] `MAINTENANCE_MODE=false` (or unset)
- [ ] `DAILY_WITHDRAWAL_CAP_USDC` set appropriately for your risk tolerance

### Database

- [ ] Production DB exists and you have its connection string
- [ ] Backups are configured and you've **tested a restore**
- [ ] `npx prisma migrate deploy` runs without errors
- [ ] `SEED_ADMIN_EMAIL` is set before running the seed (bootstraps one ADMIN user); remove from env after initial seed

### Infrastructure

- [ ] Domain name configured with DNS pointing at your server
- [ ] TLS certificate provisioned (Let's Encrypt via Caddy/nginx)
- [ ] Reverse proxy sets `X-Forwarded-For` correctly (the rate limiter depends on this)
- [ ] Firewall blocks direct access to Postgres port
- [ ] Uptime monitor pings `/api/health` every 60s (BetterUptime / UptimeRobot)
- [ ] Log aggregator ingesting app stdout (Datadog / Axiom / Grafana Loki)
- [ ] Error tracker integrated (Sentry) — see "Observability hooks" below
- [ ] Backup storage (S3 bucket or Neon PITR) tested

### Security

- [ ] Read through `docs/THREAT_MODEL.md`. Any listed residual risks acceptable to you?
- [ ] External audit scheduled or complete — see `docs/AUDIT_SCOPE.md`
- [ ] `SECURITY.md` email address is monitored and responded to within 48h
- [ ] Admin accounts created via DB, not through the public signup flow
- [ ] No admin has weak password (enforce via bcrypt plus a strong-password policy)
- [ ] Operational wallet is a multisig (Gnosis Safe minimum 2-of-3)
- [ ] Hot-wallet private keys NEVER committed, never in env of the web app

### Legal

- [ ] Terms of Service published (see `docs/legal/TERMS_OF_SERVICE.md` — needs lawyer review)
- [ ] Privacy Policy published (see `docs/legal/PRIVACY_POLICY.md` — needs lawyer review)
- [ ] Crypto lawyer retained for your jurisdiction
- [ ] Geofencing configured at CDN (block US, UK, and other restricted jurisdictions for prediction markets)
- [ ] KYC provider integrated if you plan to support withdrawals above KYC threshold
- [ ] Regulatory filing complete (varies by jurisdiction)

### Runbooks

- [ ] Someone is on-call and has read `docs/runbooks/incident-response.md`
- [ ] Everyone who's on-call has tested `MAINTENANCE_MODE=true` in staging
- [ ] Admin credentials + operational-wallet seed phrase in a secure place (1Password, hardware wallet) and someone besides you knows how to access

## Deploy procedure

### First-time deploy

```bash
# 1. On your VPS, clone the repo
git clone https://github.com/Aashay3/polymarket.git /srv/nexora
cd /srv/nexora

# 2. Create production .env (do NOT commit this)
cp .env.example .env
$EDITOR .env

# 3. Build + start
docker compose up -d --build

# 4. Wait for health check
curl -sf http://localhost:3000/api/status || sleep 5

# 5. Seed bootstrap data
docker compose exec app npx prisma db seed

# 6. Verify
curl http://localhost:3000/api/health | jq
```

Point a reverse proxy (Caddy is the easiest) at `localhost:3000`:

```
# /etc/caddy/Caddyfile
nexora.yourdomain.com {
  reverse_proxy localhost:3000

  # Belt-and-suspenders on CSP/HSTS even though the app sets them.
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Frame-Options "DENY"
  }
}
```

### Subsequent deploys

```bash
cd /srv/nexora
git pull
docker compose up -d --build   # migrations run on container start
```

`migrate deploy` is idempotent; safe to re-run.

## Observability hooks

Phase 8 ships with a structured JSON logger (`src/lib/logger.ts`). Ship its output to:

- **stdout** (already) — Docker captures, `docker compose logs app`
- **Log aggregator** — pipe stdout via Vector / Fluent Bit / the aggregator's agent
- **Error tracker** — Sentry integration: install `@sentry/nextjs`, set `SENTRY_DSN`, and the SDK auto-captures unhandled errors + the `logger.error` lines

Do this post-launch unless you have real traffic; the free tier of every tool in this category is generous.

## Scaling out

The in-memory rate limiter + SSE bus work for a single instance. When you need multiple instances behind a load balancer:

1. Deploy Redis (Upstash, Redis Cloud, or your own)
2. Set `REDIS_URL` in env
3. Swap `src/lib/rate-limit.ts` and `src/lib/events.ts` internals — the public API stays the same; see the comments in those files for the specific swap path
4. Enable sticky sessions on the load balancer for the SSE endpoint (or use Redis pub/sub fan-out)

This work is NOT prerequisite to launch — you can run at one instance for months. Do it when you see the load justify it.

## Rollback

```bash
git log --oneline -5             # find the last good sha
git checkout <good-sha>
docker compose up -d --build
```

If migrations went the wrong way, restore DB from the backup taken right before deploy. Migrations are forward-only by Prisma design; use the DB backup, not a SQL `DOWN` script.
