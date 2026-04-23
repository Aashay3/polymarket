# Mass Fraud / Abuse Event

## Symptom (any of)

- Signup volume 10x+ normal for no obvious reason
- Large number of accounts each depositing the minimum and immediately withdrawing the max
- Many accounts trading identically (coordinated wash trading)
- Rapid-fire deposits from the same wallet across many accounts
- Geographic concentration in a region we don't normally see

## Impact

- Direct financial loss via withdrawal abuse
- Operational overhead processing fraudulent KYC requests
- AML/regulatory exposure — regulators don't care if it's "just" bot abuse

## Triage

1. **Is this a real fraud pattern or a launch spike?** Check timing — did we just ship a marketing push?
2. Pull signup + deposit stats for the last 24h:
   ```sql
   SELECT date_trunc('hour', "createdAt") AS hour, COUNT(*) AS signups
   FROM "User" WHERE "createdAt" > NOW() - INTERVAL '24 hours'
   GROUP BY hour ORDER BY hour DESC;

   SELECT date_trunc('hour', "createdAt") AS hour, COUNT(*) AS deposits, SUM(amount) AS total
   FROM "Deposit" WHERE status = 'CONFIRMED' AND "createdAt" > NOW() - INTERVAL '24 hours'
   GROUP BY hour ORDER BY hour DESC;
   ```
3. Look for coordinated patterns:
   - Multiple users with deposits from the same funding wallet
   - Deposits made within seconds of each other
   - Signups from the same `/24` IP block
4. Scan the audit log for any admin actions that might have been exploited.

## Mitigate

Pick in order, stop when things stabilize:

1. **Raise signup rate limit** — edit `src/lib/rate-limit.ts` `signup` preset from 5/hour/IP to 1/hour/IP. Deploy.
2. **Lower daily withdrawal cap** — `DAILY_WITHDRAWAL_CAP_USDC` env var. Drop from 50k to something defensible (1k?). Restart app.
3. **Pause deposits** by temporarily setting `DEPOSIT_ADDRESS` to `0x000...dead` so new deposits fail verification. Existing users can still trade.
4. **Full kill switch** — `MAINTENANCE_MODE=true`. Complete freeze.

Any of these is better than letting an attack drain for an hour while you investigate.

## Resolve

### Identify the attacker cluster

Use SQL to find accounts that share:
- Depositing wallet address (attacker likely funds many accounts from one)
- Signup IP subnet
- Similar timing patterns

Example: accounts that deposited from the same wallet address:
```sql
SELECT d1."fromAddress", COUNT(DISTINCT d1."userId") AS distinct_users
FROM "Deposit" d1
WHERE d1.status = 'CONFIRMED'
  AND d1."createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY d1."fromAddress"
HAVING COUNT(DISTINCT d1."userId") > 3
ORDER BY distinct_users DESC;
```

### Contain

For identified fraud accounts:

```sql
-- Block further actions by demoting (we don't have a banned flag yet;
-- Phase 8 item). For now, zero their balance and null their passwordHash
-- to lock them out, then audit-log the action.
UPDATE "User" SET "passwordHash" = NULL WHERE id IN (...);
UPDATE "Balance" SET available = 0, locked = 0 WHERE "userId" IN (...);
```

Document every account you touch in the audit log manually.

### Recover

- Any withdrawal that has been submitted PENDING by a fraud account — reject it with reason `fraud investigation`.
- Any withdrawal that was already COMPLETED — document it, reconcile, and pursue via legal if the amounts justify it.

### Harden

- Add the attacker's known wallet addresses to a block list (add `DepositBlocklist` table if this happens often).
- Tighten rate limits based on the attack pattern (e.g., signup-per-ASN rather than per-IP).
- Require KYC for withdrawals above a lowered threshold.

## Post-mortem focus areas

- Did any monitoring alert on the abnormal pattern? If no, add the detector.
- What was the attacker's profit? (Losses from our POV.)
- What gap in our controls let this through?
- What can we automate so the next attack is detected in minutes not hours?

## The long-term answer

Pre-audit we rely on rate limits and manual review. Phase 8 + Phase 9 work:

- KYC gate (Persona, Sumsub) for withdrawals above a threshold
- Geofencing — block IPs from sanctioned jurisdictions at the CDN layer
- Device fingerprinting to detect multi-account patterns
- Machine-learning fraud scorer
- Blockchain analytics (Chainalysis, TRM) for deposit address screening
