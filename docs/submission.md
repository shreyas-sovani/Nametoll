# Nametoll — ETHOnline 2026 submission pack

**Form picks (locked):** Hedera · ENS · Chainlink  
**Off the ETHOnline form:** World and The Graph (Graph is merchandise only).  
**B16 Sunday record:** no swap. Swap paragraph is in `README.md` under “Sunday form swap (B16)”, written while that form line still named Hedera · ENS · Chainlink. Graph composition landed; Graph prize SKILL did not. World Selfie Check flag was not on. Chainlink simulate logs keep the third slot.  
**Repo:** https://github.com/shreyas-sovani/Nametoll (public)  
**Video:** 2–4 min, human voice, 720p. Record the README timestamp script. Do not speed the take.

Paste the checklists below into the partner forms. Each row names the README clock and the repo evidence. `join()` calldata still comes unsigned from the same CRE engine (`GET /desk/join`); the Sepolia wallet broadcast is `npm run join`. Harness stretch is the open PR below, not a Nametoll `.harness/` recipe.

---

## Hedera — AI

- [x] **Live URL, not localhost** — https://nametoll.run.place (`PUBLIC_DESK_URL` + `Dockerfile`). Clock **0:15**.
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

---

ETHONLINE PLATFORM FORM
Paste the three blocks below into ethglobal.com as-is. They are plain text (no markdown). Sourced from the shipped repo, README, docs/PRD.md, docs/analysis.md, and live explorer evidence as of 12 Sep 2026. Form picks: Hedera, ENS, Chainlink.

SHORT DESCRIPTION
(max 100 characters, including spaces)

Agents pay a desk they found by name. TEE gates spend. Hedera bills on HCS.

DESCRIPTION
(min 280 characters; this is the long project writeup)

Nametoll is a named pay desk. An agent is handed an ENSv2 name, not a URL and not an API key. A Chainlink CRE confidential workflow decides, inside a TEE, whether that agent may spend. Hedera takes HBAR through Blocky402. The bill is written to HCS so anyone can recompute it from the Mirror Node. The desk sells a live lending-risk snapshot (Aave v3 plus Compound III). The Graph is the merchandise, not a prize slot.

The problem is the one Hedera, ENS, and Chainlink each named this year. Agents that buy data still get an API key, a hardcoded host, and a subscription. Hedera said x402 on Hedera is short of actual services you can pay for. ENS pays for names that are the directory, not a .eth sticker. Chainlink disqualifies a TEE that is not on the hot path. Nametoll is one loop that is all three constraints: name, then TEE allow, then pay, then metered units, then an HCS bill.

ENS is the address book. nametoll.eth is a live ENSv2 parent on Sepolia. Children desk.nametoll.eth and agent-02.nametoll.eth sit under that parent UserRegistry. Each desk holds a Permissioned Resolver. Documented text keys only (url, agent-context, agent-endpoint[web]) publish the HTTP origin, Hedera pay-to account, price rule, HCS topic, and HBAR asset 0.0.0. An operator account has ROLE_SET_TEXT on those three keys and has no registry transfer role, so the name is non-transferable from the hot wallet. /register issues a new child that resells this desk; the label and endpoint vary, price and pay-to stay this origin. Optional expiresIn writes a bounded ENSv2 expiry (60 seconds to 1 year). gone.nametoll.eth was registered for 90 seconds; on-chain state is now AVAILABLE and /desks marks it unresolved. No happy-path page ships a baked-in name. A judge pastes a parent on /desks, or runs npm run agent -- nametoll.eth, and an agent discovers a live child and pays it.

Chainlink is the spend rule the agent cannot read. Before any Blocky402 settle, the desk asks nametoll-brain. That workflow is handlerInTee from the official hello-confidential-workflows-ts scaffold. getSecret loads SPEND_CAP plus optional BUYER_ALLOWLIST and RATE_LIMIT inside the enclave. Public reasons are under cap, over cap, buyer not allowlisted, or rate limited. The secret never leaves the TEE. Deny, or a skipped TEE, is HTTP 403: no settle, no snapshot, no HCS bill. The live cap is 150000 tinybars, so one protocol (100000) allows and two (200000) deny on camera. Four cre workflow simulate logs in the repo show AWS Nitro us-west-2: allow, over-cap deny, allowlist deny, and rate deny. The same HTTP TEE handler also emits unsigned join() calldata for the official ChallengeLending contract on Sepolia; that join is already on-chain. Functions and Automation are not used.

Hedera is the paid service, not a gas poster. Unpaid GET /desk/snapshot is HTTP 402, x402 v2 exact, amounts in tinybars, asset 0.0.0, fee-payer 0.0.7162784 read live from Blocky402 GET /supported. The resource server holds no facilitator key. An operator buyer or a guest session (POST /desk/session creates a Hedera ECDSA account and faucets 0.05 HBAR; the private key never appears in JSON) completes a real paid request. Price is metered: 1 protocol is 100000 tinybars, 2 is 200000. If an indexer is down the desk fail-softs, burns only delivered units, and the seller refunds unused prepaid HBAR on a TransferTransaction. Those prepaid, owed, and refund amounts are on the same HCS topic (0.0.10464309). A stranger GET the Mirror Node, base64-decodes each message, and checks units times priceTinybarsPerUnit. Extra Hedera rails landed without moving the 402 off HBAR: TOLL (0.0.10483302) is an HTS token with a 100000-tinybar custom HBAR fee, and two wait_for_expiry scheduled slots have executed and been claimed for live Aave plus a subscribe bill.

Live evidence: public desk at https://nametoll.run.place. TEE-gated settle https://hashscan.io/testnet/tx/0.0.7162784@1789111350.366520040. Remainder refund https://hashscan.io/testnet/tx/0.0.10463755@1789114039.622724528. HCS topic https://hashscan.io/testnet/topic/0.0.10464309. Parent register https://sepolia.etherscan.io/tx/0x28ab9c164cca6f967413f944a3ef1f81ca3ef86f7e1620fdc5b7a57d8d7a8a96. Sibling https://sepolia.etherscan.io/tx/0xd1f6f4faa9f11636fb64673ddfe6d458285e6cbf6ea79631c0d017c528c10454. Expired child https://sepolia.etherscan.io/tx/0x44bbbd33adc88b3fb103eec45e2941ee4ad9eb14d8a0f446f738c7c2ac20d3ac. ChallengeLending join() https://sepolia.etherscan.io/tx/0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086. Repo https://github.com/shreyas-sovani/Nametoll

HOW IT'S MADE
(min 280 characters; stack, partner wiring, and the notable hacks)

Nametoll is one Node and TypeScript Express app, not a collage of demos. Six modules share stable interfaces: Directory (resolve a pasted name, list children, register a constrained child, guest session), Gate (402, Blocky402 verify and settle, refuse a TEE deny), Brain (CRE handlerInTee verdict), Merchandise (live Graph snapshot, billable units), Ledger (HCS bill, optional HTS and schedules), Buyer (resolve, ask TEE, pay, print HashScan and topic). Tests assert those observables. CI is .github/workflows/test.yml. The UI is /, /desks, /register, /app, and /docs. Official partner skills, MCP ids, and llms.txt were the only APIs; if a symbol was not in a skill or the live docs it was not invented.

Directory is ENSv2 on Sepolia, not mainnet v1. Writes use the official ens-cli ABIs and addresses; ens-cli emits unsigned {to, data, value} and npm run ens:sepolia broadcasts. The owner Permissioned Resolver was deployed before register so the name never sat on a zero resolver. EAC authorizeTextRoles is scoped to the three desk text keys. Catalog prefers the hosted Omnigraph at api.v2-sepolia.ensnode.io. That host currently serves a Railway certificate Node refuses, so resolve falls through to the official Sepolia Universal Resolver (0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe) and listChildNames walks getSubregistry plus LabelRegistered logs on the parent UserRegistry. That fallback is why /desks still lists children when the indexer TLS dies. /register calls the same issueDeskChild path; expiresIn becomes register(..., expires). After expiry, getState is AVAILABLE.

Gate never holds a Blocky402 facilitator key. It reads the fee-payer from live GET https://api.testnet.blocky402.com/supported, returns x402 v2 PAYMENT-REQUIRED, then verify plus settle. payTo is a Hedera account id (0.0.10463755), not an EVM address. Amounts are tinybars. @hiero-ledger signs AccountCreate (guest buyer), TransferTransaction (0.05 HBAR faucet and unused-remainder refund), HCS submit, HTS token create, and ScheduleCreate wait_for_expiry. Guest keys stay in process memory; JSON never includes them. POST /desk/pay is rate-limited with /desk/session and /desk/register, optionally gated by DESK_PAY_SECRET, and pinned to PUBLIC_DESK_URL when that is set.

Brain lives in cre/nametoll-brain, scaffolded with cre init -t hello-confidential-workflows-ts. The HTTP trigger runs inside TeeRuntime. Secrets come from runtime.getSecret. HTTP inside the TEE uses HTTPClient only; ConfidentialHTTPClient is not mixed into a TEE handler (that mix is a documented DQ). Live CRE deploy is private beta, so the public desk runs cre workflow simulate against staging-settings and caches a successful verdict per amount plus payer plus hour-count for 60 seconds. Failures and timeouts are not cached. Boot warms the 1-unit and 2-unit amounts so a judge is not sitting on a cold 9-second simulate. Policy evidence is four redacted Nitro us-west-2 logs: simulate-allow.log, simulate-deny.log, simulate-allowlist-deny.log, simulate-rate-deny.log. The same handler accepts { action: join } and returns unsigned join() to official ChallengeLending 0x88574e7Cc0027afd04951daa09B64d4441931ba1 (the live challenge contract; the ETHOnline scrape address is a dead older deploy). npm run join broadcasts that calldata. Selector 0xb688a363; isUser is true.

Merchandise is one Messari-shaped lending query across two pinned Studio deployments (Aave v3 Ethereum and Compound III). Schemas were fetched through The Graph Subgraph MCP, not invented. Units billed equal delivered protocols. Fail-soft returns the live rows and lets Ledger refund the rest. Graph stays off the form.

Ledger appends JSON to HCS topic 0.0.10464309. Recompute is units times priceTinybarsPerUnit (100000). Remainder fields (prepaidTinybars, refundTinybars, refundTx) follow the Pinout metering shape on one topic, not dual-topic HIP-991. Subscribe and claim are a side rail: TOLL 0.0.10483302 (custom 100000-tinybar HBAR fee) plus two executed wait_for_expiry slots that delivered live Aave and wrote subscribe bills. Snapshot 402 stays asset 0.0.0 because Blocky402 /supported lists Hedera exact with no HTS asset list.

Notable and slightly hacky, on purpose. Hosted ENSNode TLS forced the Universal Resolver plus LabelRegistered catalog fallback so discovery did not depend on a broken cert. Unused remainder is a seller CryptoTransfer, not a second 402 scheme, because Blocky402 testnet is exact-only. The public-desk TEE is attested simulate, not a mainnet DON deploy (Confidential Workflows deploy is still enrollment-gated); missing simulate fails closed with HTTP 403. We opened hedera-dev/hedera-harness pull request 59 after in-place init adopt planted Yarn and Next into this npm Express app; Nametoll has no .harness folder. We did not build ERC-8004, HCS-14, A2A, World Selfie Check, or a Graph prize SKILL. Those would have been stickers. The product is the loop a judge can paste, pay, and recompute.
