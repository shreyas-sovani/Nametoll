# Chainlink CRE sources (B9–B10, B15, B19)

Official surfaces only. No hosted CRE MCP.

| What | Where |
| --- | --- |
| Skill | `.agents/skills/chainlink-cre-skill/SKILL.md` |
| TEE rules | `.../references/confidential-workflows.md` · `docs/partners/chainlink/confidential-workflows-official.md` |
| Scaffold | `cre templates list` → `hello-confidential-workflows-ts` |
| Context7 | `/llmstxt/chain_link_cre_ts_llms-full_txt` |
| Project | `cre/` (template tree). Workflow dir `cre/nametoll-brain/` |

## What exists

- `cre.handlerInTee` + `TeeRuntime` + `runtime.getSecret({ id: "SPEND_CAP" })`
- Optional enclave secrets `BUYER_ALLOWLIST` / `RATE_LIMIT` (B19). Empty extras stay cap-only. Desk spawn defaults those env names to empty so simulate still boots.
- HTTP trigger (`HTTPCapability`). Simulation: `cre workflow simulate … --target staging-settings`
- Public verdict `{ allow, maxTinybars, reason }`. Reasons: under/over cap, buyer not allowlisted, rate limited. Secret never logged.
- Desk Gate asks Brain **before** Blocky402 settle. Deny → HTTP 403, no merchandise, no HCS bill.

## What does not exist

- `ConfidentialHTTPClient` inside the TEE handler
- Secrets through `usingTheDons()`
- Mainnet CRE deploy (private beta)
- Functions / Automation

## Simulate (needs `cre login`)

```bash
cp cre/.env.example cre/.env   # set SPEND_CAP_TINYBARS_VAR; never commit
cd cre/nametoll-brain && bun install && bunx cre-setup && cd ..
cre workflow simulate nametoll-brain \
  --non-interactive --trigger-index 0 \
  --http-payload '{"requestedTinybars":"100000"}' \
  --target staging-settings
```

From repo root: `npm run cre:simulate` writes redacted logs next to this file.

Committed 11–12 Sep 2026 (CLI v1.33.0, `--target staging-settings`):

| Request | Verdict | Log |
| --- | --- | --- |
| 100000 | allow / under cap | `simulate-allow.log` |
| 200000 | deny / over cap | `simulate-deny.log` |
| 100000 + payer `0.0.9` vs allowlist `0.0.1` | deny / buyer not allowlisted | `simulate-allowlist-deny.log` |
| 100000 + `paysThisHour=2` vs `RATE_LIMIT=1` | deny / rate limited | `simulate-rate-deny.log` |

All four logs show `Trigger requested TEE Execution` / AWS Nitro `us-west-2`, not a normal `handler`. Cap `150000` tinybars. Policy runs pass `--env` so empty `cre/.env` extras do not wipe the dummy allowlist/rate.

## Desk

```bash
curl -sS "http://127.0.0.1:8787/desk/brain?tinybars=100000"
npm run brain -- 100000
```

Set `CRE_BRAIN_URL` (live HTTP trigger) or `CRE_PROJECT_DIR=cre` (simulate). If neither is set **and** `cre/project.yaml` exists, the desk process defaults to `./cre`. If CRE is still missing, Brain fails closed and paid snapshots return 403 — the desk does not skip the TEE.

Desk Brain **caches successful verdicts per amount + payer + hour-count for 60s** (`GET /health` → `brain.verdictTtlMs`). A cold `cre workflow simulate` is ~9s; repeats of the same key reuse that attested result until TTL or process restart. Failures (`TEE unavailable`, simulate timeout after 25s, not-logged-in) are **not** cached. Boot warms `PRICE_TINYBARS` × 1 and × 2. A judge asking “does the enclave see every request?”: no — it sees every **amount/payer/hour** in the TTL. Deny/allow still comes from the TEE.

`GET /desk/join` runs the same HTTP TEE handler with `{ "action": "join" }` and returns unsigned calldata. Broadcast with `npm run join`. Live Sepolia tx: https://sepolia.etherscan.io/tx/0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086
