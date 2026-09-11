# ETHOnline 2026 — Prize Track Analysis

**Event:** ETHOnline 2026 (4–16 September 2026)  
**Submit:** Sunday 13 September 2026, 12:00pm EDT  
**Analysis date:** 9 September 2026  
**Revised:** 10 September 2026 — unlocked the 3-partner lock; focus is the **top 5 integrable** partners  
**Evidence 11 September 2026:** filled §9 lives in [`docs/submission.md`](submission.md). Live `join()` is on official ChallengeLending `0x88574e7Cc0027afd04951daa09B64d4441931ba1` (not the ETHOnline scrape). Live remainder refund is on HashScan.  
**Team status:** Start Fresh (Classic). No prior project code.  
**Form constraint:** Select up to **3 Partner Prizes** on submit. If a partner has multiple tracks, all of them count as **one** pick.  
**Working set:** Rank and vendor **five** partners that are both winnable and agent-buildable (official MCP / skills / `llms.txt`). Pick any 3 of those 5 on the form.  
**Objective:** Maximize P(win ≥ 1 prize) without inventing APIs.  
**Official rules:** [ethglobal.com/events/ethonline2026/info/details](https://ethglobal.com/events/ethonline2026/info/details)  
**Official prizes:** [ethglobal.com/events/ethonline2026/prizes](https://ethglobal.com/events/ethonline2026/prizes)  
**Agent sources:** [docs/partners/README.md](partners/README.md) · [AGENTS.md](../AGENTS.md)

---

## 0. How this document was produced

Seven isolated agents ran in parallel, then a debate agent was forced to a single 3-partner lock (Hedera + ENS + Chainlink). That lock is **superseded**. A later scrape of official MCP / Agent Skills / `llms.txt` surfaces widened the working set to five integrable partners. Historical debate is kept in §6 so the original contradictions stay visible. Do not treat §6.3’s old lock as current instruction.

| Agent | Mandate | Output used below |
|---|---|---|
| **Hedera scrape** | All Hedera 2026 tracks, 2025–2026 winners, July 2026 x402 bounty, official PoCs | Track bars, winner autopsies, ATS/harness skip |
| **World / Ledger / Privy scrape** | Access gates, hardware, 2025–2026 winners | Selfie Check flag risk, Privy “qualify ≠ win”, Ledger device gate |
| **Chainlink / ENS scrape** | CRE Confidential DQ line, liquidation `join()`, ENSv2 vs Lisbon | TEE as load-bearing, 4 ENS places, challenge as bolt-on |
| **Graph / Uniswap / 1inch scrape** | Density, Atlas/Deeptrace/ArcBook bars, Uniswap paperwork | Graph flood, Aqua skill gate, Uniswap lottery |
| **Arc / Bazantic scrape** | Circle winner pattern, Arc mainnet 16 Sep, Bazantic checklist | Skip Arc/Bazantic as slot reasons |
| **Rules & density** | Full 30-track inventory, DQ list, EV model, 2025 volume | Slot math, Continuity ignore list |
| **Debate & consensus** | Steelman, attack, resolve contradictions, originally lock 3 partners | Historical 3-lock (superseded) |
| **MCP / skills scrape (10 Sep)** | Official agent surfaces only | Top 5 integrable set + vendored skills |

Agents did **not** agree at first. Privy scrape said take Privy. Graph scrape said take Graph. Density said Hedera + World + ENS. World scrape said skip World unless the Selfie Check flag is already on. Debate resolved those as local optima on the wrong objective (easy to qualify vs likely to win). The MCP scrape later showed World and Graph are first-class **integrable** partners, so they stay in the working five instead of being a one-way swap or a hard skip.

**Current conclusion (integrable top 5 — not a form lock):**

> **Working set:** Hedera, ENS, Chainlink, World, The Graph.  
> **Submit any 3 of those 5.** Do not lock the trio in advance.  
> **Product spine (any 3):** ENSv2-addressable, HCS-receipted x402 service. Optional confidential spend brain (Chainlink), human gate (World), or live composed Graph data (The Graph).  
> **Outside the five:** 1inch MCP is vendored as flex only (Aqua analytics ≠ SwapVM). Ledger, Privy, Uniswap, Arc, Bazantic stay out.

---

## 1. Event mechanics that change strategy

### 1.1 Volume

| Event | Hackers | Projects | Source |
|---|---:|---:|---|
| ETHOnline 2024 | 1,590 | 417 | [ETHGlobal wrapped](https://paragraph.com/@blog.ethglobal/ethonline-2024-wrapped) |
| ETHOnline 2025 | 1,671 | 634 | [ETHGlobal POAP](https://collections.poap.xyz/collections/5769/drops/212578) |

2026 planning volume used by the density agent: **~400–550 submitted projects** (shorter window, 11 partners). Use **480** for EV. ~2.5 partner picks per project → crowded partners see 150–240 entries.

### 1.2 The mechanic to exploit

You pick **partners, not tracks**. One Hedera selection unlocks AI payments **and** harness **and** ATS. One Chainlink selection unlocks Confidential Workflow **and** the liquidation challenge.

That is why Hedera (8 Start Fresh paid seats) beats Uniswap (3 seats of $1k) even if Uniswap is easier to bolt on.

Partner judging is **async**. First-round Finalist screening does **not** affect partner prizes. At online events, **most partner money goes to non-finalists.** Still opt into Finalist + Partners.

### 1.3 Automatic DQs (event-wide)

From [details](https://ethglobal.com/events/ethonline2026/info/details):

- Submit after 13 Sep 2026, 12:00pm EDT
- Demo **<2 min or >4 min**, **<720p**, sped up, music-over-text, phone camera, TTS / AI voice
- Start Fresh using project-specific pre-event code (public libs and official starter kits are fine)
- Missing git history / one giant final-day commit (1inch writes this as a hard qual; ETHGlobal “may disqualify”)
- All-AI with no meaningful human work
- Spec-driven AI without committed specs / prompts / plans
- **Not selecting the partner on the form** — they cannot see you

Hedera’s prize page allows a 5-minute video. ETHGlobal upload max is **4 minutes**. Follow 2–4.

### 1.4 Two payout types

| Structure | Meaning | Hit rate if you qualify |
|---|---|---|
| **Up to N teams get $X** | They can pay N teams the same amount | High if the qualified set is small |
| **Ranked 1 / 2 / 3** | You beat everyone who picked that logo | Low in flood categories |
| **Single pot** | One winner, no medals | Lowest (Privy, Arc $1,667) |

“Up to N” is not a guarantee. It is still the best structure in this event.

### 1.5 Continuity tracks — ignore entirely (Start Fresh)

1. The Graph — AI (Continuity) — $5,000  
2. Hedera — Continuity — $1,000  
3. Arc — Best DeFi or Agentic (Continuity) — $1,666  
4. Arc — Launch (Continuity) — $1,500  
5. World — AgentKit Continuity — $3,500  
6. 1inch — Aqua Continuity — $2,000  
7. ENS — Best Integration of ENSv2 into an Existing Project — $500  
8. Uniswap — Continuity — $2,000  
9. Ledger — Continuity — $1,500  
10. Chainlink — Best Chainlink-Powered Upgrade — $500  
11. Bazantic — Help an Agent Use Your Project — $1,000  

World AgentKit is Continuity-only. Start Fresh World = **Selfie Check only**.

---

## 2. Full Start Fresh inventory

| Partner | Pool | SF tracks | SF paid seats | Structure | Slot quality |
|---|---:|---|---:|---|---|
| **Hedera** | $15k | 3 | **8** | All up-to-N | **Top 5 — rank 1** |
| The Graph | $15k | 2 | 6 | Ranked 1/2/3 × 2 | **Top 5 — rank 5** (density tax) |
| Arc | $10k | 3 | 4 | 2 singles + ranked 1/2 | Weak $ vs density |
| 1inch | $7k | 1 | 3 | Ranked | Flex only (SwapVM, not MCP aqua) |
| World | $7k | 1 | 3 | Up to 3 | **Top 5 — rank 4** (flag-gated) |
| ENS | $5k | 1 | **4** | Ranked + runner-up | **Top 5 — rank 2** |
| Uniswap | $5k | 1 | 3 | Up to 3 | Lottery |
| Ledger | $5k | 1 | 3 | Ranked | Hardware-gated |
| Privy | $5k | 2 | 2 | Two singles | Qualify-easy, win-rare |
| Chainlink | $3k | 2 | 3 | Up to 2 + 1 challenge | **Top 5 — rank 3** |
| Bazantic | $3k | 2 | 6 | Ranked small $ | Wastes a slot |

---

## 3. Track-by-track: what they expect, who won, take or skip

### 3.1 Hedera — TOP 5 (rank 1)

**Page:** [prizes/hedera](https://ethglobal.com/events/ethonline2026/prizes/hedera)  
**Agent sources:** [docs/partners/README.md](partners/README.md) · `https://docs.hedera.com/mcp` · `https://agentic-testnet-mcp.hedera.com/mcp` · `vendor/hedera-skills`  
**2026 line, in their words:** x402 on Hedera is short of *actual services you can pay for*.

#### Tracks

| Track | Pay | SF? | Call |
|---|---|---|---|
| AI & Agentic Payments | Up to 3 × $2,000 | Yes | **TAKE (primary)** |
| Improve the Hedera Harness | Up to 2 × $1,000 | Yes | **STRETCH** after x402 is live |
| Tokenization of Anything (ATS) | Up to 3 × $2,000 | Yes | **SKIP** in 4 days |
| Continuity | $1,000 | No | IGNORE |

**AI qualification (all four, no exceptions):**

1. Live x402-gated service on Hedera testnet or mainnet  
2. Settled through **Blocky402** (not `x402.org` alone; official PoC’s testnet route is the wrong facilitator)  
3. A platform or agent that completes **one real paid request**  
4. Public repo + demo of the paid request  

**Extra points (treat as the scoring rubric):** metering (not flat per-request), A2A/ACP, ERC-8004 or HCS-14, UCP/directory, HTS or custom fees, **HCS payment audit trail**, Scheduled Transactions.

**Official wiring (floor, not the prize):**  
[hedera-dev/x402-inference-pay-per-request-poc](https://github.com/hedera-dev/x402-inference-pay-per-request-poc)  
PoC README non-goals: no per-token metering, no streaming, flat $0.001, single shared wallet. Winning delta is the opposite.

Blocky402 hosted testnet: `https://api.testnet.blocky402.com` ([docs](https://blocky402.com/docs/introduction/)).

#### What past winners actually included

**ETHOnline 2025**

| Project | Prize | What won |
|---|---|---|
| [SaucerHedge](https://ethglobal.com/showcase/saucerhedge-4mzv0) | Hedera × Lit Vincent **1st** | Four **custom Vincent abilities** for Hedera (LP, hedge, HTS, HCS). Real concentrated-liquidity math. Bonzo flash loan. PKP vaults so the user keeps custody. HCS audit. Not a chatbot. |
| Vision Pay | Agent Kit + A2A **1st ($3k)** | Camera agent + **AP2 delegated mandates** + real HBAR/PYUSD pay under rules. Payment loop, not chat. |

**ETHGlobal Buenos Aires 2025** ([Hedera recap](https://hedera.com/blog/quarterly-events-highlights-q4-2025-october-december/))

| Project | Prize | What won |
|---|---|---|
| [HyperAgent](https://ethglobal.com/showcase/hyperagent-mzvri) | Agent Kit + A2A **1st** | ERC-8004 registry, **custom Agent Kit plugin**, A2A offchain / Hedera onchain, token burn at registration, Oasis TEE verifiers, multi-hop tasks. |
| [Dark Matter Markets](https://ethglobal.com/showcase/dark-matter-markets-b3htk) | Agent Kit + A2A **2nd** | Agents negotiate vote-buying with guardrails; HCS as the voting rail. |
| [Price Feed Plugin](https://ethglobal.com/showcase/price-feed-plugin-kd27q) | Best Agent Kit plugin | Installable plugin. NL → Chainlink condition → Hedera wallet action. Exact plugin-architecture bounty. |
| [Incendia Auction v2](https://ethglobal.com/showcase/incendia-auction-v2-mecrm) | EVM Innovator **1st** | zk proof-of-burn + zkPassport + verified Hedera contracts. Real protocol, not an agent demo. |

**Hedera x402 bounty (closed 31 July 2026) — closest judge-written spec for this year’s AI track**  
Source: [x402 bounty winners](https://hedera.com/blog/x402-bounty-on-hedera-winners-announced/). Five teams × $1,000. All live on Hedera testnet.

| Project | What judges named | Repo |
|---|---|---|
| **Pinout** | Metered session; per-second/token burn; unused remainder refunded; dual HCS (cheap checkpoints + HIP-991 settlement); bill recomputable from Mirror Node; **no contract** | [hitakshiA/pinout](https://github.com/hitakshiA/pinout) |
| **Tally** | First non-EVM x402 `upto` scheme; HTS allowance cap; HCS bills; scheme submitted **upstream** | [Madhav-Gupta-28/Tally](https://github.com/Madhav-Gupta-28/Tally) |
| **Xorv** | Idle AI-quota marketplace; HTS USDC; HCS audit; facilitator pays gas | [nickthelegend/xorv](https://github.com/nickthelegend/xorv) |
| **Qisma** | `exact-multi`: one CryptoTransfer pays aggregator + 3 APIs at one consensus timestamp; no escrow | [farouk-allani/qisma](https://github.com/farouk-allani/qisma) |
| **Mystic** | Pay-as-you-go VPN, per-minute, exact HBAR x402. Thinnest winner. A real gated service still paid. | [mdmudassir0143/Mystic](https://github.com/mdmudassir0143/Mystic) |

**ETHGlobal Lisbon / NYC 2026**

| Project | Hedera prize? | Lesson |
|---|---|---|
| [Vouch](https://ethglobal.com/showcase/vouch-63ywx) | **Yes — AI & Agentic Payments** | Payment **conditional on proof** (Scheduled Tx 2-of-2 after HCS CHALLENGE→EVIDENCE→VERDICT). Not “agent sends HBAR.” |
| [AgentRouter](https://ethglobal.com/showcase/agentrouter-deqhv) | **Yes — “No Solidity Allowed” only** | Full x402 inference market + HCS registry + slash. **Lost the AI purse.** Do not clone this for ETHOnline AI. |
| [CashMeIfYouCan](https://ethglobal.com/showcase/cashmeifyoucan-qzyzw) | **Yes — Tokenization (NYC)** | Invoice factoring; **HTS custom fee = agent cut**; Scheduled Tx payout; HCS fingerprint. Network enforces the fee. |
| AEGIS, PlanBound, AgenTick, P1X3LZ | Used Hedera; **no Hedera winner badge** | Safe-on-Hedera, World ID procurement, production games — strong products, not what Hedera paid. |

**What 2026 Hedera expects (not 2025):** live Blocky402-settled service + consuming payer + Hedera-native rails (HCS / HTS / Scheduled Tx / CryptoTransfer). Agent Kit theater without a 402 gate loses.

**What losers do:** deploy Solidity on Hashio and say fees are low; wrap the official PoC with a new landing page; build another OpenRouter.

**4-day feasibility:** Medium-high. Qual bar is mechanical. Winning bar is metering + public HCS receipts. ATS is a different stack (ERC-3643/1400 studio) — skip. Harness repo is young ([hedera-dev/hedera-harness](https://github.com/hedera-dev/hedera-harness)); a real PR after you hit a DX bug is $1k with thin competition.

**Blockers:** Blocky402 testnet must be up (probe `/supported` day one). Two ECDSA Hedera testnet accounts. USDC testnet `0.0.429274` if settling USDC. Host the service; localhost dies in async judging.

---

### 3.2 ENS — TOP 5 (rank 2)

**Page:** [prizes/ens](https://ethglobal.com/events/ethonline2026/prizes/ens)  
**Agent sources:** https://docs.ens.domains/llms.txt · Context7 `/ensdomains/docs` · `vendor/ens-cli` · `vendor/ensnode/packages/ensskills`

| Track | Pay | SF? | Call |
|---|---|---|---|
| Best Use of ENSv2 | $1.5k / $1.5k / $1k / **$500 runner-up** (4 places) | Yes | **TAKE** |
| Best Integration into Existing Project | $500 | No | IGNORE |

**They expect:** ENSv2 on **Sepolia**. Hierarchical registry or parent-resolver wildcard. Enhanced Access Control. Permissioned Resolver. Demo functional, **no hardcoded names**. Cosmetic `.eth` sticker = DQ. Bonus: agents as namespaces.

Lisbon 2026 already spent “be among the first.” Newness is gone. Depth of EAC / own subregistry / agent ownership is the bar.

#### What past winners included

| Project | Prize | What won | Sticker |
|---|---|---|---|
| [Atlas](https://ethglobal.com/showcase/atlas-pmtqo) | ENS Best Integration for AI Agents + Graph 2nd (Lisbon) | Name **is** the mini-app. ENSIP-25/26 agent records. `mutuallyVerified` read on every resolve. Contenthash → manifest. Honesty about unpaid x402. | `.eth` as a label |
| [Kondor](https://ethglobal.com/showcase/kondor-4bvt5) | ENS 2nd (Cannes) | Name **is** the wallet and encrypted policy store. Wildcard + CCIP-Read. CRE is the only party that can decrypt. | Monerium offramp |
| [ENSignv2](https://ethglobal.com/showcase/ensignv2-34544) | ENS Continuity | Name = ERC-4337 passkey wallet. Guardians are subnames. Bind EAC to **resource**, not token id (ids regenerate). | — |
| [Namesake](https://ethglobal.com/showcase/namesake-kq1ez) | Lisbon ENS | ENSv2 mint → ERC-8004 → ENSIP-25/26 → **NFT transferred to the agent wallet**. | — |
| [VouchMe](https://ethglobal.com/showcase/vouchme-m6fwb) | Lisbon Most Creative ENS | Each vouch = nested ENSv2 registry. Trust = name depth. | — |

**4-day feasibility:** Qualify in 8–16 hours (register, Permissioned Resolver, one EAC grant, live resolve). Competitive in 2–4 days (own subregistry, agent namespaces, ENSIP-25/26). Sepolia landmines (Atlas wasted a day): wrong registrar, viem `getEnsResolver` lie, mock-mode reads.

**Why this is in the five:** four paid places + a protocol filter that DQs “we displayed a name.” Fits the Hedera spine as the **directory**. Official `llms.txt`, Context7, `ens-cli` MCP, and `ensskills` make it agent-buildable.

---

### 3.3 Chainlink — TOP 5 (rank 3)

**Page:** [prizes/chainlink](https://ethglobal.com/events/ethonline2026/prizes/chainlink)  
**Agent sources:** `vendor/chainlink-agent-skills/chainlink-cre-skill` · [docs/partners/chainlink/confidential-workflows-official.md](partners/chainlink/confidential-workflows-official.md)

| Track | Pay | SF? | Call |
|---|---|---|---|
| Best Confidential Workflow | Up to 2 × $1,000 | Yes | **TAKE** |
| Automated Liquidation Protection Challenge | $500, 1 winner after their 24h sim | Yes | **TAKE as bolt-on** |
| Best Chainlink-Powered Upgrade | $500 | No | IGNORE |

**DQ line, quoted:** *“A placeholder handler or an isolated example that does not contribute to the application will not qualify.”*

Must: `handlerInTee` (TS) or `cre.HandlerInTee` (Go); process a secret / private input / confidential API response inside the enclave; prove via **CRE CLI simulation or live deploy**. Functions / Automation are deprecated.

Templates: [hello-confidential](https://docs.chain.link/cre-templates/hello-confidential-workflows) · [liquidation protection](https://docs.chain.link/cre-templates/automated-liquidation-protection) · [AI audit firewall](https://docs.chain.link/cre-templates/ai-audit-firewall)

**Challenge:** `join()` official ChallengeLending [`0x88574e7Cc0027afd04951daa09B64d4441931ba1`](https://sepolia.etherscan.io/address/0x88574e7Cc0027afd04951daa09B64d4441931ba1) on Sepolia (`challengeOpen` true). ETHOnline prizes.txt scrape `0x59d5B29FbA5ca865a171076BE94EbEeC5BCA1E04` is an older deploy (`numUsers` reverts) — do not use. Window from ~8–9 Sep through submission. After deadline, workflow is frozen; they run scenarios 24h. Score: don’t get liquidated, keep the loan open (continuity), spend emergency capital sparingly, keep rules in TEE. Full repay kills continuity. Do **not** submit the template unmodified. Nametoll live `join()`: https://sepolia.etherscan.io/tx/0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086

#### What past winners included

| Project | Prize | What won | Why others lost |
|---|---|---|---|
| [OpenCompliance](https://ethglobal.com/showcase/opencompliance-b89x9) | Chainlink privacy $1k (Cannes) | 4 CRE workflows. Sumsub/Chainalysis via **Confidential HTTP in TEE**. Vault DON encrypted creds. DON-signed report → onchain ACE attestation other protocols `require()`. | — |
| [Meridian](https://ethglobal.com/showcase/meridian-1x2ef) | Same privacy pot | Strategy + API keys in confidential compute. | — |
| [ENShell](https://ethglobal.com/showcase/enshell-6t95y) | Best CRE workflow | CRE decrypts → Claude via Confidential HTTP → DON-signed verdict → **ENS text writable only by CRE**. | — |
| Lineage (NY Confidential AI) | Confidential AI | Private dossier drafted **in enclave**; citations re-checked against PubMed; public attestation out. ENS was a qualifier, not the win. | — |
| [Kondor](https://ethglobal.com/showcase/kondor-4bvt5) | ENS, **not Chainlink** | CRE decrypts ENS-stored policy and executes. CRE was load-bearing for ENS, not enough for Chainlink that event. | — |
| [SENTINEL](https://ethglobal.com/showcase/sentinel-91nv5) | Flare 3rd, **lost Chainlink** | ML/TEE on **Flare**. CRE only aggregated. Wrong TEE vendor for a Chainlink win. | Do not clone for ETHOnline Chainlink. |
| [Justify](https://ethglobal.com/showcase/justify-pob50) | World 1st, **never Chainlink** | `latestRoundData` for price markets. Table stakes, not a prize. | Feed-in-UI / feed-in-resolver without Confidential = skip. |

**What they expect:** Vault DON secret → confidential HTTP or LLM → **DON-signed report → onchain or user-visible gate**. The TEE decision must change something.

**4-day feasibility:** Qualify in 4–8 hours (template + real `getSecret` + simulate + logs). Competitive in 2–3 days if TEE is on the **pay path**. Challenge +0.5–1.5 days on the same engine.

---

### 3.4 World — TOP 5 (rank 4)

**Page:** [prizes/world](https://ethglobal.com/events/ethonline2026/prizes/world)  
**Agent sources:** [docs/partners/world/mcp.md](partners/world/mcp.md) · https://docs.world.org/mcp · https://developer.world.org/api/mcp · https://docs.world.org/world-id/SKILL.md · `vendor/agentkit`

| Track | Pay | SF? | Call |
|---|---|---|---|
| Selfie Check | Up to 3 × $1,166 | Yes | **IN THE FIVE.** Prefer this pick when the Developer Portal flag is on. |
| AgentKit Continuity | Up to 3 × $1,166 | No | IGNORE for Start Fresh prize cash; AgentKit skills are still the official integrate path |

**They expect:** Selfie Check as a **risk / eligibility / fairness / continuity / abuse** signal — not login. Working app. Feedback document on docs, Developer Portal, sandbox states, errors, what was broken. Lisbon already DQ’d reused patterns: agent reputation, simple content-gen, “human-backed discounts” without a new workflow.

**Access gate:** Selfie Check (Beta) must be enabled by a World point of contact (`developers@toolsforhumanity.com`). Sandbox: [testing-selfie-check](https://docs.world.org/world-id/sandbox/testing-selfie-check), form [forms.gle/mqbaiwMvX5MzmKdY8](https://forms.gle/mqbaiwMvX5MzmKdY8). Sandbox app is TestFlight / private Play, not public stores. Preset `selfieCheckLegacy()` — World ID 3.0; 4.0 not available for Selfie. Medium-assurance; **not** one-person-one-account.

If the flag is not on, a World **form pick** is a corpse — keep World in the working five and pick three of the other four on submit. Official agent surface (docs MCP, portal MCP, IDKit `^4.x` skill, AgentKit skills) is why World stays in the five instead of being a last-minute swap.

#### What past winners included

| Project | Prize | What won |
|---|---|---|
| [Proof-of-Human Drops](https://ethglobal.com/showcase/proof-of-human-1cg2d) | World AgentKit **1st** NYC 2026 ($3.5k) | Same uniqueness rule for human (World ID) and agent (AgentKit SIWE). `UNIQUE(drop_id, human_key)`. Real USDC on World Chain Sepolia. They never finished real AgentBook registration and still won — the **security primitive** won. |
| [Justify](https://ethglobal.com/showcase/justify-pob50) | World Track C **1st** | World ID as **create-market / country gate**, not a badge. Product already existed (Continuity). |
| [pinch](https://ethglobal.com/showcase/pinch-fvnm7) | World ID **1st** NYC | Bounty claims farmable without proof of human. |
| [HORS](https://ethglobal.com/showcase/hors-9j0w8) | AgentKit New Use Cases **1st** Lisbon | AgentKit as **execution rights**. Selfie as **step-up for one call**, not login. `origin: same-human \| any-human \| public`. |
| [HumanMandate](https://ethglobal.com/showcase/humanmandate-wbx5i) | Showcase (prize unclear) | Selfie **raises limits**. Caps follow the person, not the wallet. Best Selfie-as-step-up pattern. |
| UnifAI / Unify Finance | Old **pool** prizes | World Mini App wrapper. That bar is dead for 2026 ranked tracks. |

**What losers do:** IDKit popup, then a dapp that works without World.

---

### 3.5 The Graph — TOP 5 (rank 5)

**Page:** [prizes/the-graph](https://ethglobal.com/events/ethonline2026/prizes/the-graph)  
**Agent sources:** [docs/partners/graph/mcp.md](partners/graph/mcp.md) · `https://subgraphs.mcp.thegraph.com/sse` · `vendor/subgraphs-skills` · `vendor/substreams-skills`

| Track | Pay | SF? | Call |
|---|---|---|---|
| Composable / Standardized | $2.5k / $1.5k / $1k | Yes | **IN THE FIVE.** Only if Graph is load-bearing (one query / N protocols, or two+ Graph products). |
| AI From Scratch | $2.5k / $1.5k / $1k | Yes | **IN THE FIVE.** MCP / SKILL as reusable infra, not a chat wrapper. |
| AI Continuity | $2.5k / $1.5k / $1k | No | IGNORE |

**They expect:** one query shape across many protocols (Messari / shared schema), **or** compose two+ Graph products (Subgraphs + Substreams, or Standardized + MCP). Live Studio / Market data. Mocked data DQ. One Subgraph query does **not** qualify for Composable (use AI track — and still lose if you only print rows). AI tooling must be reusable infra.

#### What winners included (this is the bar)

| Project | Prize | What won |
|---|---|---|
| [Am I cooked](https://ethglobal.com/showcase/am-i-cooked-thooh) | Graph Standardized **1st** Lisbon | Messari one-query across Aave/Compound/Spark + 21-chain approval autopsy + live TVL alarm + MCP skill. |
| [Atlas](https://ethglobal.com/showcase/atlas-pmtqo) | Standardized **2nd** | 86 deployments / 11 families / 4 networks. Health-check (~28% dead). Substreams for triggers. Honesty log of unbuilt features. |
| [Pista](https://ethglobal.com/showcase/pista-us51n) | Graph AI **1st** | Custom Rust Substreams → ClickHouse → agent that can pause/blacklist. |
| [Deeptrace](https://ethglobal.com/showcase/deeptrace-7fqoz) | Graph AI **3rd** | Messari standardized + custom indexer + pin deployment IDs + SKILL.md + fail-soft. **Floor for a $1k AI place.** |
| [MuralClash](https://ethglobal.com/showcase/muralclash-s8si2) | Graph 2nd NY 2025 | Custom subgraph as the collaboration engine. **Historical.** 2026 Standardized explicitly DQs “simply querying one Subgraph.” |

**Why it is rank 5, not a hard skip:** official Subgraph MCP + subgraph/substreams skills are the strongest live data agent surface in the field. Density is still a tax — wrappers of the official MCP lose. Keep Graph in the five so a coding agent can build a *composed* data plane if that is one of the three form picks. Do not pick Graph if the demo is “we asked the MCP one question.”

---

### 3.6 Uniswap Foundation — DO NOT PICK

**Page:** [prizes/uniswap-foundation](https://ethglobal.com/events/ethonline2026/prizes/uniswap-foundation)

| Track | Pay | SF? | Call |
|---|---|---|---|
| Best Stack Contribution | Up to 3 × $1,000 | Yes | SKIP unless Uniswap is already load-bearing |
| Continuity | $1k / $1k | No | IGNORE |

**They expect:** any Uniswap stack piece (API, v2/v3/v4, CCA, hooks, official-repo PRs). Public repo + **`FEEDBACK.md`** + [hackathon feedback form](https://developers.uniswap.org/hackathon-feedback). README must point to contracts/lines.

**“Up to 3” vs volume:** ETHOnline-scale × “we swapped” = hundreds of applicants for at most three $1k checks. They can award 0–3. Paperwork DQ is real; it is not an edge.

#### What winners included

| Project | Prize | What won |
|---|---|---|
| [P.A.T](https://ethglobal.com/showcase/p-a-t-s0c42) | v4 Volatile-Pairs Hooks **1st ($4k)** BA | Prop AMM via hooks + Oasis TEE batching + Pyth. New **venue type**. Wrong analog for a $1k “up to 3” bag. |
| [Unify Finance](https://ethglobal.com/showcase/unify-finance-9dipd) | Integrations **1st** | `ISubscriber` LP reputation. Underused primitive. |
| [UnifAI](https://ethglobal.com/showcase/unifai-d0unn) | Integrations **3rd** | Agent that also deploys v4 pools. **2026 loser shape** if that is your Uniswap story. |

**Take only** if a hook / CCA / Subscriber / API router is already in the product and you can spend two hours on FEEDBACK.md. Do not add a swap to justify the slot.

---

### 3.7 1inch Aqua — OUTSIDE THE FIVE (flex only)

**Page:** [prizes/1inch](https://ethglobal.com/events/ethonline2026/prizes/1inch)

| Track | Pay | SF? | Call |
|---|---|---|---|
| Build an Aqua App | $2.5k / $1.5k / $1k | Yes | SKIP unless SwapVM-ready yesterday |
| Continuity | $1.5k / $500 | No | IGNORE |

**They expect:** official Aqua/SwapVM (modified SwapVM redeploy OK). Onchain token transfers in the demo (forks OK). No single-commit dump. **SwapVM scores higher.**

#### What winners included (Lisbon = same rules)

| Place | Project | What 1inch paid for |
|---|---|---|
| 1st $2.5k | [ArcBook](https://ethglobal.com/showcase/arcbook-twp2a) | New position type as SwapVM. Custom instruction. `Aqua.ship` self-custody. Foundry + Python reference model. Onchain fills. |
| 2nd $1.5k | [Votive](https://ethglobal.com/showcase/votive-p78qo) | **7 custom opcodes**. Browser refuses `ship` unless `keccak(program)` matches router. |
| 3rd $1k | [KSwap-VM](https://ethglobal.com/showcase/kswap-vm-aix5n) | Formal semantics. Found bugs. Almost no UI. Still placed. |
| Did not place | [Aqua Prime](https://ethglobal.com/showcase/aqua-prime-p8wjj) | Custom opcode + AI desk + ~60 tests. **Lost.** SwapVM alone is not enough if the idea is “MM desk with knobs.” |

Wrong skill tree for an x402 marketplace. Stock XYC + React form loses to anyone who added one opcode.

---

### 3.8 Privy — DO NOT PICK

**Page:** [prizes/privy](https://ethglobal.com/events/ethonline2026/prizes/privy)

| Track | Pay | SF? | Call |
|---|---|---|---|
| Best B2B financial product | **Single $2,500** | Yes | SKIP as a slot |
| Best financial flow | **Single $2,500** | Yes | SKIP as a slot |

**They expect:** Privy as core; ≥1 wallet. B2B: one live org workflow **plus** one control (policies, signers, key quorums, or intents). Flow: one **live GA** money movement (transfer, bridge, swap, Earn, onramp). Mocked Cards do not count.

**Contradiction resolved in debate:** Privy is a slam dunk to **qualify**, not to **win**. Two singles in the densest wallet category. Density estimate: 150–210 entries, P(win) **3–8%**. Intents / manual approvals may be Enterprise-gated; policies + additional signers are the 4-day B2B path if you ever needed it.

Winners (older / other labels): Trade Royale (agent holds funds), PrivyCycle / Perkly (consumer UX). Swirl used Privy as **login only** — that would lose ETHOnline B2B.

---

### 3.9 Ledger — DO NOT PICK (no device in the plan)

**Page:** [prizes/ledger](https://ethglobal.com/events/ethonline2026/prizes/ledger) · [developers.ledger.com/ethonline](https://developers.ledger.com/ethonline)

| Track | Pay | SF? | Call |
|---|---|---|---|
| AI Agents × Ledger | $2k / $1k / $500 | Yes | SKIP unless Nano is on the desk today |
| Continuity | $1k / $500 | No | IGNORE |

**They expect:** Ledger Agent Stack, specifically **`wallet-cli ring`**. Secrets the agent cannot leak. Key Ring on a host with no USB (VPS/CI). Feedback doc required.

Winners: [Lunave](https://ethglobal.com/showcase/lunave-5xkf2) (device is the control plane; custom BOLOS), Shivansh ledger-agent-payables (human signs policy once; agent spends inside it), Aledgerly (DX / ERC-7730 feedback as the prize). [maki](https://ethglobal.com/showcase/maki-564eg) is the architecture (LLM never signs) but was a Finalist, not confirmed Ledger cash.

No device ⇒ cannot honestly demo `ring init`.

---

### 3.10 Arc / Circle — DO NOT PICK

**Page:** [prizes/arc](https://ethglobal.com/events/ethonline2026/prizes/arc)

| Track | Pay | SF? | Call |
|---|---|---|---|
| Best DeFi / Onchain Finance | **Single $1,667** | Yes | SKIP as slot reason |
| Best Agentic Economy (Agent Stack) | **Single $1,667** | Yes | SKIP as slot reason |
| Launch Testnet → Mainnet | $2.5k / $1k | Yes | Only if you will redeploy 16–30 Sep |
| Continuity tracks | $1,666 / $1,500 | No | IGNORE |

**They expect:** USDC-native flows that require Arc (USDC-as-gas, Circle Wallets, Agent Stack, Nanopayments, Gateway, CCTP, StableFX). FE + BE + architecture diagram. Video that **names Circle tools**.

**Mainnet clause:** “deployed or deployment-ready on Arc mainnet by **September 30**.” Public mainnet is **16 September 2026** ([Circle](https://www.circle.com/pressroom/circle-announces-founding-validator-cohort-and-major-integrations-for-arc-ahead-of-september-16-mainnet-launch)). Sept 13 video is testnet. Sept 16–30 is a post-submit job.

**Critical signal:** [Justify](https://ethglobal.com/showcase/justify-pob50), [OpenCompliance](https://ethglobal.com/showcase/opencompliance-b89x9), [SENTINEL](https://ethglobal.com/showcase/sentinel-91nv5) all **used Arc and won other partners**. Deploying on Arc is not an Arc prize. Cannes: 69 teams; HackMoney: 155 teams. 4 of 6 featured Cannes winners depended on nanopayments as the *economic* reason the product exists.

Same “agent pays for an API” job as Hedera, worse structure (singles, higher density). Hedera 3 × $2,000 wins that comparison.

---

### 3.11 Bazantic — DO NOT PICK

**Page:** [prizes/bazantic](https://ethglobal.com/events/ethonline2026/prizes/bazantic)

| Track | Pay | SF? | Call |
|---|---|---|---|
| Best Recipe (sponsor APIs) | $500 / $300 / $200 | Yes | SKIP |
| Agentify a new API | $500 / $300 / $200 | Yes | SKIP |
| Help an Agent Use Your Project | Up to 2 × $500 | No | IGNORE |

Checklist prize: bazantic.com account, x402/MPP Gateway, Recipe, username in submission, screen recording. First ETHGlobal appearance; no winner corpus. Ceiling $1,000 only if you take **both** 1sts. Opportunity cost is a $5k–$15k partner slot. Optional last-day wrap **only** if a slot is unused — do not design around it.

---

## 4. Cross-event judging pattern (what actually gets paid)

Every scrape agent independently converged on the same sentence:

> **The sponsor primitive is the product constraint. Wrappers lose.**

| Sponsor | Winning constraint | Losing wrapper |
|---|---|---|
| Hedera | HCS/HTS/x402/Scheduled Tx **enforce** the rule; HashScan link a judge can open | “Deployed on Hedera because fees are low” |
| World | Proof **changes authorization** (cannot start / cannot pay) | IDKit as login |
| Chainlink | Secret/policy in TEE → onchain or pay-path change | Hello-world `handlerInTee` |
| Graph | One query, N protocols; live; provenance | Official MCP chat |
| Uniswap | Hook / Subscriber / new venue | Swap widget |
| ENS | Name **is** identity, policy, or directory | Address-book `.eth` |
| Ledger | Device is the control plane | Connect-Ledger button |
| Privy | Wallet + **policy/quorum/intent** | Email login |
| Arc | USDC-native flow that needs Arc | Solidity on Arc RPC |
| 1inch | New SwapVM position type | Stock XYC UI |
| Bazantic | Recipe is the only A/B difference | Gateway with no proof |

Also paid, repeatedly: public recomputation (Mirror Node / explorer), honest “what we did not build,” commit history, feedback docs when asked (World, Uniswap, Ledger).

---

## 5. Easiest to target vs do not choose

### Easiest **to qualify** (not the same as easiest to win)

1. Privy financial flow — email wallet + live transfer  
2. Uniswap — one swap + FEEDBACK.md  
3. Bazantic Recipe — form + gateway + video  
4. Hedera x402 — if you fork the official PoC and actually pay once through Blocky402  
5. Chainlink Confidential — if you run the hello template with a real secret on the hot path  

### Easiest **to win** (P(win | qualify), Start Fresh, 4 days)

| Rank | Partner | Why |
|---:|---|---|
| 1 | **Hedera AI** | 3 seats, live-service filter, they asked for services, July bounty already trained judges on metering/HCS |
| 2 | **World Selfie** | 3 seats, beta + feedback tax — **only if flag is on** |
| 3 | **Hedera Harness** | 2 seats, 1-star repo, contribution track |
| 4 | **ENS v2** | 4 places, protocol filter DQs stickers |
| 5 | **Chainlink Confidential** | 2 seats, TEE filter, templates exist |
| 6 | **Chainlink challenge** | Objective, 1 winner, cheap bolt-on — lottery, not a plan |
| 7 | Ledger | Ranked 3, hardware filter — need a device |
| 8 | 1inch Aqua | Thin field, high skill floor — **not in the five** unless SwapVM |
| 9 | The Graph | In the five; medals are real; official-MCP wrappers flood the AI track |
| 10 | Uniswap / Privy / Arc | Lottery or singles — outside the five |

### Do not choose (this team, this weekend)

| Partner | Why it is outside the top 5 |
|---|---|
| **Privy** | Slam dunk to qualify. Two $2,500 **singles**. 3–8% to win. No first-party MCP pack worth grounding an agent on. |
| **Uniswap** | Lottery. Official `uniswap-ai` skills exist; adding a swap to justify a slot is how you lose the slot. |
| **1inch** | Official MCP is excellent. Aqua prize wants **SwapVM opcodes**, which that MCP does not generate. Flex only. |
| **Arc** | $1,667 singles. Justify/OpenCompliance/SENTINEL used Arc and won elsewhere. Mainnet-by-30 is a second job after submit. |
| **Bazantic** | Slot returns pizza money. |
| **Ledger** | Official DMK skills exist. Needs a device on the desk. |
| **Hedera ATS** | Legal on a Hedera pick, but a week of studio/compliance work. NYC tokenization winners used raw HTS; ETHOnline now **requires ATS**. |
| **All Continuity tracks** | Start Fresh cannot win them. |

World and The Graph were in this kill list when the conclusion was a locked trio. They are **in the five** now: World because docs/portal MCP + IDKit/AgentKit skills make the Selfie/AgentKit path agent-buildable; Graph because Subgraph MCP + official skills make a composed data plane agent-buildable. Density and the Selfie flag still decide **which 3 of 5** go on the form.

---

## 6. Debate — contradictions and how they died

### 6.1 Opening positions

| Agent | Wanted |
|---|---|
| Hedera scrape | Hedera AI + harness stretch |
| World/Ledger/Privy scrape | Privy always; Ledger iff device; World iff flag |
| Chainlink/ENS scrape | Confidential + challenge + ENS if namespaces |
| Graph/Uniswap/1inch scrape | Graph; skip Uniswap/1inch |
| Arc/Bazantic scrape | Skip both; Hedera > Arc for agent-pays-API |
| Density | Hedera + World + ENS (~55–65% if quals) |

### 6.2 Steelman vs attack (condensed)

**Graph TAKE** is correct if Graph is load-bearing (composed / standardized / reusable MCP-or-SKILL infra). **Graph is a flood** is correct for “we queried one subgraph.” That is why Graph is **rank 5 in the five**, not a form default and not a hard skip.

**Privy slam dunk** is P(valid submission). **Privy 3–6%** is P(win a single). Goal is the second number. Opportunity cost vs ENS’s 4 places or Chainlink’s 2 TEE seats is decisive. Privy stays **outside** the five.

**World TAKE** assumes the Selfie flag. **World SKIP on the form** assumes the gate is off. Official Selfie Check docs require a World POC to enable the beta flag. World stays **in the five** because the official MCP/skills pack is now vendored; the form pick is still flag-conditional.

**ENS “Lisbon already won this”** is true for “first.” It is false for “central hierarchical identity.” Cosmetic ENS still DQs. Discovery of x402 services is a namespace problem. Four places remain.

**Chainlink CRE ramp** can eat a day. Templates + CLI simulation + already-live `join()` make it a no-gate, multi-winner closer that shares a spine with Hedera. If CRE chokes, pick three from Hedera, ENS, World, Graph instead. There is no locked fourth partner — the five exist so Friday can still choose.

### 6.3 Old 3-lock (superseded) and current five

The debate originally locked:

| Old slot | Partner | Tracks hunted |
|---|---|---|
| 1 | Hedera | AI & Agentic Payments. Harness PR stretch only. |
| 2 | ENS | Best Use of ENSv2. |
| 3 | Chainlink | Confidential Workflow + liquidation `join()`. |

**Do not use that table as the plan.** Current working set:

| Rank | Partner | When it earns a form slot |
|---|---|---|
| 1 | **Hedera** | Default include if the product pays on Hedera. |
| 2 | **ENS** | Default include if names are the directory. |
| 3 | **Chainlink** | Include when TEE is on the pay/decide path. |
| 4 | **World** | Include when Selfie Check is already flag-enabled. |
| 5 | **The Graph** | Include when composed/live Graph data is load-bearing. |

Submit **any 3**. Example combinations: Hedera+ENS+Chainlink · Hedera+ENS+World · Hedera+ENS+Graph · Hedera+World+Graph · ENS+Chainlink+World.

**Consensus P(≥1) if quals met:** ~45–65% depending on which 3 of 5 and whether World’s flag / Graph’s composition bar are actually hit.  
A Graph+Uniswap+Privy trio for a similarly strong team: ~15–22%.

Residual dissent from the original lock is documented above. The MCP scrape is why World and Graph are no longer “contingency / do not pick.”

---

## 7. One product that can farm any 3 of the top 5

**ENSv2-addressable, HCS-receipted x402 service directory.** Optional modules: confidential spend brain, human gate, composed Graph data plane.

Spine: **discover → (optional: decide in private / prove a human) → pay → receipt.** Build one app. Attach three of the five primitives as load-bearing, not stickers.

1. **Hedera.** Live metered service (inference, data, or compute — **not** flat $0.001). x402 **v2** via **Blocky402**. Consuming agent completes one paid request on camera. Payment receipts on **HCS** a judge can recompute from Mirror Node. Clone **Pinout / Tally metering**, not AgentRouter. Optional: harness PR for a DX bug you actually hit. Skip ATS. Skills: `x402-payments`, HTS/HCS, hosted MCP.
2. **ENS.** Each agent and each service is an ENSv2 hierarchical name on Sepolia. Wildcard off the parent. Permissioned Resolver holds endpoint, price, HCS topic. EAC so a controller can edit *only* those records. Live resolve in the video. This *is* the directory Hedera’s extra-points list asks for. Skills: `ens-protocol`, `ensskills`, `ens-cli`.
3. **Chainlink.** CRE `handlerInTee` holds API secrets, budget caps, risk thresholds. Agent pays only when the enclave says so. Same engine can `join()` official ChallengeLending `0x88574e7Cc0027afd04951daa09B64d4441931ba1` (not the dead ETHOnline scrape). Simulation logs in the submission. Skill: `chainlink-cre-skill`.
4. **World.** Selfie Check gates who may list a service or authorize spend — risk/eligibility/abuse, not login. AgentKit/`agentkit.fetch` if the agent is human-backed. Feedback doc they asked for. Docs MCP + portal MCP + IDKit `^4.x`. Only a form pick if the Selfie flag is on.
5. **The Graph.** Live composed data: Standardized / Messari-shaped query across protocols, **or** Subgraph + Substreams (or MCP + a SKILL) as the agent’s data plane. Pin deployment IDs. Fail-soft. Official MCP wrappers with no composition lose.

Do not build five apps. Do not add Uniswap or Privy “for extra points.” 1inch stays flex unless the product is a SwapVM position type.

---

## 8. Build order (flexible across the five)

Ship the spine first. Attach whichever 3 of 5 you will actually select.

| When | Ship | Done when |
|---|---|---|
| **Wed–Thu** | Hedera x402 v2 + paying agent + Blocky402 | HashScan of a real settle if Hedera is one of the three. |
| **Thu–Fri** | ENSv2 registry / resolver / EAC as the live directory | Demo resolves live names, no hardcodes, if ENS is one of the three. |
| **Fri–Sat (pick one primary closer)** | CRE `handlerInTee` on the pay path, **or** World Selfie + feedback, **or** composed Graph query/pipeline | Qual evidence for that partner. |
| **Sat–Sun** | Metering, HCS receipts, second closer if time, 2–4 min human-voiced ≥720p video | README maps timestamps to each selected partner’s qual list. |

Probe Blocky402 `GET https://api.testnet.blocky402.com/supported` on day one if Hedera is in play. Two ECDSA Hedera testnet accounts. Commit every day. Attribute AI. On the form, select **exactly three** from {Hedera, ENS, Chainlink, World, The Graph} and name every track you hit. Do not pre-print the trio in the README until submit day.

---

## 9. Per-track qualification checklists (paste into the submission)

Filled Nametoll evidence for the locked trio is in [`docs/submission.md`](submission.md). Empty boxes below are the partner-form template, not current status.

### Hedera — AI

- [ ] Live URL, not localhost  
- [ ] x402 v2 + **Blocky402** facilitator  
- [ ] Agent/platform paid at least once  
- [ ] HashScan tx + HCS topic id in README  
- [ ] Metering or refund (not only flat fee)  
- [ ] Demo shows the paid request executing  

### Hedera — Harness (stretch)

- [ ] Open PR or new harness with before/after DX  
- [ ] Tests or examples  
- [ ] Demo of the improvement  

### ENS

- [ ] ENSv2 Sepolia, not v1  
- [ ] Hierarchy or EAC or Permissioned Resolver **demoed**  
- [ ] No hardcoded name/address on the happy path  
- [ ] Video + live URL + public GitHub  

### Chainlink

- [ ] `handlerInTee` / `HandlerInTee` in the repo  
- [ ] `getSecret` inside the enclave  
- [ ] Feature does not work without that secret/threshold  
- [ ] `cre workflow simulate` log (Nitro / `us-west-2` banner if shown)  
- [ ] Something user-visible or onchain changes because of the TEE verdict  
- [ ] `join()` tx if chasing $500  
- [ ] No Functions / Automation  

### World (form pick only if Selfie flag is on)

- [ ] Selfie Check used as risk/eligibility/abuse, not login  
- [ ] Preset `selfieCheckLegacy`, IDKit `^4.x`  
- [ ] Feedback doc (docs, portal, sandbox, errors)  
- [ ] Working app tested in sandbox  
- [ ] AgentKit / AgentBook only if that path is actually demoed  

### The Graph

- [ ] Live Studio / Market data, not mocks  
- [ ] Composable: one query shape across protocols **or** two+ Graph products (e.g. Subgraph + Substreams, or Standardized + MCP)  
- [ ] AI track: reusable MCP/SKILL infra, not a one-off chat  
- [ ] Deployment IDs pinned; fail-soft if an indexer is down  
- [ ] Schema fetched via official Subgraph MCP — no invented entities  

---

## 10. Source index

**Official 2026**  
[Details](https://ethglobal.com/events/ethonline2026/info/details) · [Prizes](https://ethglobal.com/events/ethonline2026/prizes) · [Hedera](https://ethglobal.com/events/ethonline2026/prizes/hedera) · [ENS](https://ethglobal.com/events/ethonline2026/prizes/ens) · [Chainlink](https://ethglobal.com/events/ethonline2026/prizes/chainlink) · [World](https://ethglobal.com/events/ethonline2026/prizes/world) · [Graph](https://ethglobal.com/events/ethonline2026/prizes/the-graph) · [Uniswap](https://ethglobal.com/events/ethonline2026/prizes/uniswap-foundation) · [1inch](https://ethglobal.com/events/ethonline2026/prizes/1inch) · [Privy](https://ethglobal.com/events/ethonline2026/prizes/privy) · [Ledger](https://ethglobal.com/events/ethonline2026/prizes/ledger) · [Arc](https://ethglobal.com/events/ethonline2026/prizes/arc) · [Bazantic](https://ethglobal.com/events/ethonline2026/prizes/bazantic)

**Hedera / x402**  
[x402 bounty winners](https://hedera.com/blog/x402-bounty-on-hedera-winners-announced/) · [Hedera + x402](https://hedera.com/blog/hedera-and-the-x402-payment-standard/) · [Q4 2025 winners](https://hedera.com/blog/quarterly-events-highlights-q4-2025-october-december/) · [x402 PoC](https://github.com/hedera-dev/x402-inference-pay-per-request-poc) · [Blocky402](https://blocky402.com/docs/introduction/) · [Harness](https://github.com/hedera-dev/hedera-harness) · [ATS](https://github.com/hashgraph/asset-tokenization-studio)

**Showcase pages cited:** SaucerHedge, HyperAgent, Dark Matter Markets, Price Feed Plugin, Incendia, Vouch, AgentRouter, CashMeIfYouCan, Atlas, Kondor, ENSignv2, Namesake, VouchMe, OpenCompliance, Meridian, ENShell, SENTINEL, Justify, Proof-of-Human Drops, pinch, HORS, HumanMandate, Lunave, maki, P.A.T, Unify Finance, UnifAI, ArcBook, Votive, KSwap-VM, Aqua Prime, Deeptrace, Pista, Am I cooked, MuralClash, Cumulant.

**Working set is the top 5 integrable partners:** Hedera, ENS, Chainlink, World, The Graph. Submit any 3. Agent-build rules and live MCP/skill paths: [docs/partners/README.md](partners/README.md) and [AGENTS.md](../AGENTS.md).
