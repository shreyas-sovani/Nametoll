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

Paid request (buyer key only — never the seller key). Pass a **name** (B8) or a desk URL (B2). This repo does not ship a name.

```bash
npm run buyer -- http://127.0.0.1:8787
npm run buyer -- http://127.0.0.1:8787 aave-v3-ethereum
npm run buyer -- <paste-a-name>
npm run directory -- <paste-a-name>
```

Resolve without paying:

```bash
curl -sS "http://127.0.0.1:8787/desk/resolve?name=<paste-a-name>"
```

A successful settle prints a HashScan URL (`https://hashscan.io/testnet/tx/<id>`). Live testnet settles and HCS bills are in `docs/working-notes.md`.

Live Graph check (needs `GRAPH_GATEWAY_KEY` in `.env`, never commit it):

```bash
npm run graph:probe
npm run graph:mcp
```

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

Recompute: `GET` the Mirror Node URL, base64-decode each `message`, then check `units * priceTinybarsPerUnit = tinybars`. `PRICE_TINYBARS` is `100000` per requested protocol. Default snapshot (Aave + Compound) is `2` units / `200000` tinybars. `?protocols=aave-v3-ethereum` is `1` / `100000`.

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
| `GRAPH_GATEWAY_KEY` | Subgraph Studio **query** API key (API Keys tab). Deploy keys and Token API keys are rejected. |
| `GRAPH_GATEWAY_URL` | Default `https://gateway.thegraph.com/api` |
| `HEDERA_BUYER_*` | Buyer signer only — never the seller key |
| `ENSNODE_URL` | ENSv2 Omnigraph, default `https://api.v2-sepolia.ensnode.io` |
| `ENS_OWNER_ADDRESS` / `ENS_OPERATOR_ADDRESS` | Public Sepolia addresses for unsigned `ens-cli` writes. Not keys. Not a name. |
| `CRE_SECRETS_PATH` / `HEDERA_BUYER_KEY_PATH` | Files on disk; values stay out of git |

Fee-payer is **not** configured here. The Gate reads it from live `GET /supported` (`0.0.7162784` on testnet as of the day-one probe).

## Status (11 Sep 2026)

**Done**

- **B0** six modules, config, health, `.env.example`
- **B1** unpaid 402 is x402 v2 / HBAR tinybars / Blocky402 fee-payer
- **B2** buyer paid through Blocky402; HashScan in `docs/working-notes.md`
- **B3** public 402 + paid request at the origin above (ngrok is session-scoped)
- **B4** HCS topic `0.0.10464309`; paid request appends a recomputable bill
- **B5** live Messari lending snapshot (Aave v3 + Compound III). One query shape, two pinned subgraphs. Schemas fetched via Subgraph MCP + Studio gateway introspection. Fail-soft if one indexer is down. Units = requested protocol count.
- **B6** 1 protocol = `100000` tinybars, 2 = `200000`. Live pays on HashScan + HCS (stub bills first, then live `lending-risk` bills).
- **B7/B8 (code)** Directory resolves a pasted name to `{ endpoint, payTo, priceRule, hcsTopic, asset: "0.0.0" }` from ENSIP-5/26 text records. Homepage form + `GET /desk/resolve`. Buyer `payFromName` 402s the resolved endpoint. Unsigned write plan: `npm run ens:writes`. See `docs/partners/ens/README.md`.

**Next**

- Human broadcasts the ENSv2 Sepolia txs from `npm run ens:writes` (then B7/B8 are live). Then **B9** CRE `handlerInTee`.

**Blockers (human, not code)**

- B7/B8 live name: funded Sepolia account + public `ENS_OWNER_ADDRESS` / `ENS_OPERATOR_ADDRESS`. Run `npm run ens:writes -- --parent <name-you-chose> --child desk`, then broadcast each unsigned `{to,data,value}`. Writes stay unsigned in this repo.
- B9: CRE login and the `cre` CLI so `cre workflow simulate` can produce a redacted log.
- Public judge URL: current ngrok origin dies when the local desk stops. Host `npm start` and set `PUBLIC_DESK_URL` for a stable link.
- Never commit `.env` (Graph key, Hedera keys).

**Not blockers**

- Graph Studio query key works. `npm run graph:probe` and `npm run graph:mcp` are green.
- Cursor Subgraph MCP in `.cursor/mcp.json` is optional; schemas were fetched over the official SSE MCP from this repo.

See `docs/PRD.md` and `docs/BACKLOG.md`.
