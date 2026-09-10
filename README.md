# Nametoll

Named pay desk for ETHOnline 2026. An agent pays a live desk it found by name:

```text
name (ENSv2) → TEE allow (CRE) → pay (Blocky402) → metered bytes → HCS bill
```

One app, six modules: **Directory**, **Gate**, **Brain**, **Merchandise**, **Ledger**, **Buyer**.

## Do not commit secrets

Copy `.env.example` to `.env` and fill names locally. Never commit `.env`, private keys, facilitator keys, CRE secrets, or Graph/World tokens. The resource server must **not** hold a Blocky402 facilitator private key.

## Run

```bash
npm install
cp .env.example .env
npm test
npm start
```

Health (no partner credentials required):

```bash
curl -s http://127.0.0.1:8787/health
```

Unpaid snapshot (x402 v2 challenge, amounts in tinybars, asset `0.0.0`):

```bash
curl -sD - -H 'Accept: application/json' http://127.0.0.1:8787/desk/snapshot
```

Paid request (buyer key only — never the seller key):

```bash
npm run buyer -- http://127.0.0.1:8787
```

A successful settle prints a HashScan URL (`https://hashscan.io/testnet/tx/<id>`). Live testnet settles and HCS bills are in `docs/working-notes.md`.

Create the bill topic once (seller key signs; prints `HCS_TOPIC_ID`, not a secret):

```bash
npm run topic:create
```

Put that id in `.env` as `HCS_TOPIC_ID`. After a paid request:

```bash
curl -sS http://127.0.0.1:8787/desk/ledger
```

## HCS bill (B4)

**Topic:** `0.0.10464309`  
**HashScan:** https://hashscan.io/testnet/topic/0.0.10464309  
**Mirror Node:** https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10464309/messages

Recompute: `GET` the Mirror Node URL, base64-decode each `message`, then check `units * priceTinybarsPerUnit = tinybars`. Until the meter lands, `priceTinybarsPerUnit` is `100000` and stub `units` is `1`.

HashScan of the HBAR transfer is the pay. The topic is the audit.

## Public desk

Localhost is not the demo target.

**Current public origin:** https://nonwaxing-xeromorphic-dagmar.ngrok-free.dev

```bash
curl -sS -D - -H 'Accept: application/json' -H 'ngrok-skip-browser-warning: 1' \
  https://nonwaxing-xeromorphic-dagmar.ngrok-free.dev/desk/snapshot
```

Expect HTTP 402 and a `PAYMENT-REQUIRED` header (`x402Version: 2`, asset `0.0.0`, tinybars, fee-payer from live Blocky402 `/supported`). Ngrok free may show an interstitial in a browser; API clients should send `ngrok-skip-browser-warning: 1`.

This tunnel dies when the local process stops. For a stable judge URL, host the same `npm start` (see `Dockerfile`) and set `PUBLIC_DESK_URL`.

## Config

| Name | Role |
| --- | --- |
| `X402_NETWORK` | CAIP-2 network, typically `hedera:testnet` |
| `FACILITATOR_URL` | Blocky402 testnet: `https://api.testnet.blocky402.com` |
| `HEDERA_SELLER_ACCOUNT_ID` | Desk `payTo` (Hedera account id, not an EVM address) |
| `HEDERA_SELLER_PRIVATE_KEY` | Seller signer for HCS submit only — never a facilitator key |
| `HCS_TOPIC_ID` | Ledger topic (`0.0.10464309` on testnet) |
| `MIRROR_NODE_URL` | Default `https://testnet.mirrornode.hedera.com` |
| `HEDERA_BUYER_*` | Buyer signer only — never the seller key |
| `CRE_SECRETS_PATH` / `HEDERA_BUYER_KEY_PATH` | Files on disk; values stay out of git |

Fee-payer is **not** configured here. The Gate reads it from live `GET /supported` (`0.0.7162784` on testnet as of the day-one probe).

## Ticket status

- **B0** done — six modules, config, health, `.env.example`
- **B1** done — unpaid 402 is x402 v2 / HBAR tinybars / Blocky402 fee-payer
- **B2** done — buyer paid through Blocky402; HashScan in `docs/working-notes.md`
- **B3** done — public 402 + paid request at the origin above (tunnel is session-scoped)
- **B4** done — HCS topic `0.0.10464309`; paid request appends a recomputable bill

Later: live Graph merchandise, ENSv2 directory, CRE TEE. See `docs/PRD.md` and `docs/BACKLOG.md`.
