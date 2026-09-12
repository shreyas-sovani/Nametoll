# Nametoll — ETHOnline 2026 submission pack

**Form picks (locked):** Hedera · ENS · Chainlink  
**Off the ETHOnline form:** World and The Graph (Graph is merchandise only).  
**B16 Sunday record:** no swap. Swap paragraph is in `README.md` under “Sunday form swap (B16)”, written while that form line still named Hedera · ENS · Chainlink. Graph composition landed; Graph prize SKILL did not. World Selfie Check flag was not on. Chainlink simulate logs keep the third slot.  
**Repo:** https://github.com/shreyas-sovani/Nametoll (public)  
**Video:** 2–4 min, human voice, 720p. Record the README timestamp script. Do not speed the take.

Paste the checklists below into the partner forms. Each row names the README clock and the repo evidence. `join()` calldata still comes unsigned from the same CRE engine (`GET /desk/join`); the Sepolia wallet broadcast is `npm run join`. Harness stretch is the open PR below, not a Nametoll `.harness/` recipe.

---

## Hedera — AI

- [x] **Live URL, not localhost** — https://nonwaxing-xeromorphic-dagmar.ngrok-free.dev (session-scoped ngrok). Stable host: `PUBLIC_DESK_URL` + `Dockerfile`. Clock **0:15**.
- [x] **x402 v2 + Blocky402 facilitator** — unpaid `GET /desk/snapshot` is HTTP 402, `x402Version: 2`, asset `0.0.0`, tinybars, fee-payer `0.0.7162784` from live `GET https://api.testnet.blocky402.com/supported`. Clock **1:10**.
- [x] **Agent/platform paid at least once** — `npm run buyer -- <paste-a-name>`, `npm run agent -- <parent>`, or `/app` Pay. First settle https://hashscan.io/testnet/tx/0.0.7162784@1789065380.080315812 — buyer `0.0.10463842`, seller `0.0.10463755`, `100000` tinybars. TEE-gated `/app` replay (11 Sep, Brain simulate on the public desk): https://hashscan.io/testnet/tx/0.0.7162784@1789111350.366520040 — live Aave snapshot, HCS `lending-risk` `1 * 100000`. Clock **1:30**.
- [x] **HashScan tx + HCS topic id in README** — topic `0.0.10464309` · https://hashscan.io/testnet/topic/0.0.10464309 · Mirror https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10464309/messages. Clock **2:25**.
- [x] **Metering or refund (not only flat fee)** — `100000` tinybars × protocol count. 1 vs 2 = `100000` vs `200000` on HashScan + HCS. Unused remainder (Pinout shape): credit = settled tinybars, burn = delivered protocols, seller `TransferTransaction` refunds `prepaid − owed`. HCS fields `prepaidTinybars` / `refundTinybars` / `refundTx`. Live 1-protocol fail-soft (unpinned id, TEE allow under cap): settle https://hashscan.io/testnet/tx/0.0.7162784@1789114039.103448687 prepaid `100000`, delivered `0`, refund `100000` via https://hashscan.io/testnet/tx/0.0.10463755@1789114039.622724528 (seller `0.0.10463755` → buyer `0.0.10463842`). Clock **2:00**.
- [x] **Discovery / directory (extra points)** — `/desks` + `GET /desk/catalog?parent=nametoll.eth` list live children. `npm run agent -- nametoll.eth` discovers a child and pays it. Live sibling `agent-02.nametoll.eth` https://sepolia.etherscan.io/tx/0xd1f6f4faa9f11636fb64673ddfe6d458285e6cbf6ea79631c0d017c528c10454. Clock **0:15**.
- [x] **Scheduled Transactions (extra points)** — two executed `wait_for_expiry` slots: https://hashscan.io/testnet/tx/0.0.10463842@1789156008.769559934 and https://hashscan.io/testnet/tx/0.0.10463842@1789156009.185023222. `GET /desk/claim?schedule=` delivered live Aave and wrote `subscribe` bills on topic `0.0.10464309`. Plan on `/app#subscribe`.
- [x] **HTS / custom fees (extra points)** — TOLL `0.0.10483302` (fixed `100000` tinybar HBAR fee) https://hashscan.io/testnet/token/0.0.10483302. Blocky402 `/supported` lists Hedera `exact` with no asset list, so `/desk/snapshot` stays HBAR `0.0.0`. ERC-8004 / HCS-14 left out.
- [x] **Demo shows the paid request executing** — `/app` Pay or `npm run buyer`. Clock **1:30**.

Hedera form paste (one line each):

- Discovery: `/desks` + `npm run agent -- nametoll.eth` + sibling `agent-02.nametoll.eth` (https://sepolia.etherscan.io/tx/0xd1f6f4faa9f11636fb64673ddfe6d458285e6cbf6ea79631c0d017c528c10454).
- Scheduled: executed slot https://hashscan.io/testnet/tx/0.0.10463842@1789156008.769559934.
- HTS: TOLL `0.0.10483302` https://hashscan.io/testnet/token/0.0.10483302 (custom 100000 tinybar HBAR fee).

Hedera Harness stretch: open PR (not merged) https://github.com/hedera-dev/hedera-harness/pull/59 — `init` adopt no longer plants `yarn next:build` into an npm Express app. Follow-up: neutralized Scaffold-HBAR static assertions, persisted `constraints.packageManager`, per-file never-overwrite. Before/after table + tests on the PR. No `.harness/` in Nametoll. No harness demo video.

---

## ENS

- [x] **ENSv2 Sepolia, not v1** — parent `nametoll.eth`, child `desk.nametoll.eth`, sibling `agent-02.nametoll.eth`. Register https://sepolia.etherscan.io/tx/0x28ab9c164cca6f967413f944a3ef1f81ca3ef86f7e1620fdc5b7a57d8d7a8a96. Second desk https://sepolia.etherscan.io/tx/0xd1f6f4faa9f11636fb64673ddfe6d458285e6cbf6ea79631c0d017c528c10454. Clock **0:15**.
- [x] **Hierarchy or EAC or Permissioned Resolver demoed** — Permissioned Resolver `0x558283D5F8E36316B60be7e24F4e58C7133752D2`. Operator `0xFeAf5C921996FC53f4DEf35e181E766e6D74690A` has `ROLE_SET_TEXT` on `url` / `agent-context` / `agent-endpoint[web]` only; cannot transfer. Clock **0:35**.
- [x] **Expiring, revocable, non-transferable subnames** — `/register` optional `expiresIn` (60s–1y). Issuance writes `register(..., expires)`. Live expired child `gone.nametoll.eth` (90s): https://sepolia.etherscan.io/tx/0x44bbbd33adc88b3fb103eec45e2941ee4ad9eb14d8a0f446f738c7c2ac20d3ac — `getState` is `AVAILABLE`; `/desks` marks it unresolved. Operator cannot transfer (no registry transfer role).
- [x] **No hardcoded name/address on the happy path** — `/app`, `GET /desk/resolve?name=`, `GET /desk/inspect?name=`, `GET /desk/catalog?parent=`, `/desks`, `npm run buyer -- <name>`, and `npm run agent -- <parent>` take a pasted name. Tests forbid `.eth` on `/`. Clock **0:15**.
- [x] **Directory / second name** — `/desks` lists children of a pasted parent. `npm run ens:subname` issues a sibling with its own Permissioned Resolver + scoped EAC. Clock **0:15** / **0:35**.
- [x] **Video + live URL + public GitHub** — this file + README clock + https://github.com/shreyas-sovani/Nametoll + public desk URL.

---

## Chainlink

- [x] **`handlerInTee` / `HandlerInTee` in the repo** — `cre/nametoll-brain/workflow.ts` from official `hello-confidential-workflows-ts`. Clock **2:50**.
- [x] **`getSecret` inside the enclave** — `runtime.getSecret({ id: "SPEND_CAP" })`, plus optional `BUYER_ALLOWLIST` and `RATE_LIMIT`. Cap used in simulate: `150000` tinybars. Public reasons: under/over cap, buyer not allowlisted, rate limited.
- [x] **Feature does not work without that secret/threshold** — Gate asks Brain before Blocky402 settle. Deny or skipped TEE → HTTP **403**, no merchandise, no HCS bill (`test/gate-brain.test.ts`). Clock **0:50**.
- [x] **`cre workflow simulate` log (Nitro / us-west-2)** — `docs/partners/chainlink/simulate-allow.log` (`100000` allow) and `simulate-deny.log` (`200000` deny). Both show TEE Execution / AWS Nitro `us-west-2`. Clock **2:50**.
- [x] **Policy engine (not only cap)** — `simulate-allowlist-deny.log` (`buyer not allowlisted`, payer `0.0.9` vs allowlist `0.0.1`) and `simulate-rate-deny.log` (`rate limited`, `paysThisHour=2` vs `RATE_LIMIT=1`). Same Nitro `us-west-2` banner. Cap section on `/docs#cap`.
- [x] **Something user-visible or onchain changes because of the TEE verdict** — over-cap Pay stays locked on `/app`; under-cap can settle. Clock **0:50** and **1:10**.
- [x] **`join()` calldata if chasing $500** — same `nametoll-brain` HTTP `handlerInTee`. Payload `{ "action": "join" }` returns unsigned `join()` to official ChallengeLending `0x88574e7Cc0027afd04951daa09B64d4441931ba1` (live challenge README; `challengeOpen` true). Selector `0xb688a363`. Simulate: `docs/partners/chainlink/simulate-join.log`. `/app` join station / `GET /desk/join` stays unsigned. Broadcast: `npm run join` (same calldata, Sepolia owner `0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3`). **join() tx: 0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086** — https://sepolia.etherscan.io/tx/0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086 (`isUser` true, `numUsers` 6). Not `writeReport`. Not the cloned `automated-liquidation-protection` template. ETHOnline scrape `0x59d5B29F…` is a dead older deploy.
- [x] **No Functions / Automation** — Confidential Workflows only. No `ConfidentialHTTPClient` in the TEE handler.

---

## Recompute recipe (Hedera bill)

`GET` the Mirror Node topic URL, base64-decode each `message`, check `units * priceTinybarsPerUnit = tinybars`. If `prepaidTinybars` is present, `prepaidTinybars - tinybars = refundTinybars`. `PRICE_TINYBARS` is `100000`.
