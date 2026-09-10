# Recipe files

Compact ASSERT bodies for writing a **recipe** by hand. Terms:
[GLOSSARY.md](../GLOSSARY.md).

Prefer copying the shipped skeleton when the harness is installed — it is always
current and self-documenting:

```bash
cp -r "$(npm root -g)/hedera-harness/skeletons/project-harness/." .harness/
# or, from a local clone: cp -r <harness>/skeletons/project-harness/. .harness/
```

`hedera-harness init <dir>` provisions the same files as part of bootstrapping a
project. Reconstruct from this page only when neither is available.

## File table

Paths relative to the scaffolded project root (parent of `.harness/`). Every
path is the **default** — omit the key unless you are pointing elsewhere.

| File | Required? | Default path |
|------|-----------|--------------|
| **Recipe file** | Yes | `.harness/spec.yaml` |
| PRD | Yes | `.harness/prd.md` |
| Static validator | ASSERT | `.harness/validators/static.json` |
| Command validator | ASSERT | `.harness/validators/yarn.json` |
| Playwright smoke | SMOKE | `.harness/validators/playwright-smoke.yaml` |
| **Evaluate checklist** | EVALUATE | `.harness/eval.json` |

For increments, write `.harness/prds/01-….md` and matching
`.harness/evals/01-….json`, listed 1:1 in the recipe.

## The minimum viable recipe

This is complete and correct. Do not pad it.

```yaml
schemaVersion: 3

name: my-feature
description: What you want the agent to build in this project.

baseline:
  commands:
    - name: install          # required — also used for install fingerprinting
      command: yarn install
    - name: build
      command: yarn next:build
```

## `.harness/spec.yaml` — with the optional blocks

Everything below `baseline` is the harness default. Uncomment only to override;
changing a commented default here changes nothing.

```yaml
schemaVersion: 3

name: my-feature
description: In-place feature for an already-scaffolded app.

baseline:
  commands:
    - name: install
      command: yarn install
      timeoutMs: 300000      # default is 10 minutes
    - name: lint
      command: yarn lint
    - name: build
      command: yarn next:build

# Default is claude. Uncomment to use Cursor instead.
# agent: cursor

# Feature description. A list delivers ordered increments onto one branch,
# each with its own attempt budget; a failing increment stops the sequence.
# prd: .harness/prd.md
#
# prd:
#   - .harness/prds/01-foundation.md
#   - .harness/prds/02-ui.md

# Evaluate checklist. Scalar grades every slice with one file; list form must
# be 1:1 with prd: for true incremental grading.
# eval: .harness/eval.json
#
# eval:
#   - .harness/evals/01-foundation.json
#   - .harness/evals/02-ui.json

# maxAttempts: 3             # repair attempts per run before stopping

# validators:
#   static: .harness/validators/static.json
#   commands: .harness/validators/yarn.json

# Detected from the project when omitted: packageManager comes from
# package.json / lockfiles, and forbiddenCommands is every manager that is not
# the one in use.
# constraints:
#   packageManager: yarn@3.2.3
#   workspaces:
#     - packages/nextjs
#   forbiddenWorkspaces:
#     - packages/hardhat

# Host template identity — may differ from the feature slug in `name`.
# templateMetadata:
#   name: hedera-demo
#   frontend: nextjs-app
#   solidityFramework: none

# Defaults to .env plus one per workspace, for both the file check and the
# content scan.
# forbiddenFiles:
#   - .env
# secretScan:
#   failOnFiles:
#     - .env
#   patterns:
#     - name: private-key-assignment
#       pattern: "(PRIVATE_KEY|OPERATOR_KEY)\\s*=\\s*(0x)?[0-9a-fA-F]{32,}"

# Files the run must produce. Empty by default — the validators are the gate.
# requiredFiles:
#   - packages/nextjs/app/my-feature/page.tsx

# ── Higher stages (opt-in) ───────────────────────────────────────────────────
# See stage-strategy.md. EVALUATE needs both `eval` and `validator.enabled`.
```

Do **not** author `skills:`. Product plugins from `hedera-skills` are discovered
per run; the generator picks. Presence hard-fails at load.

Removed — never author these: `seed`, `generator`, `logging`, `extend`,
`extend.baseline`, `contract`, `skills`. If you find them, rewrite to v3
(`schemaVersion: 3`, `contract:` → `eval:`, drop `skills:`) or regenerate with
`hedera-harness init`.

## `.harness/validators/static.json`

```json
{
  "name": "my-feature-static",
  "description": "Static invariants for my-feature. Adjust equals/contains to match the PRD deliverables.",
  "jsonAssertions": [
    {
      "file": "package.json",
      "path": "packageManager",
      "equals": "yarn@3.2.3"
    }
  ],
  "fileAssertions": {
    "required": [
      "README.md",
      "package.json",
      "packages/nextjs/package.json",
      "packages/nextjs/app/my-feature/page.tsx"
    ],
    "forbidden": [".env", "packages/nextjs/.env"]
  },
  "textAssertions": [
    {
      "file": "README.md",
      "contains": ["yarn install", "yarn next:dev"]
    }
  ]
}
```

Pin **needles** to scripts the project will actually document — not incidental
implementation detail that will churn.

Assert on the *feature deliverables*, not on `template.json`:
create-scaffold-hbar removes `template.json` when it scaffolds an app, so an
assertion against it will fail in a scaffolded project.

## `.harness/validators/yarn.json`

```json
{
  "name": "my-feature-yarn",
  "description": "Post-feature command gate for my-feature.",
  "requiresNoSecrets": true,
  "forbiddenCommands": ["npm install", "npm run", "pnpm install", "pnpm run"],
  "commands": [
    {
      "name": "install",
      "command": "yarn install",
      "timeoutMs": 300000,
      "purpose": "Install workspace dependencies."
    },
    {
      "name": "lint",
      "command": "yarn lint",
      "timeoutMs": 180000,
      "purpose": "Run the project lint script."
    },
    {
      "name": "build",
      "command": "yarn next:build",
      "timeoutMs": 300000,
      "purpose": "Production build (includes TypeScript checks for Next.js)."
    }
  ]
}
```

This file grades the project **after** the feature lands. It is separate from
`baseline`, which proves the project was healthy **before** generation. Both
want a command named `install`.

## PRD stub

See [prd-and-journeys.md](prd-and-journeys.md). Write `.harness/prd.md` with
Goal / Journeys / Hedera services / Non-goals / Deliverables / Acceptance
pointer. For **increments**, write one file per increment under
`.harness/prds/` and list them in order, with a matching `eval:` list.

## SMOKE / EVALUATE / CHAIN bodies

Do not embed them here — they drift. Follow
[stage-strategy.md](stage-strategy.md) and
[eval-checklist-guide.md](eval-checklist-guide.md).
