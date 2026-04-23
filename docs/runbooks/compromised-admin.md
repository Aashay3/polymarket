# Compromised Admin

## Symptom (any of)

- Admin login from an unusual location or time (check audit log)
- Admin approving unusual withdrawals (large amounts, unfamiliar addresses, in bursts)
- Admin account MFA prompt completed without their knowledge
- Admin mentions their device was lost / stolen / accessed by someone else
- Anomaly alert: market resolutions against market consensus

## Impact

**SEV-0 potential.** An attacker with admin access can:

- Approve fraudulent withdrawals (but only to the cap — $50k/user/day by default)
- Resolve markets to fraudulent outcomes, paying out fake "winners" they control
- Create markets with designed-to-extract properties
- Read every user's data

**However**, because our hot wallet signing happens OUTSIDE the web app (admin signs from their own wallet), a pure web-admin takeover cannot itself move money — they still need to sign a real on-chain tx. The web admin is a *control plane*, not a signing key.

## Triage

1. **Flip the kill switch right now.** `MAINTENANCE_MODE=true`, restart app. This blocks all new admin actions.
2. Revoke the admin's JWT by rotating `AUTH_SECRET`. Every active session is invalidated; they'll have to sign in again.
3. Pull the audit log for this admin's last 24 hours:
   ```sql
   SELECT * FROM "AuditLog"
   WHERE "actorId" = 'admin_cuid'
     AND "createdAt" > NOW() - INTERVAL '24 hours'
   ORDER BY "createdAt" DESC;
   ```
4. Cross-reference with operational-wallet tx history. Any completed withdrawal should have a matching real on-chain send.

## Mitigate

- Demote the admin immediately:
  ```sql
  UPDATE "User" SET role = 'USER' WHERE id = 'admin_cuid';
  ```
  (We do not have a session-version field yet; role changes take effect on next JWT refresh. `AUTH_SECRET` rotation is the definitive kill.)
- Block the admin's IP at the edge (Cloudflare / nginx allowlist).
- If the admin has access to the operational hot wallet, **pause or rotate the wallet's signing key** — this is outside the web app and depends on your signing setup (hardware wallet, multisig, etc.).

## Resolve

### Reverse unauthorized actions

For each suspect audit entry:

- `market.resolve` — if the resolution was wrong, void the market manually (SQL: `UPDATE "Market" SET status = 'VOIDED' WHERE ...`) and re-credit everyone from the resolution. This is a major data recovery operation; do it carefully and in a transaction.
- `withdrawal.completed` — if the on-chain send already happened, the money is gone. Document it, reconcile, and pursue recovery via legal / chain analysis.
- `market.create` — unpublish or void the market.
- `withdrawal.rejected` — rejection is safe; money returned to user. Probably don't need to act.

### Re-onboard the admin (if they should remain admin)

- Reset their password via a password-reset flow (not yet built; for MVP, DB-set the passwordHash to null and ask them to signup again).
- Require MFA (not yet built; Phase 8 item).
- Add their new hardware key to the hot-wallet multisig.

## Hardening follow-ups (action items for the post-mortem)

- [ ] Implement 2FA for admin accounts (TOTP + WebAuthn)
- [ ] Require 2-of-N multisig on the operations wallet for any withdrawal > $10k
- [ ] Add a session-version field to User so role changes take effect immediately
- [ ] Anomaly detection on admin actions (alert when admin approves withdrawals at unusual rate / time)
- [ ] IP allow-list for admin routes

## Never

- Never share admin credentials. Each admin has their own account.
- Never run admin actions from a personal device. Dedicated, locked-down machine only.
- Never use the same wallet for receiving user deposits AND processing admin withdrawals. Segregate.
