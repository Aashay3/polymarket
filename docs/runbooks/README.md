# Runbooks

Operational procedures for on-call responders. Every runbook follows
the same shape:

- **Symptom** — what you're seeing that made you open this doc
- **Impact** — who's affected and how badly
- **Triage** — first 60 seconds: confirm the problem is real
- **Mitigate** — buy time for users, even if you haven't fixed the root cause
- **Resolve** — make the problem go away
- **Post-mortem** — always, no exceptions, within 5 business days

## Index

| Runbook | When to open |
|---|---|
| [incident-response.md](incident-response.md) | Any production incident. Start here if unsure. |
| [db-outage.md](db-outage.md) | `/api/health` reports `db: down` |
| [rpc-outage.md](rpc-outage.md) | Deposits failing, `/api/health` reports `chain: down` |
| [stuck-withdrawal.md](stuck-withdrawal.md) | User's withdrawal has been PENDING > 24h |
| [compromised-admin.md](compromised-admin.md) | Any signal an admin account / session was taken over |
| [mass-fraud.md](mass-fraud.md) | Unusual volume, mass signups, rapid-fire deposits |

## The kill switch

Every runbook ends with "if you are unsure, flip the kill switch." Set
`MAINTENANCE_MODE=true` in the environment and restart the app (or
`docker compose restart app`). That pauses all trades, deposits, and
withdrawals immediately. Read operations (markets, portfolio) keep
working so users can see state.

Flip back to `MAINTENANCE_MODE=false` (or delete the variable) when
you've resolved the underlying issue.

## Escalation

Severity ladder:

- **SEV-0**: user funds are at risk, or already lost. Page the CTO + founder + legal.
- **SEV-1**: platform is down or partially degraded for >5% of users. Page on-call.
- **SEV-2**: a feature is broken but workaround exists. Slack notify.
- **SEV-3**: minor bug. File a ticket.

Unsure? Page. It's cheap to wake someone up; it's expensive to let a SEV-0 run overnight.
