# Nametoll

Named pay desk for ETHOnline 2026. An agent pays a live desk it found by name:

```text
name (ENSv2) → TEE allow (CRE) → pay (Blocky402) → metered bytes → HCS bill
```

**Form picks:** **Hedera** · **ENS** · **Chainlink**. Not on the form: World, The Graph.  
**Repo:** https://github.com/shreyas-sovani/Nametoll  
**Filled §9 checklists:** [`docs/submission.md`](docs/submission.md)  
AI agents wrote code in this repo. A human directed the product and will narrate the video.

## Sunday form swap (B16)

This paragraph is the swap record. It was written while the form line above still named Hedera · ENS · Chainlink.

**Decision: no swap.** Third slot stays Chainlink.

| Candidate | Evidence (11 Sep 2026) | Form? |
| --- | --- | --- |
| **Chainlink** | `handlerInTee` simulate logs exist: `docs/partners/chainlink/simulate-allow.log`, `simulate-deny.log`, `simulate-join.log`. TEE gates Blocky402 settle (B9–B10). PRD: stay Chainlink if simulate logs exist. | **Yes** (third slot) |
| **The Graph** | B5 is real Messari composition: one lending query across Aave v3 + Compound III, pinned Studio ids, MCP schemas, fail-soft. That is merchandise. This repo did not ship a Graph prize SKILL (vendored `subgraph-dev` is upstream, not a Nametoll SKILL.md). Density tax. | No |
| **World** | Selfie Check flag was not on. No `@worldcoin/idkit`, no `selfieCheckLegacy`, no Developer Portal flag confirmation. Do not pick a corpse. | No |

ETHOnline still allows only three partner prizes. Hedera (pay + HCS) and ENS (the name) stay. Graph stays off the form as live data the desk sells. World stays off the form.

One app, six modules: **Directory**, **Gate**, **Brain**, **Merchandise**, **Ledger**, **Buyer**.

## Demo timestamps (2–4 min, ≥720p, human voice)

Record the blotter at `/` (public origin below). Paste a name. Do not bake one into the take.

| Clock | On camera | Qual |
| --- | --- | --- |
| 0:00 | Loop on screen: name → TEE → pay → meter → HCS | — |
| 0:15 | Paste a name. Resolve shows endpoint, payTo, price, HCS topic | ENS live resolve, no hardcoded name |
| 0:35 | Say: Permissioned Resolver + EAC operator can edit those three text keys only | ENS hierarchy / EAC |
| 0:50 | Meter = 2 protocols. Open desk. TEE deny / over cap. Pay locked | Chainlink verdict changes the path |
| 1:10 | Meter = 1 protocol. Open desk. TEE allow. Unpaid GET is HTTP 402 (Blocky402 / tinybars / `0.0.0`) | Hedera x402 v2 + Chainlink allow |
| 1:30 | Pay. Open HashScan settle (example: https://hashscan.io/testnet/tx/0.0.7162784@1789111350.366520040) | Hedera paid request, TEE on the path |
| 2:00 | Snapshot shows live Aave/Compound rows + TVL. Say 1 vs 2 protocols is `100000` vs `200000` tinybars on the 402. 2-protocol Pay stays locked (over cap). Station 05 recompute `units * price = tinybars` | Hedera metering |
| 2:25 | Open HCS topic `0.0.10464309` (https://hashscan.io/testnet/topic/0.0.10464309). Recompute matches on `/desk/ledger` | Hedera HCS |
| 2:50 | Open `docs/partners/chainlink/simulate-allow.log` — `handlerInTee`, Nitro `us-west-2`, secret cap flips allow vs deny | Chainlink simulate |
| 3:05 | Blotter **TEE join()** — unsigned `join()` to `0x88574e7Cc0027afd04951daa09B64d4441931ba1`, say no broadcast | Chainlink challenge |
| 3:20 | End. Keep the file under 4:00 | — |

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

Judge blotter (B11) is `/` in a desktop browser. Same loop over HTTP:

```bash
curl -sS "http://127.0.0.1:8787/desk/inspect?name=<paste-a-name>&protocols=aave-v3-ethereum"
curl -sS -X POST http://127.0.0.1:8787/desk/pay \
  -H 'content-type: application/json' \
  -d '{"name":"<paste-a-name>","protocols":["aave-v3-ethereum"]}'
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

CRE Brain (needs `cre` on PATH and `cre login` for simulate):

```bash
npm run brain -- 100000
npm run cre:simulate
curl -sS "http://127.0.0.1:8787/desk/brain?tinybars=100000"
```

Put that id in `.env` as `HCS_TOPIC_ID`. After a paid request:

```bash
curl -sS http://127.0.0.1:8787/desk/ledger
```

## HCS bill (B4)

**Topic:** `0.0.10464309`  
**HashScan:** https://hashscan.io/testnet/topic/0.0.10464309  
**Mirror Node:** https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10464309/messages

Recompute: `GET` the Mirror Node URL, base64-decode each `message`, then check `units * priceTinybarsPerUnit = tinybars`. If `prepaidTinybars` is present, `prepaidTinybars - tinybars = refundTinybars`. `PRICE_TINYBARS` is `100000` per **delivered** protocol. Default snapshot (Aave + Compound) is `2` units / `200000` tinybars when both indexers respond. `?protocols=aave-v3-ethereum` is `1` / `100000`. Fail-soft (one indexer down) burns the delivered count and refunds the unused prepaid tinybars to the payer.

HashScan of the HBAR transfer is the pay. The topic is the audit.

## Live ENSv2 directory (B7)

**Parent** is the 2LD you register. **Child** is a label under that parent's UserRegistry.

| | |
| --- | --- |
| Parent | `nametoll.eth` |
| Child | `desk.nametoll.eth` |
| Owner | `0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3` |
| Operator (text keys only) | `0xFeAf5C921996FC53f4DEf35e181E766e6D74690A` |
| Permissioned Resolver | `0x558283D5F8E36316B60be7e24F4e58C7133752D2` |
| Parent UserRegistry | `0x0531cdfAa619d1Ce33B37e87AAcD685bEcd976B9` |
| Register tx | https://sepolia.etherscan.io/tx/0x28ab9c164cca6f967413f944a3ef1f81ca3ef86f7e1620fdc5b7a57d8d7a8a96 |

Buyer/homepage still take a pasted name. They do not default to `nametoll.eth`.

```bash
npm run directory -- nametoll.eth
curl -sS "http://127.0.0.1:8787/desk/resolve?name=nametoll.eth"
npm run buyer -- nametoll.eth
```

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
| `ENS_OWNER_ADDRESS` / `ENS_OPERATOR_ADDRESS` | Public Sepolia addresses for ENSv2 writes. Not keys. Not a name. |
| `ACC_1_PRIV_KEY` / `ACC3_PRIV_KEY` | Testnet-only Sepolia keys for `npm run ens:sepolia`. Never commit. |
| `ETH_RPC_URL` | Optional Sepolia RPC for those writes |
| `CRE_SECRETS_PATH` / `HEDERA_BUYER_KEY_PATH` | Files on disk; values stay out of git |
| `CRE_BRAIN_URL` | Live CRE HTTP trigger. If unset, paid snapshots 403 unless `CRE_PROJECT_DIR` is set |
| `CRE_PROJECT_DIR` / `CRE_WORKFLOW_NAME` / `CRE_TARGET` | Simulate backend. Target defaults to `staging-settings`. Workflow name defaults to `nametoll-brain`. If unset, the desk uses `./cre` when `cre/project.yaml` exists. |

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
- **B7** live ENSv2 parent `nametoll.eth` and child `desk.nametoll.eth` on Sepolia. Paste either into the homepage form or `GET /desk/resolve?name=`. Permissioned Resolver + EAC (operator can edit the three desk text keys, cannot transfer the name).
- **B8** `npm run buyer -- nametoll.eth` resolves then 402s the **resolved** endpoint. Changing `agent-endpoint[web]` via the operator changes the next resolve without a buyer code change.
- **B9** CRE `handlerInTee` + `getSecret("SPEND_CAP")`. Official `hello-confidential-workflows-ts`. Redacted simulate logs: `docs/partners/chainlink/simulate-allow.log` (100000 under cap) and `simulate-deny.log` (200000 over cap). No `ConfidentialHTTPClient`.
- **B10** Gate asks Brain before Blocky402 settle. Deny / skipped TEE → HTTP 403, no merchandise, no HCS bill. Allow → existing pay path. `GET /desk/brain?tinybars=` and `npm run brain -- 100000`.
- **B11** judge / operator blotter on `/`. Paste a name (none shipped). Open desk → descriptor + TEE reason + unpaid 402. Pay (server-side buyer keys) → snapshot + HashScan + HCS topic. Deny / empty / error banners. `GET /desk/inspect?name=` and `POST /desk/pay`.
- **B12** submission pack: README timestamps → Hedera / ENS / Chainlink §9 lists in [`docs/submission.md`](docs/submission.md). Public repo. AI attributed. Form trio unchanged.
- **B13** unused-remainder refund (Pinout shape, one topic). Credit is the settled tinybars. Burn is delivered protocols. Seller HBAR `TransferTransaction` returns unused tinybars. HCS stores prepaid / owed / refund. Blotter station 06. Not dual-topic HIP-991.
- **B14** harness DX: in-place `init` adopt planted Yarn/Next into this npm Express desk. Open PR https://github.com/hedera-dev/hedera-harness/pull/59 (target `dev`, not merged). Follow-up commit: Scaffold-HBAR static checks are dropped on npm adopt; `constraints.packageManager` is written; only newly written `.harness/` files are adapted. No `.harness/` in this repo. No harness demo video.
- **B15** same CRE HTTP TEE handler emits unsigned `join()` to live ChallengeLending `0x88574e7Cc0027afd04951daa09B64d4441931ba1`. Simulate log `docs/partners/chainlink/simulate-join.log`. Not `writeReport`. Not a cloned liquidation template. No join tx broadcast.
- **B16** Sunday form swap evaluated. No swap. Form stays Hedera · ENS · Chainlink. Graph composition is merchandise, not a prize SKILL. World Selfie flag was not on.
- **Judge pass** public desk Brain was `TEE unavailable` (no `CRE_PROJECT_DIR`). Desk now defaults to `./cre` + `cre/.env`. Health reports `brain.source`. Blotter shows live protocol TVL, per-bill recompute, and unsigned `join()`. CI: `.github/workflows/test.yml`. Latest TEE-gated pay: https://hashscan.io/testnet/tx/0.0.7162784@1789111350.366520040

**Next**

- Record the 2–4 min video from the timestamp table. Host a stable `PUBLIC_DESK_URL` if the ngrok origin dies. Harness PR is open, not merged. No further spine tickets.

**Blockers (human, not code)**

- Public judge URL: current ngrok origin dies when the local desk stops. Host `npm start` and set `PUBLIC_DESK_URL` for a stable link.
- Live `join()` on Sepolia: a wallet must broadcast the unsigned calldata. The CRE handler does not hold `CRE_ETH_PRIVATE_KEY`.
- Never commit `.env` (Graph key, Hedera keys, Sepolia keys, CRE secrets).

**Not blockers**

- Public `/health` reports `brain.source: "simulate"`, `merchandise: "live"`, `canPay: true`. 1-protocol inspect allows; 2-protocol inspect denies over cap.
- Graph Studio query key works. `npm run graph:probe` and `npm run graph:mcp` are green.
- Cursor Subgraph MCP in `.cursor/mcp.json` is optional; schemas were fetched over the official SSE MCP from this repo.

See `docs/PRD.md` and `docs/BACKLOG.md`.
