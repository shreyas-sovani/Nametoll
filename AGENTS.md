# Agent build rules for this repo

Focus on the **top 5 integrable partners**: Hedera, ENS, Chainlink, World, The Graph.

ETHOnline’s form still allows only **3** partner prizes. Do not lock which 3. Build against official MCP / skills / `llms.txt` for the five. Pick any 3 of them on submit.

Read `docs/partners/README.md` and `docs/analysis.md` before writing partner code. Analysis was revised 10 Sep 2026 to drop the old Hedera+ENS+Chainlink lock.

Product (Nametoll): `docs/PRD.md` then `docs/BACKLOG.md`. Implement tickets in ID order. Pull APIs from `.agents/skills/` / `vendor/` and live MCP IDs in `docs/partners/README.md`. Do not invent symbols.

## The five

| Rank | Partner | Official agent surface |
| --- | --- | --- |
| 1 | Hedera | Docs MCP, testnet network MCP, `vendor/hedera-skills` |
| 2 | ENS | `llms.txt`, Context7, `ens-cli` MCP, `ensskills` |
| 3 | Chainlink | `chainlink-cre-skill` (no hosted CRE MCP) |
| 4 | World | Docs MCP, Developer Portal MCP, IDKit skill, AgentKit skills |
| 5 | The Graph | Subgraph MCP, subgraph + substreams skills |

1inch is vendored under `vendor/1inch-ai` as **flex only**. Do not treat it as a sixth member of the five. Aqua MCP is analytics, not SwapVM.

Do not invent SDK methods, MCP tools, CLI flags, contract addresses, or prize-track features.

## Before writing any partner code

1. Confirm the partner is one of the five (or explicit 1inch SwapVM work).
2. Open the matching skill under `.agents/skills/` or `vendor/`.
3. Use the live MCP / Context7 IDs in `docs/partners/README.md`.
4. If a symbol is not in the skill or the live docs, it does not exist.

## Hard no-invent list (all five)

- **Hedera:** not a blockchain. Prefer `@hiero-ledger`. Hosted network MCP is testnet-only and RETURN_BYTES. x402 v2 `exact`, tinybars, fee-payer from `GET /supported`.
- **ENS:** ENSv2 on Sepolia (Permissioned Resolver / EAC / hierarchical registries). `ens-cli` writes emit unsigned calldata. Community ENS MCPs are not ENSv2-ready.
- **Chainlink:** CRE Confidential Workflows: `handlerInTee` + `cre workflow simulate`. Do not mix `ConfidentialHTTPClient` into a TEE handler. No mainnet CRE deploy.
- **World:** IDKit `^4.x`. Selfie Check needs the portal flag (`selfieCheckLegacy`). AgentBook lookup is World Chain `eip155:480`. Never paste signing keys into chat.
- **Graph:** fetch schemas via Subgraph MCP. Do not invent entity names. Composition or reusable MCP/SKILL infra — not one decorative query.

## Local sources

See `vendor/SOURCES.md`.
