# NEXORA contracts

Foundry project for the on-chain prediction-market settlement layer.

> **Demo only.** This contract has not been audited. Do not deploy
> with real funds. Tier-2 from `NEXORA-Status.pdf` — covers the core
> AMM + resolve + claim loop; production hardening (UMA oracle,
> upgradability, MEV protection) is out of scope here.

## Architecture

A single `PredictionMarket` contract holds every binary market.
Outcome-share balances are tracked internally per-(marketId, user)
rather than as separate ERC-20s — flat deploy cost, simpler claim flow.

* **AMM** — constant-product invariant `yesPool * noPool = k`. Buying
  YES with `X` USDC routes through `noPool += X', yesPool -= sharesOut`
  where `sharesOut = yesPool * X' / (noPool + X')` and `X' = X * (1 - feeBps/10_000)`.
  Sell is the symmetric inverse.
* **Resolution** — `onlyOwner` for now. Replace with a multisig or
  UMA-style optimistic oracle when graduating from demo.
* **Claim** — winning shares burn 1:1 for USDC. Reserve always covers
  outstanding winning shares (proof: each share is backed by a
  matching USDC contribution net of fees, fees stay in the pool).
* **LP withdraw** — owner pulls the spread + losing-side stakes after
  resolution. Cannot pull more than `usdcReserve - outstandingWinners`.

## Layout

```
contracts/
├── foundry.toml          # toolchain config + RPC endpoints
├── src/
│   ├── PredictionMarket.sol
│   ├── MockUSDC.sol      # 6-decimal mintable test token
│   └── SidzSol.sol       # SIDZSOL — fixed-supply 100M ERC-20 (Permit + Burnable)
├── test/
│   ├── PredictionMarket.t.sol
│   └── SidzSol.t.sol
└── script/
    ├── Deploy.s.sol         # PredictionMarket
    └── DeploySidzSol.s.sol  # SIDZSOL token
```

## SIDZSOL token

`SidzSol.sol` is a standalone ERC-20 — independent of the prediction
market — intended as the project's circulating utility token.

| Property        | Value                                            |
| --------------- | ------------------------------------------------ |
| Name / Symbol   | `SidzSol` / `SIDZSOL`                            |
| Decimals        | 18                                               |
| Total supply    | 100,000,000 (minted to `treasury` at deploy)     |
| Mintable later  | No — supply is fixed at construction             |
| Burnable        | Yes — holders can burn their own balance         |
| EIP-2612 Permit | Yes — gasless approvals for DEX integrations     |
| Owner / admin   | None — no privileged role exists                 |

### Deploy SIDZSOL to Polygon Amoy

```bash
cd contracts
export DEPLOYER_PRIVATE_KEY=0x<your-key>
export POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
export POLYGONSCAN_API_KEY=<for verification>
# optional — defaults to deployer if unset
export TREASURY_ADDRESS=0x<treasury-multisig-or-eoa>

forge script script/DeploySidzSol.s.sol \
  --rpc-url amoy \
  --broadcast \
  --verify
```

After deploy, copy the printed address into `.env.local` as
`NEXT_PUBLIC_SIDZSOL_ADDRESS` so the frontend token list picks it up.

## Setup

You'll need [Foundry](https://book.getfoundry.sh/getting-started/installation)
installed (`foundryup` after the `curl` installer).

```bash
cd contracts

# Fetch deps (OpenZeppelin v5, forge-std)
forge install openzeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit

# Compile + test
forge build
forge test -vv
```

## Deploy to Polygon Amoy

1. Get a wallet with Amoy MATIC ([faucet](https://faucet.polygon.technology/)).
2. Get test USDC on Amoy ([Circle faucet](https://faucet.circle.com/),
   chain = "Polygon PoS Amoy").
3. Set env:
   ```bash
   export DEPLOYER_PRIVATE_KEY=0x<your-key>
   export POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
   export POLYGONSCAN_API_KEY=<for verification>
   export USDC_ADDRESS=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582
   ```
4. Run:
   ```bash
   forge script script/Deploy.s.sol \
     --rpc-url amoy \
     --broadcast \
     --verify
   ```
5. Copy the printed `PredictionMarket` address into the Next.js side
   as `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` (read by
   `src/lib/contracts/predictionMarket.ts`).

## Wiring to the Next.js app

The frontend uses [viem](https://viem.sh) with a single shared client
defined in `src/lib/chain.ts`. Read-side helpers live in
`src/lib/contracts/predictionMarket.ts`; the ABI is exported from
`src/lib/contracts/abi.ts` and is hand-maintained — re-paste from
`out/PredictionMarket.sol/PredictionMarket.json` after each
ABI-affecting change.

### Hybrid mode (admin actions on-chain)

Set in `.env.local`:

```bash
ENABLE_ON_CHAIN_SETTLEMENT=true
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x<deployed-address>
ADMIN_PRIVATE_KEY=0x<hot-key-with-USDC-and-MATIC-on-Amoy>
```

When set, **admin** actions are mirrored on-chain after the DB
mutation commits:

| API route                                     | On-chain call         |
| --------------------------------------------- | --------------------- |
| `POST /api/admin/markets`                     | `createMarket(...)`   |
| `POST /api/admin/markets/[id]/resolve`        | `resolve(id, outcome)`|

Failure modes are deliberately gentle: the chain call uses
`mirrorOnChain()` which returns `null` on revert/timeout — the API
still returns `200`, the DB write stands, and the failure is logged
to console + the AuditLog metadata. Re-run the action manually if
needed.

USDC approval is granted lazily on first `createMarket` (max-uint256
to save gas on subsequent calls).

### What's NOT wired

User-facing actions (`buy`, `sell`, `claim`) need wallet-connect on the
client so users sign their own transactions — held back to keep this
chunk reviewable. Today user trades only hit the DB. Day 5 of the
Tier-2 plan adds the client-side signer; until then the chain has the
markets + resolutions but not the per-user share balances.

## Known gaps vs production

* **No oracle** — owner key resolves outcomes. Compromised key =
  arbitrary resolution.
* **No upgradability** — bugs require a fresh deploy + market migration.
* **No pause** — emergency stop relies on the off-chain layer refusing
  to surface markets.
* **No batch claim** — gas-expensive for users with many winning markets.
* **No share transfers** — peer-to-peer trading is intentionally
  excluded; users only trade against the AMM.
* **`question` stored on-chain** — for production, store a content
  hash and keep the long-form text in IPFS or the API.
