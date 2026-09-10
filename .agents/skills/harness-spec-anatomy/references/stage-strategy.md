# Stage strategy

Enable **stages** in order. The default is **ASSERT only** so the first run
stays cheap. Add higher stages only after the lower ones are green. Terms:
[GLOSSARY.md](../GLOSSARY.md).

Upstream source of truth:
[docs/authoring-a-recipe.md](https://github.com/hedera-dev/hedera-harness/blob/dev/docs/authoring-a-recipe.md).
The shipped skeleton (`skeletons/project-harness/spec.yaml`) carries every stage
block as commented YAML — copy from there when the harness is installed rather
than from this page.

## Enable order

| Stage | Recipe file fields | What it checks | Host prerequisites |
|-------|--------------------|----------------|--------------------|
| **ASSERT** | `validators.static`, `validators.commands`, `requiredFiles`, `forbiddenFiles`, `secretScan` | Files, JSON/text, secrets, install/lint/build | Node ≥ 20, yarn, the agent CLI on PATH |
| **SMOKE** | `validators.playwright` | Dev server boots; routes reachable and actually rendered; no console errors; no forbidden text | `playwright` at the **project root** (`yarn add -D playwright`); browser (project Chromium or system Chrome) |
| **EVALUATE** | `eval` + `validator.enabled: true` | Agent grades numbered assertions | Playwright MCP usable headless (same browser as SMOKE) |
| **CHAIN** | `chainValidation` (+ EVALUATE) | Ephemeral ECDSA test signer; real txs; mirror verify | funded **ECDSA** testnet operator exported in the shell (`@hiero-ledger/sdk` ships with `hedera-harness`) |

Pass condition: every enabled **stage** must pass. EVALUATE **infrastructure**
failures (MCP or browser missing) **abort** the repair loop rather than counting
as app bugs — the harness will not burn attempts fixing code that was never
broken.

Run `hedera-harness doctor` (without `--recipe-only`) to check host
prerequisites — agent CLI, Playwright browser, MCP reachability — before
enabling a stage.

## SMOKE — thin Playwright smoke

```yaml
validators:
  playwright: .harness/validators/playwright-smoke.yaml
```

Smoke file shape:

```yaml
name: my-feature-smoke

server:
  command: yarn next:dev
  url: http://localhost:3000
  timeoutMs: 120000

defaults:
  failOnConsoleError: true

routes:
  - name: home
    path: /
  - name: feature
    path: /my-feature

forbidden:
  visibleText:
    - Internal Server Error
    - Application error
    - Unhandled Runtime Error
```

Rules:

- `server.command` / `server.url` match how the project actually starts
- one entry per critical route
- `forbidden.visibleText` for crash banners
- keep it thin — rich UX checks belong in the **evaluate checklist**

The stage enforces: server up, route reachable, page rendered (it polls for
hydrated body text), no console errors, no forbidden text. It exists to fail
fast before paying for an agent.

## EVALUATE — evaluate checklist + validator agent

1. Write `.harness/eval.json` (or one file per increment — see
   [eval-checklist-guide.md](eval-checklist-guide.md)).
2. Enable both keys:

```yaml
eval: .harness/eval.json
validator:
  enabled: true
```

Both are required. One without the other is a misconfigured **recipe** — and
note that `hedera-harness doctor --recipe-only` does **not** catch this pairing,
so `check-spec.sh` does.

The validator inherits the **agent preset** from `agent:` (default **claude**),
including how it receives Playwright MCP. Do not hand-write CLI flags or model
names into the recipe. If you find a `validator.provider` / `validator.command`
/ `validator.args` block, it is a leftover — drop it.

The validator is adversarial and told to fail on uncertainty. If it cannot reach
the browser it fails the assertion rather than guessing, so a passing EVALUATE
verdict means something.

A scalar `eval:` path grades every increment with the same checklist. For true
incremental grading, use a list 1:1 with `prd:`.

## CHAIN — on-chain (advanced, opt-in)

Only when the user wants real transactions graded. Requires EVALUATE. The
harness provisions an ephemeral funded ECDSA testnet account per run, injects
it as the scaffold burner wallet, and verifies effects against the **mirror
node** rather than UI toasts.

```yaml
chainValidation:
  enabled: true
  network: testnet            # mainnet is rejected by the loader
  operator:
    accountIdEnv: HEDERA_OPERATOR_ID
    privateKeyEnv: HEDERA_OPERATOR_KEY
  fundingHbar: 10
  sweepBack: true
  expose:
    browserLocalStorageKey: burnerWallet.pk
    envVars: []               # e.g. [DEPLOYER_PRIVATE_KEY] for Solidity templates
  # deploy:
  #   commands:
  #     - name: deploy-testnet
  #       command: yarn hardhat:deploy --network hederaTestnet
```

Checklist:

- `@hiero-ledger/sdk` ships with `hedera-harness`. Do not add it at the project
  root — that is unnecessary and has re-resolved other Yarn packages.
- operator is **ECDSA**, not ED25519 — ED25519 has no EVM alias
- env vars exported in the shell; never written into the workspace
- the project keeps the burner connector enabled so headless signing works
- evaluate-checklist assertions needing a real tx set `executableWithTestSigner: true`
- for Solidity: map `expose.envVars` and `deploy.commands` so contracts are
  deployed before the app is graded

`executableWithTestSigner` assertions are **inert** unless `chainValidation` is
enabled — do not mark them executable "for later" without enabling the block.

Lifecycle: one account per run directory, reused across repair and continue
attempts, best-effort sweep back to the operator at run end.

## Smoke before a full run

```bash
hedera-harness doctor .harness/spec.yaml --recipe-only   # recipe alone
hedera-harness doctor .harness/spec.yaml                 # + host prerequisites
hedera-harness validate .harness/spec.yaml
hedera-harness validate-semantic .harness/spec.yaml
hedera-harness run .harness/spec.yaml --max-attempts 3
```

Prefer `/review-harness-spec` on the **recipe** before burning generator
attempts.
