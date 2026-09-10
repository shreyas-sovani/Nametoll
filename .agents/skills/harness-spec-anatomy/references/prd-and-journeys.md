# PRD and journeys

The PRD is the product brief the **generator** sees. Keep it product-facing.
Numbered, browser-verifiable pass/fail rules live in the **evaluate
checklist** — keep the run **blind**. Default path is `.harness/prd.md`.
Terms: [GLOSSARY.md](../GLOSSARY.md).

## What the PRD carries

| Carry | Examples |
|-------|----------|
| Goal, journeys, services, non-goals, deliverables | Product paragraphs |
| Route names at a product level | `/`, `/feed` |
| Wallet-gated journeys as affordances | "Post a message (needs wallet)" |
| Empty-state and testnet expectations | "Shows empty feed on testnet" |

The **evaluate checklist** owns assertion ids (`E1`, …), `howToVerify` steps,
severity labels, and mirror verification recipes. The Acceptance section of the
PRD points at that file rather than duplicating it.

## Required sections

```markdown
# <Title> (PRD)

## Goal
One paragraph: what the feature is, who it is for, and what "done" looks
like in a browser.

## Journeys
1. **Browse without a wallet** — what the user can see/do read-only.
2. **Configure / admin (if any)** — setup UI; what requires a wallet.
3. **Wallet-gated actions** — name the affordances; a successful on-chain tx
   is not required for acceptance at ASSERT / SMOKE / EVALUATE (unless CHAIN
   is planned).

## Hedera services
- List services (HCS, HTS, …) and how they appear in the UI.
- Default network (usually testnet) and empty-state behavior when nothing is configured.

## Non-goals
- No live operator keys or `.env` required to open the app.
- Call out frameworks you forbid (e.g. Hardhat/Foundry) if this is native/services-only.

## Deliverables
- Routes the **evaluate checklist** will visit (names only — not verification steps)
- Components / pages the feature adds
- Any script or README updates the feature implies

## Acceptance
Numbered, browser-verifiable assertions live in `.harness/eval.json`
(or `.harness/evals/<increment>.json` when splitting).
Keep this document product-facing; keep the checklist test-facing.
```

The host app already exists. When emitting the PRD, describe the feature the
user asked for — do not ask the generator to rebuild the scaffold, and do not
make the user's goal paragraph account for boilerplate routes.

## Splitting read path vs wallet-gated

Ask: *Can a stranger open the app with no wallet and no `.env` and still see something useful?*

| Path | Examples | Checklist posture |
|------|----------|-------------------|
| Read / browse | Home copy, network label, empty feed | `walletRequired: false`, `verifiableWithoutCredentials: true` |
| Affordance | Connect button, "needs wallet" messaging | `walletRequired: true`, still verifiable without credentials |
| Write / on-chain | Submit HCS message, mint, contract call | Only with CHAIN + `executableWithTestSigner: true` |

Recommend a credential-free first journey. If the first visit needs an
operator key or a funded wallet, ASSERT / SMOKE / EVALUATE have no cheap
green state and later stages get harder. Do not block a credentials-first
design — note the cost and proceed if they confirm.

## Increments — splitting one feature across PRDs

When `prd:` is a list, each entry is an **increment**: delivered in order onto a
single branch, each with its own attempt budget, and the first failure stops the
sequence. Only the active PRD is vendored and prompted.

```yaml
prd:
  - .harness/prds/01-foundation.md
  - .harness/prds/02-ui.md
  - .harness/prds/03-wallet-actions.md
eval:
  - .harness/evals/01-foundation.json
  - .harness/evals/02-ui.json
  - .harness/evals/03-wallet-actions.json
```

Reach for increments when a single PRD would ask for more than one agent session
can reliably land — typically a data/service layer plus a UI plus wallet flows.

Rules:

- **Each increment must leave the app green.** ASSERT (and later stages) run per
  increment; an increment that only half-builds a feature fails.
- **Order by dependency, not by size.** Foundation first, UI on top of it.
- **Split by layer, not by file.** "Add the HCS client and a topic list route"
  is an increment; "add three components" is not.
- Keep each increment's PRD self-contained — the generator reads one at a time.
- **Pair `eval:` 1:1 with `prd:`.** Only the active pair is vendored and graded.
  A scalar `eval: .harness/eval.json` grades every slice against one shared
  checklist — later-increment assertions then fail until those slices land,
  which is usually the wrong shape.

A single `.harness/prd.md` remains the right default. Do not split a feature
that one session can deliver.

## Journey → checklist mapping

When enabling EVALUATE, each PRD journey should produce 1–3 assertions in the
matching checklist:

| Journey | Typical assertions |
|---------|-------------------|
| Browse without wallet | `E1` critical home load; `E2` major read capability |
| Wallet-gated action | Affordance + clear messaging without connecting |
| On-chain (optional) | `executableWithTestSigner` only if `chainValidation` is enabled |

See [eval-checklist-guide.md](eval-checklist-guide.md).
