# Stuck Withdrawal

## Symptom

A user reports (or the pending-withdrawal dashboard shows) a withdrawal that's been `PENDING` for more than 24 hours.

## Impact

- User is waiting for their money.
- If it's been >48h without a response from us, regulatory/reputational risk escalates.
- Their balance is held in `locked` — they can't trade it, can't re-request, can't cancel (cancel isn't wired for users in Phase 5).

## Triage

1. Look up the withdrawal:
   ```sql
   SELECT id, "userId", "toAddress", amount, status, "requestedAt",
          "processedById", "rejectionReason"
   FROM "Withdrawal" WHERE id = 'wthdrwXXX';
   ```
2. Look up the user's linked wallets and recent activity:
   ```sql
   SELECT address, "isPrimary" FROM "Wallet" WHERE "userId" = 'uXXX';
   SELECT * FROM "AuditLog" WHERE "actorId" = 'uXXX' ORDER BY "createdAt" DESC LIMIT 20;
   ```
3. Does the `toAddress` match one of the user's linked wallets? If not, that's a red flag — stop and investigate for account compromise before sending.

## Mitigate

Acknowledge the user publicly (status page, direct reply) with an ETA. Even a 2-hour "we're looking at it" beats silence.

## Resolve

### Normal case: admin simply hasn't processed yet

From the admin's operational wallet, send the exact USDC amount to the recorded `toAddress`, then `POST /api/admin/withdrawals/[id]/complete` with the on-chain tx hash. The system automatically:

- Decrements `balance.locked`
- Bumps `totalWithdrawn`
- Records the txHash on the Withdrawal row
- Sends a "Withdrawal sent" notification to the user

### Rejection case: something is off

If the withdrawal should NOT be sent (address mismatch, fraud flag, KYC not completed), reject it:

```
POST /api/admin/withdrawals/[id]/reject
{ "reason": "Destination address does not match your linked wallet. Please link it first via SIWE, then resubmit." }
```

User's funds return to `available`. User gets a notification with the reason.

### "Already sent but forgot to mark" case

This is bad — means we paid out without closing the ticket:

1. Look up the on-chain tx hash from the admin's wallet history.
2. Verify on a block explorer that it went to the correct `toAddress` and the correct amount.
3. Mark complete with that hash as normal.
4. **Post-mortem required.** Reconciliation gap this size indicates a broken process.

### "Sent but reverted / dropped" case

The tx was submitted on-chain but didn't confirm:

1. Do NOT mark complete until you have a confirmed tx.
2. Retry the send with higher gas.
3. If the retry confirms, mark complete with the retried tx hash.
4. If multiple txs ended up on-chain (nonce replacement failed), reconcile manually — only count one toward the user's withdrawal.

## When to escalate

- Withdrawal has been PENDING >72h
- `toAddress` doesn't match any linked wallet
- Amount is >= $10,000
- User's account has multiple failed signins in audit log
- Multiple withdrawals from the same user in a short window

In all these cases, require a second admin's sign-off before completing.

## Never

- Never send funds off-process. Every payout MUST go through the complete flow so the balance accounts correctly.
- Never edit the Withdrawal table directly to mark something complete without a real txHash.
- Never refund via a regular deposit — that double-counts. Use the `balance.available` increment inside an admin-only SQL transaction if you ever need to manually credit.
