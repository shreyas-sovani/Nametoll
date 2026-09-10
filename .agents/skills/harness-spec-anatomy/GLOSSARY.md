# Glossary

Use these terms exactly. Do not substitute "pack", "benchmark pack",
"acceptance file", or "oracle" when a glossary word fits.

> **Spec and recipe are the same thing.** The harness settled on **recipe** —
> the CLI prints `✔ recipe`, and the upstream guide is
> `docs/authoring-a-recipe.md`. These skills keep `spec` in their *names*
> (`create-harness-spec`, `review-harness-spec`, `harness-spec-anatomy`) and in
> the filename `.harness/spec.yaml`. Prefer **recipe** in prose.

**Recipe** — the coupled set of files the harness consumes for one run: PRD,
**recipe file**, static validator, command validator, and optionally a
Playwright smoke plus an **evaluate checklist**. Lives under `.harness/` in the
project. _Avoid_: pack, benchmark pack, spec pack.

**Recipe file** — the YAML the CLI loads: `.harness/spec.yaml`. Carries
`schemaVersion`, `name`, `description`, and `baseline`; everything else is
defaulted. One file inside the **recipe**.

**schemaVersion** — the recipe format version. `3` is current. A recipe without
the field, or with `1` / `2`, hard-fails at load. There is no `migrate`
command: rewrite to v3 (or regenerate with `hedera-harness init` and reapply
edits).

**Slug** — the kebab-case feature name in the **recipe file** `name` field
(`proof-wall`, `hcs-message-wall`). `templateMetadata.name`, when present, is
the *host* template identity and may differ from the feature slug.

**Run** — the CLI command (`hedera-harness run`). Operates on the project cwd,
creates or continues a `harness/run-*` branch, then GENERATE → ASSERT → SMOKE →
EVALUATE, repairing between attempts. Artifacts under `.harness/runs/`.

**Init** — bootstrap command (`hedera-harness init`) that seeds scaffold-hbar
into a directory, creates a **fresh git repo** (no scaffold history/remote),
and provisions `.harness/`.

**Doctor** — preflight command (`hedera-harness doctor`). With `--recipe-only`
it validates the **recipe file** alone — schema, defaults, baseline, network
rules — and exits non-zero on failure. It is the authority on whether a recipe
loads; do not re-implement its checks by hand.

**Baseline** — host-health commands run *before* generation, proving the project
was already working. Must include a command literally named `install`, which is
also used for install fingerprinting across attempts. Distinct from
`validators.commands`, which grade the project *after* the feature lands.

**Agent preset** — the `agent:` field (`claude` or `cursor`) selecting how the
generator and validator are invoked: CLI flags, model choice, and how Playwright
MCP is delivered. Default is **claude**. Omit the key unless the user wants
Cursor. Presets ship with the harness, so flag changes arrive with an upgrade
instead of an edit to the recipe.

**Increment** — one entry when `prd:` is a list. Increments deliver in order
onto a single branch, each with its own attempt budget; the first failing
increment stops the sequence. Pair with `eval:` 1:1 for per-increment grading.

**Blind** — the generation-integrity property. The PRD is given to the
generator; the **evaluate checklist** grades the running app. Pasting assertion
ids, `howToVerify`, or severity labels into the PRD destroys the property.
Phrase the rule as: **keep the run blind**.

**Evaluate checklist** — the JSON the EVALUATE stage grades
(`.harness/eval.json`, or one file per increment under `.harness/evals/`).
Numbered assertions (`E1`, `E2`, …) — not the raw PRD. _Avoid_: oracle,
acceptance contract, semantic contract. Those were the v2 names.

**Stage** — a validation step that can stop a run: ASSERT (deterministic),
SMOKE (Playwright), EVALUATE (evaluate checklist), CHAIN (on-chain). Every
enabled **stage** must pass. _Avoid_: gate, tier 0–1 / 2 / 3 / 3.5.

**Finding** — one validation failure, carrying a stable id and a
`status` of `open` or `fixed`. The repair loop reports the per-attempt delta
(opened / fixed / introduced), so ids must stay stable across attempts.

**Needle** — a static text assertion (`textAssertions[].contains`) that pins a
string the project must document (e.g. `yarn next:dev`). Prefer stable script
names over incidental implementation detail.
