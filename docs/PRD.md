# Nametoll — PRD

**Event:** ETHOnline 2026 · Start Fresh  
**Submit:** Sunday 13 September 2026, 12:00pm EDT  
**Form picks (locked):** Hedera · ENS · Chainlink  
**Not on the form:** World, The Graph, everyone else  
**Sunday (B16):** no swap. Simulate logs exist, so Chainlink stays. Graph is merchandise without a prize SKILL. World Selfie flag was not on.  
**Live 12 Sep 2026:** TEE-gated pay, unused-remainder refund, and ChallengeLending `join()` are on explorers (`docs/submission.md`). Directory is `/desks`; agent discovers under a parent (`npm run agent`). Second live name `agent-02.nametoll.eth` has its own Permissioned Resolver. Guest session pay (`POST /desk/session`) and `/register` (constrained child records + optional `expiresIn`). Expired child `gone.nametoll.eth` is unresolved on `/desks`. Claim + subscribe forms on `/app`. TEE policy simulate logs for allowlist/rate. P3: TOLL custom-fee token + scheduled `wait_for_expiry` slots; Blocky402 `/supported` does not advertise HTS, so snapshot 402 stays `0.0.0`. Human remaining: 2–4 min video and a stable `PUBLIC_DESK_URL`.  

Nametoll is a **named pay desk**. An agent resolves a live ENSv2 name, a CRE TEE decides whether it may spend, Hedera takes HBAR through Blocky402, and the bill is on HCS. Graph data is the merchandise, not a prize slot.

Partner primitives are product constraints, not stickers. Official surfaces only: Hedera x402 + HCS (`docs/partners/README.md`, `x402-payments`, Blocky402), ENSv2 Sepolia (Permissioned Resolver / EAC / hierarchy), CRE `handlerInTee` + `cre workflow simulate`. If a symbol is not in the skill or live docs, it does not exist.

---

## Problem

Agents that buy data today get an API key, a hardcoded URL, and a subscription. There is no portable name for the desk, no private spend rule the agent cannot read, and no public bill a third party can recompute.

Hedera’s 2026 AI track is explicit: x402 on Hedera is short of **services you can pay for**. ENS pays for names that *are* the directory, not `.eth` labels. Chainlink DQs a TEE that does not sit on the hot path.

**Users**

- Buyer agent — needs a live lending-risk snapshot, can pay per request.
- Desk operator — owns the parent name, sets price and endpoint, must not hand the whole name to a hot wallet.

---

## Solution (the one loop)

This is the product. If a feature is not on this path, it is an explore window or out of scope.

1. Agent is given an ENSv2 name (typed or pasted — **never hardcoded** on the happy path).
2. Resolve on Sepolia → endpoint, price rule, HCS topic, pay-to account.
3. `GET` the desk. No payment → HTTP 402.
4. CRE `handlerInTee` loads a secret spend cap plus optional allowlist / rate (and the data-plane credential). Returns allow / deny / max tinybars. Deny → no settle.
5. Agent signs x402 v2 `exact` HBAR. Blocky402 `verify` + `settle`. Fee-payer from `GET /supported`.
6. Desk runs a live multi-protocol lending snapshot. Price scales with protocol count — not a flat fee.
7. Bill on HCS. README links HashScan settle + topic id. Judge can recompute from Mirror Node.

```text
name (ENSv2) → TEE allow (CRE) → pay (Blocky402) → metered units → HCS bill
```

---

## What we are building

| Piece | Must be true |
|---|---|
| Live desk | Public URL. Localhost dies in async judging. |
| Hedera pay | x402 v2 `exact`, asset `0.0.0`, amounts in tinybars, facilitator `https://api.testnet.blocky402.com`. Resource server holds no facilitator key. |
| Consuming agent | Completes one real paid request on camera. |
| Metering | Second request can cost more. Pinout/Tally shape (meter + optional unused remainder), not the official flat `$0.001` PoC. |
| HCS receipt | Topic id in README. Bill recomputable from Mirror Node. |
| ENSv2 | Sepolia. Hierarchy or wildcard off the parent. Permissioned Resolver holds endpoint / price / topic. EAC: operator edits those records only. Live resolve in the video. |
| CRE | `handlerInTee` + `getSecret` inside the enclave. Verdict **changes whether money moves**. `cre workflow simulate` log in the repo. HTTP inside TEE uses `HTTPClient` + `TeeRuntime` only — never `ConfidentialHTTPClient`. |
| Merchandise | Live Graph / Standardized lending query across **more than one** protocol. Pin real deployment IDs. Fail-soft if an indexer is down. Do not invent entities. |

---

## What we are not building

- Inference marketplace / OpenRouter-on-Hedera (AgentRouter lost the Hedera AI purse).
- Official PoC with a new landing page.
- World / Selfie Check / AgentKit as a prize path.
- Graph as a **form** pick unless Saturday composition is clearly load-bearing (then it is a form swap, not a second app).
- ATS, Continuity tracks, Uniswap, Privy, Arc, Ledger, Bazantic, 1inch SwapVM.
- Mainnet CRE deploy. Functions / Automation.
- ERC-8004 / HCS-14 / A2A / UCP as MVP.
- Cosmetic `.eth`, hardcoded names, mocked Graph rows, placeholder TEE.

---

## Modules

Deep modules. Stable interfaces. Internals can change without rewriting the demo.

| Module | Does | Depends on | Does not |
|---|---|---|---|
| **Directory** | Resolve name → desk descriptor. List children of a pasted parent (`/desks`, `GET /desk/catalog`). `/register` issues a child that resells this desk (optional bounded expiry). Expired names resolve unresolved. Guest session is a Directory/Buyer edge (`POST /desk/session`). Operator updates via EAC. | ENSv2 Sepolia, Permissioned Resolver, Omnigraph (registry `LabelRegistered` if ENSNode transport fails) | Store funds or secrets; accept a judge-supplied price |
| **Gate** | 402 challenge, verify/settle via Blocky402, refuse if TEE denied or meter unpaid | Gate client, Blocky402 `/supported` | Hold facilitator keys |
| **Brain** | `handlerInTee`: secret cap + optional allowlist/rate → allow/deny/max tinybars | CRE simulate (deploy is beta) | `ConfidentialHTTPClient`; leak secrets through `usingTheDons()` |
| **Merchandise** | Live multi-protocol snapshot; report billable units | Studio / Market key, pinned IDs | Be the product if Graph is not on the form |
| **Ledger** | Append bill; expose HashScan + recompute recipe. Optional TOLL custom-fee token + `wait_for_expiry` subscribe/claim | HCS + Mirror Node + HTS/ScheduleCreate | Be the Blocky402 rail (snapshot 402 stays HBAR) |
| **Buyer** | Resolve → 402 → sign → retry → show data + receipt. Operator key or guest session. Or `npm run agent -- <parent>` (enumerate → pick → pay) | Directory, Gate | Hardcode the name; leak guest keys |

**Interfaces (stable)**

- Desk descriptor: `{ endpoint, payTo, priceRule, hcsTopic, asset: "0.0.0" }` from live resolve.
- Brain verdict: `{ allow, maxTinybars, reason }` — public reasons include under/over cap, buyer not allowlisted, rate limited. Secrets stay in the enclave.
- Bill: `{ requestId, name, units, tinybars, settleTx, consensusTime }` on HCS. Optional `prepaidTinybars` / `refundTinybars` / `refundTx`, `verdictReason` / `verdictHash`, `scheduleId`.
- Buyer never receives the data-plane credential.

---

## Explore windows

Locked: the loop and the three partners. Unlocked: how we implement a step if the first path is worse or blocked. Pick one option per window; do not build all of them.

| Window | Default | Also valid | Kill if |
|---|---|---|---|
| **What we sell** | Messari-shaped lending snapshot, ≥2 protocols | Any live metered data that is not inference-as-a-market | Flat fee, mocked rows, single decorative subgraph |
| **Meter unit** | Protocol count in the request | Response bytes; session with unused remainder refunded (Pinout) | Only `$0.001` per GET |
| **ENS shape** | Parent + children, wildcard, Permissioned Resolver, one EAC grant | Own subregistry if `ens-cli` + Sepolia landmines allow | Hardcoded name; v1 NameWrapper path |
| **ENS records** | Text records for endpoint, price, topic (keys from live ENSv2 / ENSIP-26 docs only) | ENSIP-25/26 agent records if they drop out of the resolver for free | Invented record names |
| **TEE trigger** | HTTP trigger into `handlerInTee` before settle | Cron only as a second demo, not the qual path | TEE that does not gate pay |
| **TEE HTTP** | `HTTPClient` + `TeeRuntime` if the credential must be used in-enclave | Verdict-only TEE; merchandise fetch on the desk after allow | `ConfidentialHTTPClient` in the TEE handler |
| **Buyer** | Headless signer + thin UI that shows resolve → 402 → receipt | WalletConnect HashPack if the video needs a human click | Agent that cannot pay without a hardcoded URL |
| **Third-slot swap (Sunday)** | Stay Chainlink if simulate logs exist | Graph if composition + SKILL are real; World only if Selfie flag is already on | Picking a partner that did not land |
| **Stretch only** | Harness PR #59 (open) and live `join()` both landed | TOLL + scheduled subscribe landed as a side rail; snapshot 402 stayed HBAR | Either as a reason the spine slips |

---

## User stories (demo-critical)

1. As a buyer agent, I want to pay a desk I found by name — or discover one under a parent namespace — so that I never embed an API key or URL.
2. As a buyer agent, I want a 402 then a settle, so that I only retry after a real challenge.
3. As a buyer agent, I want a larger multi-protocol request to cost more, so that the meter is visible on camera.
4. As a desk operator, I want EAC so a hot account can edit price/endpoint and cannot transfer the name.
5. As a desk operator, I want the TEE to refuse an over-cap agent, so that the desk never settles that request.
6. As a judge, I want a HashScan settle and an HCS topic I can recompute, so that I do not take the README on faith.
7. As a judge, I want a `cre workflow simulate` log, so that I can see `handlerInTee` and `getSecret` on the pay path.
8. As a judge, I want the video to type or paste the name, so that I know it is not hardcoded.

Landed after the spine (not required to keep the loop): unused-remainder refund; `join()` on the same CRE engine; `/desks` + parent-only agent; second ENSv2 sibling; TOLL custom fee + scheduled subscribe; guest session pay; `/register` with constrained price/payTo and optional expiry; expired child `gone.nametoll.eth`; claim + subscribe UI; TEE policy simulate logs. Still not scheduled: per-desk 402 pricing; ENSIP-25/26 as extra record types; ERC-8004 / A2A; Bazantic.

---

## Implementation decisions

- One app, six modules. No second product for a fourth partner.
- Hedera testnet. Two ECDSA accounts (buyer, seller). Facilitator fee-payer **must** match Blocky402 `/supported`. Probe that endpoint day one.
- x402 v2 only. Tinybars only. `payTo` is a Hedera account id (`0.0.…`), not an EVM address.
- ENSv2 on Sepolia. Deploy the owner Permissioned Resolver before registering with a zero resolver. `ens-cli` writes emit unsigned calldata — someone still signs. `--reverse-record` is v1-only; do not use it.
- CRE: `cre init -t hello-confidential-workflows-ts`. Every CLI command that accepts `--target` gets it. Simulation is the qual evidence. Do not log secrets.
- Graph: fetch schemas via Subgraph MCP; pin deployment IDs; fail-soft. Merchandise can stay even if Graph is never a form pick.
- Host the desk. Commit every day. Attribute AI. Demo 2–4 min, human voice, ≥720p (ETHGlobal upload max is 4 min even if Hedera allows 5).
- README maps video timestamps to each selected partner’s qualification list in `docs/analysis.md` §9.

---

## Testing decisions

Test **observable behavior**, not SDK internals.

| Module | Prove |
|---|---|
| Directory | Unknown name fails; known live name returns a descriptor; UI does not ship a baked-in name for the happy path. Parent catalog lists children. |
| Gate | No header → 402; bad payload → no resource; good Blocky402 settle → resource + payment response. Asset on `/desk/snapshot` stays `0.0.0`. |
| Brain | Missing/over-cap secret → deny and no settle; allow → settle may proceed. Distinct public reasons for allowlist/rate when those secrets are set. Simulate log committed (redact secrets). |
| Merchandise | Live query returns; pinned ID down → fail-soft, not a crash with fake rows. |
| Ledger | After a paid request, Mirror Node shows a bill that matches units × price. Subscribe claim bills may carry `scheduleId` without changing that formula. |
| Buyer | One scripted paid request against the live URL. Agent handed only a parent name can discover and pay. |

No prior app tests in this repo. Do not vendor-test the official x402 PoC as if it were ours.

---

## Build order

| When | Done when |
|---|---|
| Thu–Fri | Live URL, one Blocky402 settle, HashScan link — **landed** |
| Fri | Live ENSv2 resolve, no hardcoded happy path, one EAC grant — **landed** (`nametoll.eth` / `desk.nametoll.eth` / `agent-02.nametoll.eth`) |
| Fri–Sat | TEE on the pay path, simulate log in repo — **landed** |
| Sat | Meter visible; HCS bill recomputable — **landed** (plus remainder refund) |
| Sat–Sun | Video + README timestamps; Sunday form = the three that actually landed. **Code done. Human remaining: video + stable `PUBLIC_DESK_URL`.** |

---

## Further notes

- Prize analysis and agent rules: `docs/analysis.md`, `docs/partners/README.md`, `AGENTS.md`.
- Build order for an implementing agent: `docs/BACKLOG.md`.
- Working title **Nametoll** can change; the loop cannot.
- Explore windows are not a backlog of features. They are permission to change an implementation when the default is blocked — without changing the loop or the partner lock unless Sunday evidence forces a form swap.
