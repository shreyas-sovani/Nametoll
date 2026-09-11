# Chainlink CRE sources (B9–B10)

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
- HTTP trigger (`HTTPCapability`). Simulation: `cre workflow simulate … --target staging-settings`
- Public verdict `{ allow, maxTinybars, reason }`. Secret never logged.
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

Committed 11 Sep 2026 (CLI v1.33.0, `--target staging-settings`):

| Request | Verdict | Log |
| --- | --- | --- |
| 100000 | allow / under cap | `simulate-allow.log` |
| 200000 | deny / over cap | `simulate-deny.log` |

Both logs show `Trigger requested TEE Execution` / AWS Nitro `us-west-2`, not a normal `handler`. Cap `150000` tinybars.

## Desk

```bash
curl -sS "http://127.0.0.1:8787/desk/brain?tinybars=100000"
npm run brain -- 100000
```

Set `CRE_BRAIN_URL` (live HTTP trigger) or `CRE_PROJECT_DIR=cre` (simulate). If neither is set **and** `cre/project.yaml` exists, the desk process defaults to `./cre`. If CRE is still missing, Brain fails closed and paid snapshots return 403 — the desk does not skip the TEE.

`GET /desk/join` runs the same HTTP TEE handler with `{ "action": "join" }` and returns unsigned calldata. No broadcast.
