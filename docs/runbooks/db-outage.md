# Database Outage

## Symptom

- `GET /api/health` returns 503 with `checks.db.status: "down"`
- Users report "something went wrong" on any action
- Logs show `P1001: Can't reach database server` or `ECONNREFUSED`

## Impact

Everything — we're a database-backed application. Users can browse cached pages (if any) but every write and most reads fail.

## Triage (first 60 seconds)

1. Confirm from outside: `curl https://yourdomain.com/api/health | jq .checks.db`
2. Check the DB provider's status page (Neon / AWS RDS / whatever).
3. From a machine with the DATABASE_URL, try to connect directly:
   ```
   psql "$DATABASE_URL" -c "SELECT 1"
   ```
   - Works → the app's connection pool is broken, not the DB
   - Hangs → network path is broken (firewall, VPC, DNS)
   - Auth error → credentials changed or rotated accidentally

## Mitigate

- **Flip the kill switch immediately**: set `MAINTENANCE_MODE=true` so users see a banner instead of cryptic 500s. The app can still serve cached reads once the DB is back without you having to catch up on failed writes.
- If you're on a managed DB (Neon), check for auto-suspend: Neon free tier suspends after inactivity and takes ~1s to wake. Not actually an outage.

## Resolve

### Case A: DB provider outage

Nothing to do but wait + keep users informed via status page. Continue to monitor `/api/health`. When green again, flip kill switch off.

### Case B: App can't connect but DB is up

- Restart the app. Connection pool might be stuck.
- Check the app's network → DB route. For docker-compose: `docker network inspect` to verify the `app` and `postgres` containers share a network.
- Check DATABASE_URL didn't get corrupted in env.

### Case C: DB is up but reporting query failures

- Check disk space on the DB host. Postgres halts writes if disk is full.
- Check for a runaway query: `SELECT * FROM pg_stat_activity WHERE state = 'active' ORDER BY query_start;`
- Check for lock contention: `SELECT * FROM pg_locks WHERE granted = false;`

### Case D: Credentials revoked

- Rotate DATABASE_URL in env. Restart app. Update any secret manager.

## Data integrity check after recovery

Once the DB is back, BEFORE flipping the kill switch off:

1. Total user balance (sum of `available + locked`) should be <= total deposits minus total withdrawals. Any discrepancy is a red flag.
   ```sql
   SELECT
     (SELECT COALESCE(SUM(available + locked), 0) FROM "Balance") AS total_user_balance,
     (SELECT COALESCE(SUM(amount), 0) FROM "Deposit" WHERE status = 'CONFIRMED') AS total_deposited,
     (SELECT COALESCE(SUM(amount), 0) FROM "Withdrawal" WHERE status = 'COMPLETED') AS total_withdrawn;
   ```
2. No orphan trades: every `Trade.marketId` points to an existing market. (Foreign keys enforce this; run a `COUNT` to verify.)
3. Scan the audit log for anything suspicious from the outage window.

## Backups

We rely on our DB provider's PITR (point-in-time recovery) + daily snapshots. Restore procedure:

- **Neon:** Use the Time Travel feature in the Neon console; restore to a branch, test, then promote.
- **Self-hosted:** `pg_restore` from the nightly `pg_dump` backup, stored in S3 (see `docs/DEPLOY.md` for the backup cron setup).

Verify backups quarterly by doing a test restore into a separate DB. Paper promises are worthless — test the restore path.

## Post-mortem focus areas

- Was the DB over-provisioned for this load? If no, that's an action item.
- Did our alerting catch it in <5 minutes? If no, that's an action item.
- Did the kill switch actually protect users? If no, fix the flow.
