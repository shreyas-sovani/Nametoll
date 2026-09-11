# Nametoll — Build backlog

**For the build agent.** This is the direction of work. It is not a syntax guide and not a license to invent APIs.

**Status 11 Sep 2026:** B0–B16 done. Public desk Brain is CRE simulate (`./cre` default) — 1 protocol allows, 2 denies over cap. Judge blotter shows live merchandise rows, per-bill recompute, unsigned `join()`. Latest TEE-gated settle: `0.0.7162784@1789111350.366520040`. Live parent is `nametoll.eth` (child `desk.nametoll.eth`) on ENSv2 Sepolia. CRE simulate logs in `docs/partners/chainlink/`. Submission timestamps + §9 checklists: `docs/submission.md`. Unused remainder refunds when delivered units < prepaid (Pinout shape, no dual HCS). Harness PR: https://github.com/hedera-dev/hedera-harness/pull/59 (open against `dev`). Same CRE engine emits unsigned `join()` to live ChallengeLending `0x88574e7Cc0027afd04951daa09B64d4441931ba1`. No join tx broadcast. Sunday form swap evaluated: **no swap** — Hedera · ENS · Chainlink. Graph is merchandise (no prize SKILL). World Selfie flag was not on.

Read in this order, then execute tickets **in ID order**. Do not skip ahead to a later ticket because it looks more interesting.

1. `AGENTS.md`
2. `docs/PRD.md` — the loop, modules, non-goals, explore windows
3. This file
4. The **Read first** list on the ticket you are about to start
5. Live MCP / Context7 IDs in `docs/partners/README.md` when a ticket says “verify live”

If a symbol, flag, contract, record key, facilitator route, or entity name is not in the skill, the vendored tree, or the live docs you just fetched, **it does not exist**. Stop and use a PRD explore window instead of guessing.

---

## How to work a ticket

1. Open every path in **Read first**. Skills under `.agents/skills/` and `vendor/` are the same packs; prefer the skill, then the vendor tree if you need source.
2. Confirm the ticket’s **Done when** is still the PRD loop (name → TEE allow → pay → metered data → HCS bill).
3. Implement the **system change** only. Internals may follow vendor examples; the product must not become the official inference PoC.
4. Prove **Done when** with an observable check (URL, HashScan, simulate log, resolve, fail-soft). Not “it compiles.”
5. Mark the checkbox. Commit. Next ticket.

Do not implement World, ATS, SwapVM, Uniswap, Privy, Arc, Ledger, Bazantic, ERC-8004, or a Graph prize SKILL unless a later ticket or a Sunday form-swap says so.

---

## Done / next / blockers

| | |
|---|---|
| **Done** | B0 scaffold · B1 Gate 402 · B2 buyer pay · B3 public URL · B4 HCS bill · B5 live Messari Aave+Compound · B6 meter 1 vs 2 units · **B7** live `nametoll.eth` / `desk.nametoll.eth` · **B8** buyer paid the resolved endpoint · **B9** `handlerInTee` + redacted simulate logs · **B10** Gate refuses settle/bytes when Brain denies or is skipped · **B11** judge blotter · **B12** README timestamps + `docs/submission.md` · **B13** unused-remainder refund · **B14** [hedera-harness#59](https://github.com/hedera-dev/hedera-harness/pull/59) · **B15** unsigned `join()` on the same CRE engine · **B16** Sunday form stay (Hedera · ENS · Chainlink) |
| **Next** | Video + stable public URL. No open spine tickets. |
| **Human blockers** | Public desk is ngrok session-scoped. Never commit `.env`. |
| **Not blockers** | Graph Studio query key works. Sepolia owner/operator are funded testnet accounts. |

---

## Source map (pull docs from here)

| When the ticket is about | Open these, in order |
|---|---|
| Agent rules / no-invent | `AGENTS.md` · `docs/partners/README.md` · `vendor/SOURCES.md` |
| Product / partners / quals | `docs/PRD.md` · `docs/analysis.md` §3.1–3.3, §9 |
| x402 / Blocky402 / tinybars | `.agents/skills/x402-payments/SKILL.md` + `references/facilitator.md` + `references/examples.md` · `docs/partners/hedera/blocky402-api.md` · live `GET https://api.testnet.blocky402.com/supported` · PoC as **wiring reference only**: `vendor/x402-inference-pay-per-request-poc` (its PRD uses x402.org + flat USDC — **do not copy those two choices**) |
| HCS / Mirror Node | `.agents/skills/hedera-consensus-service/SKILL.md` · Hedera docs MCP `https://docs.hedera.com/mcp` · `@hiero-ledger` (not `@hashgraph/sdk` unless a skill still shows that import) |
| Hedera accounts / HTS (only if you need USDC later) | `.agents/skills/hedera-token-service/SKILL.md` · hosted network MCP is testnet-only and RETURN_BYTES — never send a private key |
| ENSv2 / Permissioned Resolver / EAC | `.agents/skills/base/SKILL.md` · `.agents/skills/ens-protocol/SKILL.md` · `.agents/skills/enssdk/SKILL.md` · `.agents/skills/enscli/SKILL.md` · `vendor/ens-cli/README.md` (writes emit unsigned `{to,data,value}`) · `docs/partners/ens/llms.txt` · Context7 `/ensdomains/docs` · live https://docs.ens.domains/llms.txt |
| ENS reads | `.agents/skills/omnigraph/SKILL.md` then `enscli` — do not hand-author GraphQL fields |
| CRE / TEE | `.agents/skills/chainlink-cre-skill/SKILL.md` then the reference it names (`project-scaffolding.md`, `simulation.md`, `confidential-workflows.md`) · `docs/partners/chainlink/confidential-workflows-official.md` · `vendor/chainlink-agent-skills` · Context7 `/llmstxt/chain_link_cre_ts_llms-full_txt` · `cre templates list` for the real confidential template name — do not hand-roll a CRE project |
| Graph merchandise | `docs/partners/graph/mcp.md` · Subgraph MCP `https://subgraphs.mcp.thegraph.com/sse` · `.agents/skills/subgraph-dev/SKILL.md` (schema/composition rules) · Messari / Standardized links on the Graph prize page in `docs/prizes.txt` · **fetch schema via MCP; do not invent entities** |
| Prize video / git | `docs/analysis.md` §1.3 · `.agents/skills/hedera-hackathon-submission-validator/SKILL.md` |

**Do not open for this build:** World / AgentKit skills, 1inch skills, ATS, harness (unless B14), Aqua.

---

## System shape (do not redesign)

Six modules from the PRD. Stable interfaces only. Change internals freely.

```text
Buyer ──resolve──► Directory (ENSv2 descriptor)
  │
  ├──ask──► Brain (CRE TEE verdict)
  │
  └──402──► Gate ──settle──► Blocky402
              │
              ├──allow?──► Merchandise (live Graph snapshot + units)
              └──bill──► Ledger (HCS)
```

| Interface | Shape (logical) |
|---|---|
| Desk descriptor | endpoint, payTo (Hedera account id), priceRule, hcsTopic, asset `0.0.0` |
| Brain verdict | allow, maxTinybars, public reason — no secrets |
| Bill | requestId, name, units, tinybars, settleTx, consensusTime |
| Buyer | never receives the data-plane credential |

Repo layout is the build agent’s choice as long as these six boundaries stay visible. Prefer one app, not six deployables. CRE may live in its own `cre init` tree because the CLI requires that.

---

## Preconditions (human, not a ticket)

The build agent must not ask anyone to paste keys into chat. The human sets these locally and never commits them.

- Two funded **ECDSA** Hedera testnet accounts (buyer, seller). Facilitator fee-payer is **Blocky402’s**, from `/supported`, not a third key we invent.
- Sepolia account that can register ENSv2 and sign `ens-cli` calldata.
- CRE login (browser) if Brain tickets run. Simulation does not need mainnet deploy.
- Graph Studio gateway key for live queries.
- Hosting target for a public desk URL.

Day-one probe (do this before B1 if Hedera is still the plan): `GET https://api.testnet.blocky402.com/supported` and `GET …/health`. If down, stop Hedera work and say so — do not silently switch to x402.org.

---

## Tickets

Work top to bottom. A later ticket may assume the earlier **Done when**.

### B0 — Scaffold the empty system

- [x] **B0** Empty app with six module boundaries and a config surface for network ids, facilitator URL, and secrets paths. No partner calls yet.

**Done when:** A new clone can install and boot a health route. `.env.example` lists required names without values. README says “do not commit secrets.”

**Read first:** `docs/PRD.md` (modules) · `AGENTS.md`

**Explore:** Any TS/JS web stack. Do not add Solidity “because Hedera.” Hedera is not a blockchain; prefer `@hiero-ledger` when the HCS/x402 skills say so.

**Do not:** Copy the inference PoC into the repo root as the app.

---

### B1 — Gate: 402 against a stub

- [x] **B1** Resource server challenges unpaid requests and settles paid ones through **Blocky402** on Hedera testnet. Stub body is fine (“ok” / fixture JSON).

**Done when:** No payment header → 402 with a v2 payment-required body. Valid buyer signature → settle → stub body + payment-response. Resource process has **no** facilitator private key. Fee-payer in requirements **matches** live `/supported`. Amounts are tinybars. Asset is `0.0.0`. `payTo` is a Hedera account id.

**Read first:** `x402-payments` skill + facilitator/examples refs · `docs/partners/hedera/blocky402-api.md` · live `/supported` · PoC only to see header names (`PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` / `PAYMENT-RESPONSE`), not facilitator host or pricing.

**Explore:** Official `@x402/hedera` exact server/client packages named in the skill. Self-hosted facilitator is **not** the prize path — Blocky402 is.

**Do not:** x402 v1 envelopes. x402.org facilitator. USDC `0.0.429274` unless you later change the PRD (default is HBAR). Flat “we’ll meter later” is OK **only** until B6.

---

### B2 — Buyer: one real paid request

- [x] **B2** A consuming agent or script completes one paid request against the Gate.

**Done when:** A HashScan (or equivalent explorer) link for the settle exists in the working notes / README draft. The buyer is a key-based signer or a wallet — either is fine. The buyer does not hold the seller key.

**Read first:** `x402-payments` client flow · PoC client **pattern** only

**Explore:** Headless signer first (faster demo). WalletConnect / HashPack only if the video needs a human click (PRD buyer window).

**Do not:** Hard-require a chat UI. Do not use Hedera Agent Kit theater without a 402 gate (you already have the gate).

---

### B3 — Public desk URL

- [x] **B3** Gate is reachable on a public URL. Buyer can pay that URL.

**Done when:** Someone not on localhost can hit 402 and (with keys) settle. README has the URL.

**Read first:** none beyond host docs you already use

**Do not:** Leave “works on my machine” as the demo target.

---

### B4 — Ledger: HCS bill after settle

- [x] **B4** After a successful settle, append a bill the judge can recompute from Mirror Node.

**Done when:** Topic id is in README. A paid request produces a message whose fields match `{ requestId, name-or-stub, units, tinybars, settleTx, consensusTime }`. A short “recompute” note: read topic → multiply units × price rule → compare tinybars.

**Read first:** `hedera-consensus-service` skill · Hedera docs MCP if unsure of topic create / submit / mirror query

**Explore:** One topic for all bills (default). HIP-991 / dual-topic (Pinout) only if cheap and already understood — do not block the spine.

**Do not:** Treat HashScan of the HBAR transfer as a substitute for the HCS bill. The transfer is the pay; the topic is the audit.

---

### B5 — Merchandise: live multi-protocol snapshot

- [x] **B5** Desk can fetch a **live** lending-risk snapshot across **≥2** protocols and report **billable units**.

**Done when:** Schemas were fetched via Subgraph MCP (or documented Studio endpoints after a schema fetch). Deployment IDs are pinned in config. One protocol’s indexer down → fail-soft (partial result or explicit error), **not** invented rows. Units are a number the Gate can price (default: protocol count in the request).

**Read first:** `docs/partners/graph/mcp.md` · Subgraph MCP · `subgraph-dev` skill (composition / do not invent entities) · Standardized / Messari links in `docs/prizes.txt` (Graph section) · confirm deployments live before pinning

**Explore:** Default = Messari-shaped / Standardized lending across Aave + Compound (or whatever pair is actually live). Any other live metered data that is not an inference market is allowed if Standardized lending is dead. Do **not** author a new subgraph unless querying existing ones is impossible.

**Do not:** Mock fixtures in the happy path. Single decorative subgraph. Graph form-pick work (SKILL.md product, Substreams pipeline) — merchandise only.

---

### B6 — Meter: second request can cost more

- [x] **B6** Gate prices from merchandise units, not a constant.

**Done when:** Request for 1 protocol vs 2+ protocols (or small vs large byte count) produces two different tinybar amounts on camera and on the HCS bills. Both still settle through Blocky402.

**Read first:** B1 notes · Pinout/Tally **shape** in `docs/analysis.md` §3.1 (meter / remainder) — do not clone their repos

**Explore:** Protocol count (default). Response bytes. Session + unused remainder refund is stretch, not this ticket.

**Do not:** Ship only `$0.001` flat as the final meter.

---

### B7 — Directory: ENSv2 name is the desk

- [x] **B7** A live ENSv2 name on **Sepolia** resolves to the desk descriptor. Happy path does not hardcode the name or the endpoint. *Live parent `nametoll.eth`, child `desk.nametoll.eth`, Permissioned Resolver + EAC, 11 Sep 2026.*

**Done when:** Video/UI can type or paste a name. Resolve returns endpoint, price rule, HCS topic, pay-to. Parent/child or wildcard is real. Permissioned Resolver holds the records. One EAC grant: an operator account can edit those records and cannot transfer the name. `ens-cli` writes are unsigned — a human or wallet still broadcasts. Resolver is deployed **before** a zero-resolver register.

**Read first:** `base` → `ens-protocol` → `enssdk` / `enscli` · `vendor/ens-cli/README.md` (resolver deploy, register, subregistry, subname, set; `--reverse-record` is v1-only) · ENSv2 pages linked from `docs/partners/ens/llms.txt` (Permissioned Resolver, EAC, hierarchy) · live docs if the snapshot is stale

**Record keys:** Only keys that appear in live ENSv2 / ENSIP-5 / ENSIP-26 docs. If a key is not documented, use a documented text key and put a machine-readable descriptor in the value — do not invent a new ENSIP.

**Explore:** Parent + children + wildcard (default). Own subregistry if the default path hits a Sepolia landmine (`docs/analysis.md` §3.2). ENSIP-25/26 only if they fall out of the resolver for free.

**Do not:** ENSv1 NameWrapper path. Community ENS MCPs. Cosmetics. Hardcoded name on the happy path (fixtures in unit tests are fine).

---

### B8 — Buyer uses the Directory

- [x] **B8** Buyer takes a name, resolves, then 402s the **resolved** endpoint. *Operator `setText` on `agent-endpoint[web]` changed the next resolve. `npm run buyer -- nametoll.eth` settled on the restored public URL.*

**Done when:** Changing the resolver’s endpoint record (via the EAC operator) makes the next paid request hit the new URL without a buyer code change. Name is an input, not a constant in buyer source.

**Read first:** Directory module + B2 + B7

**Do not:** Keep a baked-in desk URL in the buyer “for convenience” on the demo path.

---

### B9 — Brain: confidential verdict

- [x] **B9** CRE confidential workflow: `handlerInTee` + `getSecret` inside the enclave. Verdict is allow / deny / max tinybars. *Official `hello-confidential-workflows-ts`. `cre workflow simulate --target staging-settings`: `docs/partners/chainlink/simulate-allow.log` / `simulate-deny.log`. Cap `150000` tinybars flips 100000 allow vs 200000 deny. 11 Sep 2026.*

**Done when:** `cre workflow simulate` (with `--target` on every CLI command that accepts it) produces a log committed to the repo with secrets redacted. The log shows a TEE handler, not a normal `handler`. A secret spend cap changes the verdict. Template comes from `cre init` + official confidential template — verify the template name with the CRE skill and `cre templates list`; do not hand-write the CRE project tree.

**Read first:** `chainlink-cre-skill/SKILL.md` → `project-scaffolding.md` → `confidential-workflows.md` → `simulation.md` · `docs/partners/chainlink/confidential-workflows-official.md`

**Hard rules:** No `ConfidentialHTTPClient` inside the TEE handler. No secrets through `usingTheDons()`. No Functions / Automation. No mainnet deploy. Do not log secrets.

**Explore:** HTTP trigger before settle (default). Verdict-only TEE (merchandise fetch stays on the desk) if in-enclave HTTP is blocked. Cron is not the qual path.

**Do not:** Isolated hello-world that the desk never calls.

---

### B10 — Gate obeys the Brain

- [x] **B10** Deny or over-cap → no Blocky402 settle and no merchandise bytes. Allow → B1–B6 path as before, and settle tinybars ≤ maxTinybars. *Paid `GET /desk/snapshot` asks Brain first. Deny/skip → 403, merchandise not called, no HCS bill. Allow → settle as before. 11 Sep 2026.*

**Done when:** Two scripted runs: under cap (data + bill) and over cap (no settle, no bill, or a deny bill that is not a payment). Feature does not work if the TEE verdict is skipped.

**Read first:** B9 · B1 · PRD “What the TEE is allowed to do”

**Do not:** Call the TEE “for the README” after already settling.

---

### B11 — Thin operator / judge UI

- [x] **B11** A page a human can drive for the 2–4 min video: paste name, show descriptor, show TEE reason, show 402 → settle, show snapshot, show HashScan + HCS topic. *`/` blotter. `GET /desk/inspect` + `POST /desk/pay`. Empty / error / deny stations. No baked-in name. 11 Sep 2026.*

**Done when:** Happy path has no hardcoded name. Empty / error / deny states exist. Desktop-usable. Not a design prize.

**Read first:** `docs/PRD.md` user stories 1–8 · `docs/analysis.md` §1.3 (video rules)

**Do not:** Mini-app / World UI. Music-over-text. TTS. Phone-camera demo.

---

### B12 — Submission pack

- [x] **B12** README maps **timestamps → each locked partner’s qual list**. Public repo, daily commits, AI attributed. *Form Hedera + ENS + Chainlink. `docs/submission.md` ticks §9 from live URL, HashScan, topic, simulate logs, live resolve. 11 Sep 2026.*

**Done when:** Checklists in `docs/analysis.md` §9 for Hedera AI, ENS, and Chainlink can be ticked from README + video + repo evidence (live URL, HashScan, topic id, simulate log, live resolve). Form still says Hedera + ENS + Chainlink unless a Sunday swap is written down.

**Read first:** `docs/analysis.md` §1.3, §9 · `hedera-hackathon-submission-validator` skill

**Do not:** Pre-print a different trio. Demo under 2 or over 4 minutes.

---

## Stretch (do not start if a spine ticket is open)

- [x] **B13** Unused-remainder refund (Pinout shape). Only after B6 is honest. *Credit = settled tinybars. Burn = delivered protocols (stub burns all). Seller `TransferTransaction` refunds unused. HCS: `units`/`tinybars` = burned/owed; `prepaidTinybars − tinybars = refundTinybars`. Blotter station 06. No HIP-991 dual topic. 11 Sep 2026.*
- [x] **B14** Hedera harness PR for a DX bug **this** repo actually hit. `hedera-harness init` adopt copied the Scaffold-HBAR Yarn/Next recipe into a Nametoll-shaped npm Express app (`yarn next:build`, validator forbids `npm`). Open PR (not merged): https://github.com/hedera-dev/hedera-harness/pull/59 — before/after on the PR; Copilot follow-up: neutralize Scaffold-HBAR `static.json`, persist `constraints.packageManager`, adapt only newly written recipe files, hash npm/pnpm lockfiles. Test: `adopting an npm app does not plant a yarn next:build recipe`. No `.harness/` in this repo. No harness demo video. 11 Sep 2026.
- [x] **B15** Liquidation challenge `join()` on the **same** CRE engine. Official ABI `function join()` from [ChallengeLending.sol](https://github.com/solangegueiros/cf-liquidation-protection-challenge/blob/main/contracts/ChallengeLending.sol). Live official address from that repo’s README / `frontend/addresses.ts`: `0x88574e7Cc0027afd04951daa09B64d4441931ba1` (`challengeOpen` true 11 Sep 2026). ETHOnline scrape `0x59d5B29F…` is an older deploy (numUsers reverts) — not used. Same HTTP `handlerInTee`: `{ "action": "join" }` returns unsigned `{ to, data: 0xb688a363, chainId: 11155111 }`. Not `writeReport`. Not the cloned liquidation template. Simulate: `docs/partners/chainlink/simulate-join.log`. No join tx broadcast (wallet still has to send it). 11 Sep 2026.
- [x] **B16** Sunday form swap evaluated 11 Sep 2026. README swap record written **before** any form-line change (the line is unchanged). Graph: B5 Messari composition (Aave v3 + Compound III, one query, MCP schemas, fail-soft) is merchandise — this repo did not ship a Graph prize SKILL. World: Selfie Check flag was not on (no IDKit, no `selfieCheckLegacy`, no portal confirmation). Chainlink simulate logs exist, so the third slot stays Chainlink. Form remains Hedera · ENS · Chainlink.

---

## Suggested calendar (not a second backlog)

| When | Tickets that should be green |
|---|---|
| Thu–Fri | B0–B3 |
| Fri | B7–B8 (Directory can overlap B4–B6 if two people) |
| Fri–Sat | B9–B10 |
| Sat | B4–B6 if not done; then B11 |
| Sat–Sun | **B12** |

If CRE dies, keep B0–B8 + B11–B12 and use the PRD third-slot swap. Do not fake a TEE.

---

## Definition of done (the product, not a ticket)

A judge can: paste a live ENSv2 name → see a descriptor → watch an over-cap deny → watch an under-cap pay on HashScan → see metered data → recompute the HCS bill → open a redacted `cre workflow simulate` log that sits on that pay path.
