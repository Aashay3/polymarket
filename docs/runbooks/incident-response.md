# Incident Response

Open this when you don't know which specific runbook applies yet. Use it to classify, contain, and hand off.

## Symptom

- Multiple user reports of the platform being broken
- Pager alert from uptime monitor
- Gut feeling that something is wrong

## Impact

Unknown at this point — figuring it out is step 1.

## Triage (first 60 seconds)

1. Hit `GET /api/health` from outside the infra.
   - 200 → platform is up; maybe specific feature is broken
   - 503 → at least one hard dependency is down; look at the `checks` body
   - timeout / 502 / 504 → the app itself is not responding

2. Check recent deploys in `git log -5 --oneline` and your CI dashboard. Did something ship in the last hour?

3. Open the admin audit log (`GET /api/admin/audit-log?limit=50`) to see if anyone is actively making admin changes — rules out an internal mistake being the cause.

4. Scan logs for ERROR level in the last 15 minutes:
   ```
   docker compose logs app --since 15m | jq 'select(.level == "error")'
   ```

## Mitigate

Do at least ONE of these immediately, in parallel with diagnosis:

- **Flip the kill switch** if money is at risk: set `MAINTENANCE_MODE=true`, restart app. Users see a read-only banner; no new trades, deposits, or withdrawals.
- **Roll back** if the issue started right after a deploy:
  ```
  git revert <bad-sha>
  git push
  # let CI redeploy
  ```
- **Scale up** if it's a load spike: add instances, bump DB tier.

## Classify severity

- Loss of user funds (real or imminent) → **SEV-0**. Wake up the CTO. Keep kill switch on. Pull in legal.
- Platform down for all users → **SEV-1**. On-call responder owns it.
- A feature is broken, users can still trade → **SEV-2**. Still needs a same-day fix.
- Cosmetic / minor → **SEV-3**. Ticket and move on.

## Resolve

Follow the matching runbook below:

- Database issues → [db-outage.md](db-outage.md)
- Blockchain RPC issues → [rpc-outage.md](rpc-outage.md)
- Withdrawal flow issues → [stuck-withdrawal.md](stuck-withdrawal.md)
- Admin account compromised → [compromised-admin.md](compromised-admin.md)
- Abuse / fraud signals → [mass-fraud.md](mass-fraud.md)

## Communicate

As soon as triage is done (regardless of outcome):

- Post in the #incidents Slack channel with: severity, one-line summary, who's on it
- If external users are affected, update the status page
- If a SEV-0/1, send an all-hands update every 15 minutes until resolved

## Post-mortem

Every SEV-0/1/2 requires a blameless write-up within 5 business days:

- What happened (timeline with timestamps)
- Why it happened (proximate + root causes)
- Why it wasn't caught sooner
- Action items with owners + due dates

Template lives at `docs/runbooks/POST_MORTEM_TEMPLATE.md` (write it when you need it — don't preemptively template).

## What to NOT do

- Do not push a "hotfix" commit directly to `main` without review when things are on fire. Forced fixes cause second incidents.
- Do not delete logs or audit entries. The audit log is append-only by policy.
- Do not guess at financial reconciliation. If money state is unclear, flip kill switch and let the team look at it together.
- Do not talk to press or regulators without legal in the loop.
