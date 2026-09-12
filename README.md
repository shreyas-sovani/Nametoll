# Nametoll

Nametoll is a named pay desk. An agent is handed an ENSv2 name, not a URL and not an API key. A Chainlink CRE TEE decides whether that agent may spend. Hedera takes HBAR through Blocky402. The bill is on HCS so a stranger can recompute it. The desk sells live Aave + Compound lending snapshots; Graph is the merchandise, not a form pick.

**Form picks:** **Hedera** · **ENS** · **Chainlink**. Not on the form: World, The Graph.  
**Repo:** https://github.com/shreyas-sovani/Nametoll  
**Filled §9 checklists:** [`docs/submission.md`](docs/submission.md)  
**Judge walkthrough:** [`walkthrough.md`](walkthrough.md)  

AI agents wrote code in this repo. A human directed the product and will narrate the video.

```text
name (ENSv2) → TEE allow (CRE) → pay (Blocky402) → metered units → HCS bill
```

## Architecture

One app, six modules. Directory now includes the registry, guest session, and self-serve register.

| Module | Does | Depends on | Does not |
| --- | --- | --- | --- |
| **Directory** | Resolve name → desk descriptor. `/desks` + `GET /desk/catalog` list children. `/register` + `POST /desk/register` issue a child (label, endpoint, optional expiry; price/payTo stay this origin). Expired children resolve as unresolved. | ENSv2 Sepolia, Permissioned Resolver, Omnigraph (`LabelRegistered` if ENSNode transport fails) | Store funds or secrets; accept a judge-supplied price |
| **Directory · session** | `POST /desk/session` creates an in-memory ECDSA guest buyer and faucets 0.5 HBAR from the seller. Cookie `nametoll_guest`. Rate-limited with pay. | Hedera `AccountCreate` + `TransferTransaction` | Return the private key |
| **Gate** | HTTP 402 challenge, Blocky402 verify/settle, refuse if TEE denied | Blocky402 `/supported` | Hold a facilitator key |
| **Brain** | `handlerInTee`: secret cap + optional allowlist/rate → allow/deny | CRE simulate (deploy is beta) | `ConfidentialHTTPClient`; leak secrets |
| **Merchandise** | Live Aave v3 + Compound III snapshot; billable units = delivered protocols | Studio gateway, pinned subgraph ids | Be a Graph prize SKILL |
| **Ledger** | HCS bill + recompute. Optional TOLL custom-fee token + `wait_for_expiry` subscribe/claim | HCS, Mirror Node, HTS, ScheduleCreate | Change snapshot 402 off HBAR `0.0.0` |
| **Buyer** | Resolve → TEE → 402 → sign → receipt. Operator key, guest session, or `npm run agent -- <parent>` | Directory, Gate, Brain | Hardcode the name |

## Payment flow (live evidence)

1. **Discover.** Paste `nametoll.eth` on [`/desks`](https://nonwaxing-xeromorphic-dagmar.ngrok-free.dev/desks) or run `npm run agent -- nametoll.eth`. Catalog lists children (`desk.nametoll.eth`, `agent-02.nametoll.eth`). Expired `gone.nametoll.eth` is unresolved. Parent register: https://sepolia.etherscan.io/tx/0x28ab9c164cca6f967413f944a3ef1f81ca3ef86f7e1620fdc5b7a57d8d7a8a96
2. **Resolve.** Child texts: endpoint, payTo `0.0.10463755`, `100000` tinybars per protocol, HCS `0.0.10464309`, asset `0.0.0`. Permissioned Resolver `0x558283D5F8E36316B60be7e24F4e58C7133752D2`. Operator can edit those three keys only.
3. **TEE.** Gate asks Brain before settle. Cap `150000` tinybars. 1 protocol allows; 2 denies over cap. Allowlist/rate denials: [`simulate-allowlist-deny.log`](docs/partners/chainlink/simulate-allowlist-deny.log), [`simulate-rate-deny.log`](docs/partners/chainlink/simulate-rate-deny.log). Cap flip: [`simulate-allow.log`](docs/partners/chainlink/simulate-allow.log) / [`simulate-deny.log`](docs/partners/chainlink/simulate-deny.log). All show `handlerInTee` / AWS Nitro `us-west-2`.
4. **Pay.** Unpaid `GET /desk/snapshot` is HTTP 402, x402 v2 `exact`, tinybars, fee-payer `0.0.7162784`. TEE-gated settle: https://hashscan.io/testnet/tx/0.0.7162784@1789111350.366520040 — buyer `0.0.10463842` → seller `0.0.10463755`, `100000` tinybars. Guest pay uses `POST /desk/session` then `{ "payer": "guest" }`.
5. **Meter + remainder.** 1 vs 2 protocols = `100000` vs `200000`. Fail-soft refund: https://hashscan.io/testnet/tx/0.0.10463755@1789114039.622724528
6. **HCS bill.** Topic `0.0.10464309` — https://hashscan.io/testnet/topic/0.0.10464309 — Mirror https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10464309/messages. Recompute `units * priceTinybarsPerUnit = tinybars`.
7. **Subscribe / HTS (side rail).** TOLL `0.0.10483302` — https://hashscan.io/testnet/token/0.0.10483302. Executed slot: https://hashscan.io/testnet/tx/0.0.10463842@1789156008.769559934. Snapshot 402 stays `0.0.0`.

## Quickstart

```bash
npm install
cp .env.example .env
npm test
npm start
```

Health (no partner credentials):

```bash
curl -s http://127.0.0.1:8787/health
```

Pages: `/` landing · `/desks` registry · `/register` claim a child · `/app` pay console · `/docs` manual.

```bash
# Discover then pay (parent only — no hardcoded child)
npm run agent -- nametoll.eth

# Guest payer (cookie; JSON never includes the key)
curl -sS -X POST http://127.0.0.1:8787/desk/session
curl -sS -X POST http://127.0.0.1:8787/desk/pay \
  -H 'content-type: application/json' \
  -d '{"name":"desk.nametoll.eth","protocols":["aave-v3-ethereum"],"payer":"guest"}'

# Self-serve child (price/payTo fixed; optional expiry in seconds)
curl -sS -X POST http://127.0.0.1:8787/desk/register \
  -H 'content-type: application/json' \
  -d '{"label":"<paste-a-label>","expiresIn":90}'

# Catalog — expired names are unresolved
curl -sS "http://127.0.0.1:8787/desk/catalog?parent=nametoll.eth"

# Unpaid 402
curl -sD - -H 'Accept: application/json' http://127.0.0.1:8787/desk/snapshot
```

`POST /desk/pay` is rate-limited with `/desk/session` and `/desk/register`. Optional `DESK_PAY_SECRET` (cookie on product pages, or `x-desk-pay-secret`). Guest keys stay in memory.

More CLI: `npm run buyer -- <name>`, `npm run directory -- <name>`, `npm run subscribe -- --plan --slots 2 --interval-sec 120`, `npm run hts -- probe`, `npm run join -- --check`.

## Feature → evidence → partner

| Feature | Evidence | Partner |
| --- | --- | --- |
| Live x402 desk + paid request | Public origin below; settle https://hashscan.io/testnet/tx/0.0.7162784@1789111350.366520040 | Hedera AI |
| Meter + unused remainder | `100000` / `200000`; refund https://hashscan.io/testnet/tx/0.0.10463755@1789114039.622724528 | Hedera extra |
| HCS audit trail | Topic `0.0.10464309` https://hashscan.io/testnet/topic/0.0.10464309 | Hedera extra |
| Discovery directory + agent | `/desks`, `npm run agent -- nametoll.eth`, sibling `agent-02.nametoll.eth` | Hedera extra + ENS |
| Scheduled transactions | https://hashscan.io/testnet/tx/0.0.10463842@1789156008.769559934 · claim `/app#subscribe` | Hedera extra |
| HTS custom fee (TOLL) | Token `0.0.10483302` https://hashscan.io/testnet/token/0.0.10483302 | Hedera extra |
| Guest pay | `POST /desk/session` · `/app` payer toggle | Hedera (buyer) |
| ENSv2 hierarchy + EAC | `nametoll.eth` / `desk.nametoll.eth` / `agent-02.nametoll.eth`; operator text-only | ENS |
| Expiring subnames | `gone.nametoll.eth` 90s expiry, now `AVAILABLE`; register https://sepolia.etherscan.io/tx/0x44bbbd33adc88b3fb103eec45e2941ee4ad9eb14d8a0f446f738c7c2ac20d3ac | ENS |
| Self-serve register | `/register` · constrained price/payTo | ENS |
| TEE on the pay path | Deny → HTTP 403, no settle. Cap logs + policy logs below | Chainlink |
| Policy engine | [`simulate-allowlist-deny.log`](docs/partners/chainlink/simulate-allowlist-deny.log) · [`simulate-rate-deny.log`](docs/partners/chainlink/simulate-rate-deny.log) | Chainlink |
| `join()` challenge | https://sepolia.etherscan.io/tx/0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086 | Chainlink |
| Live lending snapshot | Aave v3 + Compound III, one Messari query, fail-soft | Graph (merchandise only) |

---

## Sunday form swap (B16)

This paragraph is the swap record. It was written while the form line above still named Hedera · ENS · Chainlink.

**Decision: no swap.** Third slot stays Chainlink.

| Candidate | Evidence (11 Sep 2026) | Form? |
| --- | --- | --- |
| **Chainlink** | `handlerInTee` simulate logs exist: `docs/partners/chainlink/simulate-allow.log`, `simulate-deny.log`, `simulate-join.log`. Policy denials: `simulate-allowlist-deny.log`, `simulate-rate-deny.log`. TEE gates Blocky402 settle (B9–B10). PRD: stay Chainlink if simulate logs exist. | **Yes** (third slot) |
| **The Graph** | B5 is real Messari composition: one lending query across Aave v3 + Compound III, pinned Studio ids, MCP schemas, fail-soft. That is merchandise. This repo did not ship a Graph prize SKILL (vendored `subgraph-dev` is upstream, not a Nametoll SKILL.md). Density tax. | No |
| **World** | Selfie Check flag was not on. No `@worldcoin/idkit`, no `selfieCheckLegacy`, no Developer Portal flag confirmation. Do not pick a corpse. | No |

ETHOnline still allows only three partner prizes. Hedera (pay + HCS) and ENS (the name) stay. Graph stays off the form as live data the desk sells. World stays off the form.

## Demo timestamps (2–4 min, ≥720p, human voice)

Record the desk at `/app` (public origin below). Landing is `/` and `/landing`. Registry is `/desks`. Manual is `/docs`. Paste a name. Do not bake one into the take.

| Clock | On camera | Qual |
| --- | --- | --- |
| 0:00 | Loop on screen: name → TEE → pay → meter → HCS | — |
| 0:15 | Paste a parent on `/desks` or a child on `/app`. Resolve shows endpoint, payTo, price, HCS topic | ENS live resolve + directory, no hardcoded name |
| 0:35 | Say: Permissioned Resolver + EAC operator can edit those three text keys only | ENS hierarchy / EAC |
| 0:50 | Meter = 2 protocols. Open desk. TEE deny / over cap. Pay locked | Chainlink verdict changes the path |
| 1:10 | Meter = 1 protocol. Open desk. TEE allow. Unpaid GET is HTTP 402 (Blocky402 / tinybars / `0.0.0`) | Hedera x402 v2 + Chainlink allow |
| 1:30 | Pay. Open HashScan settle (example: https://hashscan.io/testnet/tx/0.0.7162784@1789111350.366520040) | Hedera paid request, TEE on the path |
| 2:00 | Snapshot shows live Aave/Compound rows + TVL. Say 1 vs 2 protocols is `100000` vs `200000` tinybars on the 402. 2-protocol Pay stays locked (over cap). Station 06 remainder: fail-soft refund https://hashscan.io/testnet/tx/0.0.10463755@1789114039.622724528 | Hedera metering + unused remainder |
| 2:25 | Open HCS topic `0.0.10464309` (https://hashscan.io/testnet/topic/0.0.10464309). Recompute matches on `/desk/ledger` | Hedera HCS |
| 2:50 | Open `docs/partners/chainlink/simulate-allow.log` — `handlerInTee`, Nitro `us-west-2`, secret cap flips allow vs deny. Policy: `simulate-allowlist-deny.log` / `simulate-rate-deny.log` | Chainlink simulate |
| 3:05 | `/app` **TEE join()** unsigned calldata, then live Sepolia `join()` https://sepolia.etherscan.io/tx/0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086 | Chainlink challenge |
| 3:20 | End. Keep the file under 4:00 | — |

If a few seconds remain after 3:05, flash TOLL `0.0.10483302`, one executed schedule (https://hashscan.io/testnet/tx/0.0.10463842@1789156008.769559934), or expired child `gone.nametoll.eth`. Do not cut the pay-path clocks for it.

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
npm run buyer -- http://127.0.0.1:8787 not-a-real-protocol
npm run buyer -- <paste-a-name>
npm run agent -- <paste-a-parent-name>
npm run directory -- <paste-a-name>
npm run subscribe -- --plan --slots 2 --interval-sec 120
npm run hts -- probe
npm run join -- --check
npm run join
```

Resolve without paying:

```bash
curl -sS "http://127.0.0.1:8787/desk/resolve?name=<paste-a-name>"
```

Judge desk (B11) is `/app` in a desktop browser. Product page is `/` (same as `/landing`). Registry is `/desks`. Manual is `/docs`. Same loop over HTTP:

```bash
curl -sS "http://127.0.0.1:8787/desk/inspect?name=<paste-a-name>&protocols=aave-v3-ethereum"
curl -sS -X POST http://127.0.0.1:8787/desk/pay \
  -H 'content-type: application/json' \
  -H "x-desk-pay-secret: ${DESK_PAY_SECRET:-}" \
  -d '{"name":"<paste-a-name>","protocols":["aave-v3-ethereum"]}'
```

`GET /desk/inspect` stays open. `POST /desk/pay` spends the operator buyer key **or** a guest session (`{ "payer": "guest" }` after `POST /desk/session`). Both are rate-limited, optionally gated by `DESK_PAY_SECRET` (cookie on `/`, `/landing`, `/app`, `/desks`, `/docs`, `/register`, or the header above), and pinned to `PUBLIC_DESK_URL` when that is set. Empty `x-desk-pay-secret` is ignored unless the env var is set. Guest keys stay in memory; the JSON never includes them.

An agent that is handed only a **parent** namespace:

```bash
npm run agent -- <paste-a-parent-name>
```

It lists children from the Omnigraph, or from official `LabelRegistered` logs when hosted ENSNode TLS fails, picks a live desk by price/protocols, asks the TEE, pays, and prints the receipt. That is discover-then-pay. `GET /desk/catalog?parent=` and `/desks` are the same directory. Expired children are unresolved.

TEE verdicts are **cached per amount + payer + hour-count** for 60s (`GET /health` → `brain.verdictTtlMs`). Unavailable / simulate failures are not cached. Restart the desk for a fresh attested `cre workflow simulate`. The enclave still gates every amount the first time it is seen in that TTL. Policy secrets (cap, optional `BUYER_ALLOWLIST`, optional `RATE_LIMIT`) stay in the TEE; public reasons are `under cap` / `over cap` / `buyer not allowlisted` / `rate limited`. A successful HCS bill may carry `verdictReason` and `verdictHash` of that public verdict. Recompute is still `units * priceTinybarsPerUnit = tinybars`.

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
curl -sS -X POST http://127.0.0.1:8787/desk/session
curl -sS -X POST http://127.0.0.1:8787/desk/register \
  -H 'content-type: application/json' \
  -d '{"label":"<paste-a-label>","expiresIn":90}'
curl -sS "http://127.0.0.1:8787/desk/catalog?parent=<paste-a-parent-name>"
curl -sS http://127.0.0.1:8787/desk/offer
curl -sS "http://127.0.0.1:8787/desk/subscribe?slots=2&intervalSec=604800"
curl -sS http://127.0.0.1:8787/desk/hts
```

Put that id in `.env` as `HCS_TOPIC_ID`. After a paid request:

```bash
curl -sS http://127.0.0.1:8787/desk/ledger
```

## HCS bill (B4)

**Topic:** `0.0.10464309`  
**HashScan:** https://hashscan.io/testnet/topic/0.0.10464309  
**Mirror Node:** https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10464309/messages

Recompute: `GET` the Mirror Node URL, base64-decode each `message`, then check `units * priceTinybarsPerUnit = tinybars`. If `prepaidTinybars` is present, `prepaidTinybars - tinybars = refundTinybars`. `PRICE_TINYBARS` is `100000` per **delivered** protocol. Default snapshot (Aave + Compound) is `2` units / `200000` tinybars when both indexers respond. `?protocols=aave-v3-ethereum` is `1` / `100000`. Fail-soft (unpinned or indexer down) burns the delivered count and refunds unused prepaid tinybars to the payer. Live remainder (1 prepaid, 0 delivered): settle https://hashscan.io/testnet/tx/0.0.7162784@1789114039.103448687 · refund https://hashscan.io/testnet/tx/0.0.10463755@1789114039.622724528.

HashScan of the HBAR transfer is the pay. The topic is the audit.

## Live ENSv2 directory (B7)

**Parent** is the 2LD you register. **Child** is a label under that parent's UserRegistry.

| | |
| --- | --- |
| Parent | `nametoll.eth` |
| Child | `desk.nametoll.eth` |
| Second desk | `agent-02.nametoll.eth` — own Permissioned Resolver `0xe41Fab44355C6169af965C7994743625198561Da` (salt index 1) + scoped EAC. Register https://sepolia.etherscan.io/tx/0xd1f6f4faa9f11636fb64673ddfe6d458285e6cbf6ea79631c0d017c528c10454 |
| Expired child | `gone.nametoll.eth` — 90s bounded expiry, now `AVAILABLE` / unresolved on `/desks`. Register https://sepolia.etherscan.io/tx/0x44bbbd33adc88b3fb103eec45e2941ee4ad9eb14d8a0f446f738c7c2ac20d3ac |
| Owner | `0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3` |
| Operator (text keys only) | `0xFeAf5C921996FC53f4DEf35e181E766e6D74690A` |
| Permissioned Resolver | `0x558283D5F8E36316B60be7e24F4e58C7133752D2` |
| Parent UserRegistry | `0x0531cdfAa619d1Ce33B37e87AAcD685bEcd976B9` |
| Register tx | https://sepolia.etherscan.io/tx/0x28ab9c164cca6f967413f944a3ef1f81ca3ef86f7e1620fdc5b7a57d8d7a8a96 |

Buyer/homepage still take a pasted name. They do not default to `nametoll.eth`.

```bash
npm run directory -- nametoll.eth
curl -sS "http://127.0.0.1:8787/desk/resolve?name=nametoll.eth"
curl -sS "http://127.0.0.1:8787/desk/catalog?parent=nametoll.eth"
npm run buyer -- nametoll.eth
npm run agent -- nametoll.eth
npm run ens:subname -- --plan --parent nametoll.eth --label agent-02
npm run ens:subname -- --parent nametoll.eth --label gone --expires-in 90
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
| `HTS_TOKEN_ID` | Optional TOLL desk-credit token. Custom HBAR fee on transfers. Does not change snapshot 402 asset `0.0.0`. |

Fee-payer is **not** configured here. The Gate reads it from live `GET /supported` (`0.0.7162784` on testnet as of the day-one probe).

## Status (12 Sep 2026)

**Done**

- **B0** six modules, config, health, `.env.example`
- **B1** unpaid 402 is x402 v2 / HBAR tinybars / Blocky402 fee-payer
- **B2** buyer paid through Blocky402; HashScan in `docs/working-notes.md`
- **B3** public 402 + paid request at the origin above (ngrok is session-scoped)
- **B4** HCS topic `0.0.10464309`; paid request appends a recomputable bill
- **B5** live Messari lending snapshot (Aave v3 + Compound III). One query shape, two pinned subgraphs. Schemas fetched via Subgraph MCP + Studio gateway introspection. Fail-soft if one indexer is down. Units = requested protocol count.
- **B6** 1 protocol = `100000` tinybars, 2 = `200000`. Live pays on HashScan + HCS (stub bills first, then live `lending-risk` bills).
- **B7** live ENSv2 parent `nametoll.eth` and child `desk.nametoll.eth` on Sepolia. `/desks` + `GET /desk/catalog?parent=` list children and resolve each descriptor. `npm run ens:subname` issues a sibling with its own Permissioned Resolver + scoped EAC. Paste a name into `/app` or `GET /desk/resolve?name=`. Operator can edit the three desk text keys, cannot transfer the name.
- **B8** `npm run buyer -- nametoll.eth` resolves then 402s the **resolved** endpoint. Changing `agent-endpoint[web]` via the operator changes the next resolve without a buyer code change.
- **B9** CRE `handlerInTee` + `getSecret("SPEND_CAP")`, plus optional `BUYER_ALLOWLIST` and `RATE_LIMIT`. Distinct public reasons: under/over cap, buyer not allowlisted, rate limited. Official `hello-confidential-workflows-ts`. Redacted simulate logs: `docs/partners/chainlink/simulate-allow.log` (100000 under cap), `simulate-deny.log` (200000 over cap), `simulate-allowlist-deny.log`, `simulate-rate-deny.log`. No `ConfidentialHTTPClient`.
- **B10** Gate asks Brain before Blocky402 settle. Deny / skipped TEE → HTTP 403, no merchandise, no HCS bill. Allow → existing pay path. `GET /desk/brain?tinybars=` and `npm run brain -- 100000`.
- **B11** desk console on `/app` (product at `/` and `/landing`, registry at `/desks`, manual at `/docs`). Paste a name (none shipped). Open desk → descriptor + TEE reason + unpaid 402. Pay (server-side buyer keys) → snapshot + HashScan + HCS topic. Deny / empty / error banners. `GET /desk/inspect?name=` and `POST /desk/pay`. `npm run agent -- <parent>` discovers a child and pays it.
- **B12** submission pack: README timestamps → Hedera / ENS / Chainlink §9 lists in [`docs/submission.md`](docs/submission.md). Public repo. AI attributed. Form trio unchanged.
- **B13** unused-remainder refund (Pinout shape, one topic). Credit is the settled tinybars. Burn is delivered protocols. Seller HBAR `TransferTransaction` returns unused tinybars. HCS stores prepaid / owed / refund. `/app` remainder station. Live fail-soft: settle `0.0.7162784@1789114039.103448687`, refund `0.0.10463755@1789114039.622724528`. Not dual-topic HIP-991.
- **B14** harness DX: in-place `init` adopt planted Yarn/Next into this npm Express desk. Open PR https://github.com/hedera-dev/hedera-harness/pull/59 (target `dev`, not merged). Follow-up commit: Scaffold-HBAR static checks are dropped on npm adopt; `constraints.packageManager` is written; only newly written `.harness/` files are adapted. No `.harness/` in this repo. No harness demo video.
- **B15** same CRE HTTP TEE handler emits unsigned `join()` to live ChallengeLending `0x88574e7Cc0027afd04951daa09B64d4441931ba1`. Simulate log `docs/partners/chainlink/simulate-join.log`. `npm run join` broadcasts that calldata. **join() tx: 0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086**. Not `writeReport`. Not a cloned liquidation template.
- **B16** Sunday form swap evaluated. No swap. Form stays Hedera · ENS · Chainlink. Graph composition is merchandise, not a prize SKILL. World Selfie flag was not on.
- **Judge pass** public desk Brain was `TEE unavailable` (no `CRE_PROJECT_DIR`). Desk now defaults to `./cre` + `cre/.env`. Health reports `brain.source`. `/app` shows live protocol TVL, per-bill recompute, and unsigned `join()`. CI: `.github/workflows/test.yml`. Latest TEE-gated Aave pay: https://hashscan.io/testnet/tx/0.0.7162784@1789111350.366520040. Remainder refund: https://hashscan.io/testnet/tx/0.0.10463755@1789114039.622724528. Live `join()`: https://sepolia.etherscan.io/tx/0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086
- **Demo hardening** Brain caches successful verdicts per amount + payer + hour-count for 60s (unavailable is not cached; simulate killed at 25s; boot warms 1- and 2-unit). `POST /desk/pay` is rate-limited, optionally `DESK_PAY_SECRET`, and pinned to `PUBLIC_DESK_URL`. Pay omits the HCS bill block unless `settleTx` matches. Tagline is metered units.
- **B17** `/desks` + `GET /desk/catalog?parent=` + `npm run agent -- <parent>`. Omnigraph first; `LabelRegistered` fallback when ENSNode TLS/`fetch failed`. Hedera extra-points directory: an agent finds a service by namespace and pays for it.
- **B18** sibling `agent-02.nametoll.eth` — own Permissioned Resolver + scoped EAC. `npm run ens:subname`.
- **B19** TEE policy axes (cap / allowlist / rate). Optional CRE secret env vars default empty so cap-only simulate still boots. HCS may store `verdictReason` / `verdictHash`.
- **B20** TOLL `0.0.10483302` (custom `100000` tinybar HBAR fee) https://hashscan.io/testnet/token/0.0.10483302. Executed slots: https://hashscan.io/testnet/tx/0.0.10463842@1789156008.769559934 and https://hashscan.io/testnet/tx/0.0.10463842@1789156009.185023222. `GET /desk/claim` delivered live Aave and HCS `subscribe` bills. Snapshot 402 stays `0.0.0`. ERC-8004 left out.
- **B21** Guest session pay. `POST /desk/session` + `/app` payer toggle. HashScan settle can show the guest account. TEE/HCS see that payer id.
- **B22** `/register` issues a child that resells this desk. Label + endpoint vary; price and pay-to stay `config`. Set `ENS_PARENT`.
- **B23–B24** Claim + subscribe forms on `/app` and `/desks`. Landing Subscribe links `/app#subscribe`. Per-desk 402 pricing skipped.
- **B26** README restructured for the Hedera rubric (setup, architecture, payment flow). TEE policy simulate logs committed. `/register` optional `expiresIn`; live expired child `gone.nametoll.eth`. Hedera extra-points claimed as separate discovery / scheduled / HTS rows in `docs/submission.md`. Bazantic / ERC-8004 / A2A not built.

**Next**

- Record the 2–4 min video from the timestamp table. Host a stable `PUBLIC_DESK_URL` if the ngrok origin dies. Harness PR is open, not merged. No further spine tickets.

**Blockers (human, not code)**

- Public judge URL: current ngrok origin dies when the local desk stops. Host `npm start` and set `PUBLIC_DESK_URL` for a stable link.
- Never commit `.env` (Graph key, Hedera keys, Sepolia keys, CRE secrets).

**Not blockers**

- Public `/health` reports `brain.source: "simulate"`, `merchandise: "live"`, `canPay: true`. 1-protocol inspect allows; 2-protocol inspect denies over cap.
- Graph Studio query key works. `npm run graph:probe` and `npm run graph:mcp` are green.
- Cursor Subgraph MCP in `.cursor/mcp.json` is optional; schemas were fetched over the official SSE MCP from this repo.

See `docs/PRD.md` and `docs/BACKLOG.md`.
