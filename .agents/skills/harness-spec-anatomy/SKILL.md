---
name: harness-spec-anatomy
description: Shared vocabulary for hedera-harness recipes — the files, the v3 defaults, the stages, and the blind/evaluate-checklist rule. Use when authoring or auditing a harness recipe, or when another skill needs the recipe vocabulary.
---

# Harness Spec Anatomy

Single source of truth for what a hedera-harness **recipe** is. Action skills
(`/create-harness-spec`, `/review-harness-spec`) reach here for vocabulary;
they own workflow. Use the bold terms from [GLOSSARY.md](GLOSSARY.md) exactly.

Targets **hedera-harness schemaVersion 3**. Older recipes hard-fail at load.
There is no `migrate` command — rewrite to v3, or regenerate with
`hedera-harness init` and reapply edits.

**These skills are for authoring — not for generator runs.** Recipes do not
list skills. Each run discovers product plugins from `hedera-skills`
(`native-services-js`, `system-contracts`, `cross-chain`, `dev-intelligence`)
and the generator picks what the PRD needs. Keep authoring skills out of that
set; they stay Cursor / Claude Code marketplace plugins.

## Layout

One layout: `.harness/` inside a scaffolded app (from `hedera-harness init` or
Scaffold HBAR). The workspace is the project itself. Paths in the **recipe
file** are relative to the project root.

| File | Required? | Default path | Consumed by |
|------|-----------|--------------|-------------|
| **Recipe file** | Yes | `.harness/spec.yaml` | Harness CLI |
| PRD | Yes | `.harness/prd.md` (or a `prd:` list) | Generator |
| Static validator | ASSERT | `.harness/validators/static.json` | Static validator |
| Command validator | ASSERT | `.harness/validators/yarn.json` | Command validator |
| Playwright smoke | SMOKE | `.harness/validators/playwright-smoke.yaml` | Playwright stage |
| **Evaluate checklist** | EVALUATE | `.harness/eval.json` (or an `eval:` list) | EVALUATE validator |

Every path above is a **default**. Omit the key and the harness uses it; name a
key only to point somewhere else. Artifacts always land in `.harness/runs/`,
which is not configurable.

Handoff: `yarn harness:run` or `hedera-harness run .harness/spec.yaml`.

## What the recipe file must carry

Only four things are required:

```yaml
schemaVersion: 3
name: my-feature
description: What you want the agent to build in this project.

baseline:
  commands:
    - name: install          # required, and used for install fingerprinting
      command: yarn install
    - name: build
      command: yarn next:build
```

Everything else — `prd`, `validators.*`, `maxAttempts`, `agent`, `constraints`,
`forbiddenFiles`, `secretScan`, `requiredFiles` — is defaulted or detected.
A v3 recipe that sets none of them is complete and correct. Compact bodies and
the full commented template: [references/spec-files.md](references/spec-files.md).

**`baseline` is not `validators.commands`.** Baseline proves the project was
healthy *before* generation; `validators.commands` grades it *after*. A command
named `install` is mandatory in baseline.

## Defaults worth knowing

| Key | Default |
|-----|---------|
| `agent` | `claude` — omit unless the user wants `cursor` |
| `prd` | `.harness/prd.md`; a **list** delivers ordered **increments** |
| `eval` | absent (EVALUATE off). Scalar grades every slice; list must be 1:1 with `prd:` |
| `maxAttempts` | `3` |
| `constraints.packageManager` | detected from `package.json` / lockfiles |
| `constraints.forbiddenCommands` | every package manager that is not the one in use |
| `forbiddenFiles` / `secretScan` | `.env` plus one per workspace |
| `requiredFiles` | empty — the validators are the gate |

Unknown keys are ignored with a warning, so a typo degrades rather than crashes.
Treat any such warning as a finding.

## Stages

Enable in order. Default is **ASSERT only**, so the first run stays cheap.

| Stage | Recipe file fields | What it checks |
|-------|--------------------|----------------|
| **ASSERT** | `validators.static`, `validators.commands`, `requiredFiles`, `forbiddenFiles`, `secretScan` | Files, JSON/text, secrets, install/lint/build |
| **SMOKE** | `validators.playwright` | Dev server boots; routes HTTP OK; console / forbidden text |
| **EVALUATE** | `eval` + `validator.enabled: true` | Agent grades numbered assertions in the **evaluate checklist** |
| **CHAIN** | `chainValidation` (+ EVALUATE) | Ephemeral ECDSA test signer; real txs; mirror verify |

Full enable order, host prerequisites, and YAML blocks:
[references/stage-strategy.md](references/stage-strategy.md).

## Cross-file coherence

The v3 defaults removed most path-level coupling. What still must agree:

| Keep in sync | Why |
|--------------|-----|
| **Evaluate checklist** `routes` ↔ Playwright `routes` ↔ PRD deliverable routes | The validator visits what the PRD promised |
| Every PRD journey ↔ ≥ 1 assertion in the matching checklist | Unverified journeys pass silently |
| Every assertion ↔ a PRD journey | Orphan assertions are scope creep |
| `prd:` list ↔ `eval:` list (when both are lists) | Must be 1:1; only the active pair is vendored per increment |
| `forbiddenFiles` ↔ static `fileAssertions.forbidden` | Two gates, one intent |
| `constraints.packageManager` ↔ static assertion on `package.json` | Only if you override the detected value |
| `eval` ↔ `validator.enabled: true` | Either alone is a misconfigured recipe |
| Assertion `executableWithTestSigner` ↔ `chainValidation.enabled` | Flagged assertions are inert without CHAIN |

`templateMetadata.name` is the host template identity and may differ from the
feature **slug** in `name`. That is not a finding.

## Blind / evaluate-checklist rule

Keep the run **blind**. The PRD carries journeys and outcomes; numbered
assertions live in the **evaluate checklist**. See [GLOSSARY.md](GLOSSARY.md)
and [references/prd-and-journeys.md](references/prd-and-journeys.md).

## Drift-sensitive loader fields

When the harness renames these, update this skill and its evals in the same
change set:

`schemaVersion`, `agent`, `baseline`, `prd`, `eval`, `validators.static`,
`validators.commands`, `validators.playwright`, `validator`,
`chainValidation`, `constraints`, `templateMetadata`, `requiredFiles`,
`forbiddenFiles`, `secretScan`, `executableWithTestSigner`, `maxAttempts`.

Removed — presence hard-fails at load: `contract`, `extend`, `logging`,
`skills`, `seed`, `generator`.

## Mechanical check

```bash
bash <path-to>/harness-spec-anatomy/scripts/check-spec.sh <project-root>
```

Resolve the script path relative to the installed skill. It runs
`hedera-harness doctor --recipe-only` for schema and loader validity, then adds
the cross-file coherence checks doctor does not perform. Exit zero means the
wiring is clean; non-zero prints one finding per line.

If the harness CLI is unavailable the script still runs its coherence checks and
says so — treat that as a partial result, not a pass.

## Additional resources

- [GLOSSARY.md](GLOSSARY.md)
- [references/spec-files.md](references/spec-files.md)
- [references/prd-and-journeys.md](references/prd-and-journeys.md)
- [references/eval-checklist-guide.md](references/eval-checklist-guide.md)
- [references/stage-strategy.md](references/stage-strategy.md)
- [scripts/check-spec.sh](scripts/check-spec.sh)
- Upstream: [docs/authoring-a-recipe.md](https://github.com/hedera-dev/hedera-harness/blob/dev/docs/authoring-a-recipe.md)
