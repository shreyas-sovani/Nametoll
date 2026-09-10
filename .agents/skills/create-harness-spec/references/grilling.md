# Grilling a harness recipe

Prefer the Matt Pocock `/grilling` skill when it is available (Cursor /
`npx skills`). **Claude Code** usually will not have it — use this protocol
instead. Either way, apply the harness decision tree below.

## Protocol

1. Interview relentlessly about every aspect of the feature until you reach a
   shared understanding. Walk down each branch of the decision tree, resolving
   dependencies between decisions one-by-one.
2. Ask **one question at a time**. Wait for the answer before continuing.
   Asking multiple questions at once is bewildering.
3. For each question, provide your **recommended answer**.
4. If a *fact* can be found by exploring the environment, look it up rather
   than asking. Decisions belong to the user.

### Facts to look up (do not ask)

- Is this a scaffolded app ready for a recipe? (`package.json`,
  `packages/nextjs`, `.harness/`)
- Does `.harness/spec.yaml` already exist, and what is its `schemaVersion`?
  (absent, `1`, or `2` → rewrite to v3 before editing; `migrate` is gone)
- Which harness version is installed? (`hedera-harness doctor`, package.json pin)
- What scripts does the host app document? (README / package.json — these become
  `baseline` commands and static **needles**)
- Which package manager and workspaces? (the harness detects these; you only
  need them to sanity-check)
- What existing routes and pages does the app already ship? Absorb these
  when writing files. Do not quiz the user about them or ask them to phrase
  the feature around the scaffold.
- Which agent CLI is on PATH? (`claude` vs `agent`) — this picks the preset

5. Do **not** write files until the user confirms shared understanding.

The host is a scaffolded app. That is an authoring fact, not a grilling
topic. Do **not** tell the user to phrase the idea as a "delta", and do not
list boilerplate routes (`/`, `/debug`, `/blockexplorer`) as something they
must keep working. They describe the feature; you keep the host intact when
you emit the PRD.

## Decision tree (dependency order)

Walk these decisions in order. Later choices depend on earlier answers.

1. **Product goal** — one paragraph: what the feature is, who it is for, and
   what "done" looks like in a browser.
   *Recommend:* a first journey that works with no operator key, `.env`, or
   funded wallet. If the first thing a visitor sees needs credentials, the
   run has no cheap green state and later stages get harder to pass. Note
   that cost, then accept whatever they choose — recommend, don't require.

2. **Slug** — kebab-case name for the **recipe file** `name` field.
   *Recommend:* short product noun (`proof-wall`, `x402-pay-to-post`).
   `templateMetadata.name`, if set, stays as the host template id.

3. **Solidity in scope?** — yes / no.
   - Yes → Hardhat/Foundry workspaces allowed; consider system-contract skills
     (and deploy / `chainValidation` later).
   - No → forbid Hardhat/Foundry workspaces via `constraints.forbiddenWorkspaces`;
     prefer native JS services (HCS, HTS, x402).

4. **Hedera services** — HCS, HTS, HSS, precompiles, mirror reads, …
   *Recommend:* name them in the PRD. Do **not** list them under `skills:` —
   product plugins are discovered automatically and the generator picks.

5. **Routes** — at least `/`, plus any secondary paths.
   *Recommend:* only routes the first green run will actually ship.

6. **Wallet-gated writes?** — which journeys need a wallet?
   - Read-only / affordance-only → ASSERT / SMOKE / EVALUATE are enough; leave
     CHAIN off.
   - Real on-chain writes must be graded → CHAIN +
     `executableWithTestSigner` become meaningful (still opt-in; confirm
     explicitly, and confirm the user has a funded **ECDSA** testnet operator).
     CHAIN uses `@hiero-ledger/sdk` bundled with `hedera-harness` — do not
     `yarn add` it into the project.

7. **One PRD or increments?** — can one agent session land this?
   *Recommend:* **one PRD**. Split into ordered **increments** only when the
   feature spans layers a single session cannot reliably deliver — typically a
   service/data layer, then UI, then wallet flows. Each increment must leave the
   app green on its own. If you split `prd:`, split `eval:` 1:1 as well.

8. **Agent preset** — default **claude**. Set `agent: cursor` only if that CLI
   is what they will run. Look up which is on PATH rather than asking twice.
   Never hand-write model names or CLI flags into the recipe.

9. **Stage ambition for the first green run** — default **ASSERT only**.
   Offer SMOKE / EVALUATE / CHAIN only after the user opts in. Ambition decides
   which files get written vs left as commented stubs. If they opt in to SMOKE,
   install `playwright` at the project root when emitting so `doctor` is a
   check, not an install prompt. CHAIN needs no extra package.

10. **Confirm shared understanding** — summarize the decisions (slug, services,
    routes, Solidity, increments, agent, stages). Wait for an explicit
    go-ahead before emitting files.

## Anti-patterns to push back on

- **Padding the recipe.** v3 defaults nearly everything. If the user wants
  `maxAttempts: 3` or `prd: .harness/prd.md` written out explicitly, note that
  it is already the default and adds drift surface for nothing.
- **Listing `skills:`.** Removed. Presence hard-fails at load.
- **Splitting a feature one session could deliver.** Increments cost a full
  validation cycle each.
- **One evaluate checklist for a `prd:` list.** Pair `eval:` 1:1, or later
  slices get graded against journeys they have not implemented yet.
- **Marking assertions `executableWithTestSigner` "for later."** They are inert
  without CHAIN and give a false sense of coverage.
- **Putting acceptance detail in the PRD.** That breaks the **blind** rule.
- **Enabling SMOKE without a root `playwright` install.** A copy inside
  `packages/nextjs` does not satisfy doctor. Install at the project root as
  part of emit. CHAIN does not need a project SDK install.
