# Partner shortlist — top 5 integrable

Filter: **most winnable** among partners that publish official MCP / Agent Skills / `llms.txt`, so a coding agent can build against real APIs.

ETHOnline still lets you pick **only 3 partners** on the form. This repo does **not** lock a trio. The working set is these five. Prize analysis lives in `docs/analysis.md` (revised 10 Sep 2026; the old Hedera+ENS+Chainlink lock is superseded).

| Rank | Partner | Why it is here | Agent surface (official only) |
| --- | --- | --- | --- |
| 1 | **Hedera** | Best P(win ≥ 1). x402 + Agent Kit + HCS/HTS. | Docs MCP + hosted network MCP + skills + x402 PoC |
| 2 | **ENS** | ENSv2 / Permissioned Resolver / EAC is the prize, not “used ENS”. | `llms.txt` + Context7 + `ens-cli` MCP + `ensskills` |
| 3 | **Chainlink** | Confidential Workflows + `handlerInTee` + `cre workflow simulate`. | Official CRE skill. No hosted CRE MCP. |
| 4 | **World** | Selfie Check + AgentKit is a real gate. Strong if the portal flag is on. | Docs MCP + Developer Portal MCP + IDKit skill + AgentKit skills |
| 5 | **The Graph** | Best live data MCP in the field. Density tax on win rate. | Subgraph MCP + official subgraph/substreams skills |

**Outside the five (vendored only):** **1inch** — production MCP at `https://api.1inch.com/mcp/protocol` + 9 official skills. Aqua MCP is **analytics**, not SwapVM. Do not promote into the five unless the product is a SwapVM position type.

Out of the 5 for now: Ledger (device), Privy (qualify ≠ win), Uniswap (lottery), Arc, Bazantic.

Copy `docs/partners/mcp.json.example` → `.cursor/mcp.json` and fill keys locally. Do not commit secrets.

---

## 1. Hedera

Hedera is a public hashgraph, not a blockchain. New JS: `@hiero-ledger`. **HBAR** uppercase singular; **tinybars** lowercase plural.

| Server | URL | Notes |
| --- | --- | --- |
| Docs | `https://docs.hedera.com/mcp` | SearchHedera. No key. |
| Network (testnet) | `https://agentic-testnet-mcp.hedera.com/mcp` | Header `x-hedera-account-id: 0.0.…`. RETURN_BYTES. Never send a private key. |

Skills: `vendor/hedera-skills` (also in `.agents/skills/`). Prize-relevant: `x402-payments`, `hedera-token-service`, `hedera-consensus-service`, `hts-system-contract` (`0x167`), `hss-system-contract` (`0x16b`), Agent Kit plugin/hook/policy, Harness, hackathon validator.

x402: v2 `exact` only. Facilitator `GET /supported` → `POST /verify` → `POST /settle`. Blocky402 testnet `https://api.testnet.blocky402.com`. Fee-payer must match `/supported`. Asset `0.0.0` = HBAR. PoC: `vendor/x402-inference-pay-per-request-poc`.

Docs index: `docs/partners/hedera/llms.txt`. Context7: `/websites/hedera`, `/hashgraph/hedera-docs`.

---

## 2. ENS

Prize = ENSv2 on Sepolia (hierarchical registries, Permissioned Resolver, EAC). Resolving a `.eth` name is not enough.

| Surface | Where |
| --- | --- |
| Building with AI | https://docs.ens.domains/building-with-ai/ |
| `llms.txt` | https://docs.ens.domains/llms.txt — snapshot `docs/partners/ens/llms.txt` |
| Context7 | `/ensdomains/docs` |
| CLI / MCP | `vendor/ens-cli` — `ens --mcp`, `ens mcp add`, `ens skills add` (experimental, not on npm) |
| Skills | `vendor/ensnode/packages/ensskills` — `ens-protocol`, `omnigraph`, `enscli`, `enssdk`, `enskit` |

Writes from `ens-cli` are unsigned `{to,data,value}`. Deploy the owner Permissioned Resolver before registering with a zero resolver. `--reverse-record` is ENSv1-only. Community ENS MCPs are not ENSv2-ready.

---

## 3. Chainlink

If the workflow is a normal CRE cron outside a TEE, it misses the new gate.

- Skill: `vendor/chainlink-agent-skills/chainlink-cre-skill/SKILL.md` (installed as `chainlink-cre-skill`)
- TEE rules: `.../references/confidential-workflows.md` and `docs/partners/chainlink/confidential-workflows-official.md`
- Scaffold: `cre init -t hello-confidential-workflows-ts`
- Simulate: `cre workflow simulate` (always pass `--target` when the CLI accepts it)
- Deploy is private-beta enrollment

No official hosted CRE MCP. Context7: `/llmstxt/chain_link_cre_ts_llms-full_txt`. Do not call `ConfidentialHTTPClient` from `handlerInTee`.

---

## 4. World

Card: `docs/partners/world/mcp.md`. Live index: https://docs.world.org/llms.txt

| Server | URL | Auth |
| --- | --- | --- |
| Docs | `https://docs.world.org/mcp` | None. Tool: `search_world_documentation` |
| Developer Portal | `https://developer.world.org/api/mcp` | `Authorization: Bearer api_...` — mutates apps |

Skills (installed):

- IDKit / Selfie Check: https://docs.world.org/world-id/SKILL.md
- `agentkit-x402` — agent client for x402 + AgentKit header
- `integrate-agentkit` — server hooks, `free` / `free-trial` / `discount`

Hard rules from official docs:

- Pin `@worldcoin/idkit` **`^4.x`**. v2/v3 samples are dead.
- Selfie Check preset = `selfieCheckLegacy`. If the portal flag is off, stop.
- AgentBook lookup is always World Chain `eip155:480`. Payments may be World Chain or Base.
- `npx @worldcoin/agentkit-cli register <agent-address>`
- Verify: POST the IDKit result unchanged to `https://developer.world.org/api/v4/verify/{rp_id}`
- Store `(action, nullifier)` with UNIQUE. Never log RP signing keys.

---

## 5. The Graph

Card: `docs/partners/graph/mcp.md`. Overview: https://thegraph.com/docs/en/ai-overview/

| Server | URL | Auth |
| --- | --- | --- |
| Subgraph MCP | `https://subgraphs.mcp.thegraph.com/sse` | Studio Gateway key, `Authorization: Bearer …` |

Skills (copied into `.agents/skills/`): `subgraph-dev`, `subgraph-optimization`, `subgraph-testing`, `substreams-dev`. Upstream: `vendor/subgraphs-skills`, `vendor/substreams-skills`.

Fetch schemas through MCP. Do not invent entities. Prize wants Standardized Subgraphs / composition / MCP as the data plane, not a single decorative query.

---

## Flex: 1inch

Card: `docs/partners/1inch/mcp.md`

- MCP: `https://api.1inch.com/mcp/protocol`
- Skills: `vendor/1inch-ai` (installed). Hub is `1inch-mcp-server`.
- Public: docs search + Aqua **analytics**. Swaps/orderbook need a Business Portal key.
- Aqua prize wants **SwapVM custom opcodes**. The MCP `aqua` tool does not write SwapVM. Do not pick 1inch as a slot unless you are building that.

---

## How an agent should build

1. Read this file and `AGENTS.md`.
2. Open the skill for the primitive.
3. Use the live MCP / Context7 ID to verify addresses, fee-payers, CLI flags, schemas.
4. If it is not in the skill or the live docs, **do not add it**.

Installed into `.agents/skills/` from official packs: Hedera marketplace, `chainlink-cre-skill`, `ensskills` @ ENSNode v1.15.2, World AgentKit, Graph subgraph/substreams, 1inch AI.
