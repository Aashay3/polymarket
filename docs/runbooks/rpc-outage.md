# RPC / Blockchain Outage

## Symptom

- Users report "deposit verification failed"
- `/api/health` returns 503 with `checks.chain.status: "down"`
- Logs show errors from `verifyUsdcDeposit` or `getTransactionReceipt`

## Impact

- **Deposit submission is broken.** Every POST /api/deposits fails verification and records a REJECTED row.
- Everything else keeps working: trading, withdrawals, market resolution.

## Triage (first 60 seconds)

1. Confirm from outside: `curl https://yourdomain.com/api/health | jq .checks.chain`
2. Check the RPC provider's status (Alchemy / Infura / Polygon's public RPC):
   - https://status.polygon.technology/
   - https://status.alchemy.com/
   - https://status.infura.io/
3. Test directly:
   ```
   curl -X POST "$NEXT_PUBLIC_RPC_URL" \
     -H "content-type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}'
   ```
   - 200 with a result → our app is misconfigured
   - Timeout / 5xx → provider is actually down

## Mitigate

- **Do NOT flip the kill switch** — trading still works. Losing deposit submission for 10 minutes is better than pausing the whole platform.
- Post on the status page: "deposits temporarily delayed; trading unaffected"
- Users who try to submit a deposit now will see their tx recorded as REJECTED. We can re-attempt later (see Resolve below).

## Resolve

### Case A: Provider outage

Wait. Monitor their status page. When green:

1. Flip `/api/health` to confirm chain is back up.
2. For users whose deposits rejected with reason `TX_NOT_FOUND` during the window, you need to let them retry. The current code rejects resubmission of the same txHash because the Deposit table has a UNIQUE constraint on txHash. Run:

   ```sql
   DELETE FROM "Deposit"
   WHERE status = 'REJECTED'
     AND "rejectionReason" LIKE 'TX_NOT_FOUND%'
     AND "createdAt" > NOW() - INTERVAL '2 hours';
   ```

   This lets users resubmit. Announce in #announcements.

### Case B: We're rate-limited by the provider

Every deposit submission hits the RPC. If a spike exceeds our RPC quota, we start failing. Fix:

- Short-term: bump the RPC plan or switch to a different provider by updating `NEXT_PUBLIC_RPC_URL`.
- Medium-term: add an in-process cache in `src/lib/chain.ts` so repeat submissions of the same hash in a short window don't re-call the RPC.
- Long-term: run our own Polygon node.

### Case C: RPC working but deposits still failing

- Verify `DEPOSIT_ADDRESS`, `USDC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_CHAIN_ID` match. A chain-id mismatch looks like a mass failure.
- Check if someone rotated the deposit address without updating the env.

## Switching RPC providers

In `.env`, change `NEXT_PUBLIC_RPC_URL` to the new provider's URL. Restart the app. Verify with `/api/health`. Users don't need to do anything — they interact with the chain through their own wallet, not our RPC.

Shortlist of providers if primary goes down:

- https://polygon-rpc.com (public, rate-limited)
- Alchemy (requires API key)
- Infura (requires API key)
- QuickNode (requires API key)

Keep the fallback URL in a secret manager — we want to switch in under 5 minutes.

## Post-mortem focus areas

- Should we have a multi-provider RPC setup? (Automatic failover)
- Is our cache layer effective at absorbing spikes?
- How quickly did our monitoring notice?
