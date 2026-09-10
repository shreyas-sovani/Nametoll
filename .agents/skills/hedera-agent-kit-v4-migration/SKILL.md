---
name: Hedera Agent Kit v4 Migration
description: This skill should be used when the user asks to "migrate to hedera-agent-kit v4", "upgrade hak v3 to v4", "convert plugin to BaseTool", "migrate Tool to BaseTool", "rename hedera-agent-kit imports", "fix v3 deprecation warnings", or has a project still on `hedera-agent-kit@3.x` / `@hashgraph/sdk` that needs to move to `@hashgraph/hedera-agent-kit@4.x` / `@hiero-ledger/sdk`. Covers both custom-plugin migration (Tool → BaseTool) and toolkit-consumer migration (LangChain/AI SDK/ElizaOS/MCP).
version: 1.0.0
---

# Migrating Hedera Agent Kit v3 → v4

This skill drives a complete v3 → v4 migration. v4 is the current major; v3 (`hedera-agent-kit@3.x`) no longer receives updates. Use this skill whenever you see code importing from `hedera-agent-kit` (unscoped) or `@hashgraph/sdk`.

## Quick triage — what kind of v3 code is this?

Before editing anything, classify the file you are migrating. The migration steps differ.

| If the file… | It's a… | Apply |
|---|---|---|
| Defines a `Plugin` and exports tool factories that return object literals with an `execute` function | **Custom plugin** | Plugin migration + BaseTool migration |
| Calls `new HederaLangchainToolkit / HederaAIToolkit / HederaElizaOSToolkit / HederaMCPToolkit` | **Toolkit consumer** | Toolkit migration |
| Imports plugins like `coreTokenPlugin`, `coreAccountPlugin`, `coreHTSPlugin` | **Toolkit consumer** (uses built-in plugins) | Toolkit migration + alias rename |
| Imports `ResponseParserService` or `HederaMCPServer` from `hedera-agent-kit` | **Toolkit consumer** | Toolkit migration (these moved to toolkit packages) |
| Both | Run **toolkit migration first**, then **plugin migration** for each tool |

## Migration workflow

### Step 1 — find every v3 entry point

Run these searches at the project root before editing anything. They give you the migration surface in one shot:

```bash
# Old package name in source and dependency manifests
grep -rn "from ['\"]hedera-agent-kit" .
grep -n '"hedera-agent-kit"' package.json

# Old SDK package
grep -rn "from ['\"]@hashgraph/sdk" .
grep -n '"@hashgraph/sdk"' package.json

# Deprecated plugin aliases
grep -rn "coreHTSPlugin\|coreSCSPlugin\|coreQueriesPlugin" .

# Old subpath import
grep -rn "from ['\"]hedera-agent-kit/elizaos" .

# v3 functional Tool pattern (object literal with execute)
grep -rn "execute: " . --include="*.ts" | grep -i "tool"
```

Build a list of files to edit; do not start mutating yet.

### Step 2 — update `package.json`

Replace dependencies, then run install. See `references/breaking-changes.md` § "Package mapping" for the complete table and § "Versioning" for version ranges. Quick form:

- Remove: `hedera-agent-kit`, `@hashgraph/sdk`. Drop `@langchain/core`, `langchain`, `@langchain/langgraph`, `ai` **only if your code never imports from them directly** — they are transitive deps of the toolkit, so package managers with strict resolution (bun, pnpm) won't satisfy direct imports unless you keep them. When in doubt, keep them as devDeps.
- Add: `@hashgraph/hedera-agent-kit` (use `^4.0.0`) and `@hiero-ledger/sdk` (use `^2.81.0`), plus exactly one toolkit package for your framework. **Toolkit packages are NOT on `^4`** — they re-baselined at `1.0.0` for this release. Use `^1.0.0` for `@hashgraph/hedera-agent-kit-langchain` / `-ai-sdk` / `-elizaos` / `-mcp`. Run `npm view <pkg> version` to confirm before pinning.
- Keep: the LLM provider (`@langchain/openai`, `@ai-sdk/openai`, `@langchain/anthropic`, etc.) — toolkits never bundle providers. **LangChain consumers must also bump the provider package to its `1.x` line** (e.g. `@langchain/openai@^1`); the `0.x` line depends on `@langchain/core@^0.3` and produces dual-package type errors against the toolkit's `@langchain/core@^1`. See `references/breaking-changes.md` § "LangChain ecosystem bump".

### Step 3 — rewrite imports

Apply the find-and-replace map from `references/import-cheatsheet.md`. Key moves:

```diff
- from 'hedera-agent-kit'        → from '@hashgraph/hedera-agent-kit'
- from '@hashgraph/sdk'          → from '@hiero-ledger/sdk'
- from 'hedera-agent-kit/elizaos' → from '@hashgraph/hedera-agent-kit-elizaos'
```

Plugins must come from the `/plugins` subpath:

```diff
- import { coreTokenPlugin } from 'hedera-agent-kit'
+ import { coreTokenPlugin } from '@hashgraph/hedera-agent-kit/plugins'
```

Rename deprecated aliases:

| Removed | Replacement |
|---|---|
| `coreHTSPlugin` | `coreTokenPlugin` |
| `coreSCSPlugin` | `coreEVMPlugin` |
| `coreQueriesPlugin` | Individual plugins: `coreAccountQueryPlugin`, `coreTokenQueryPlugin`, `coreConsensusQueryPlugin`, `coreEVMQueryPlugin`, `coreMiscQueriesPlugin`, `coreTransactionQueryPlugin` |

Toolkits and their helpers each moved to a dedicated package:

```diff
- import { HederaLangchainToolkit, ResponseParserService } from 'hedera-agent-kit'
+ import { HederaLangchainToolkit, ResponseParserService } from '@hashgraph/hedera-agent-kit-langchain'

- import { HederaAIToolkit } from 'hedera-agent-kit'
+ import { HederaAIToolkit } from '@hashgraph/hedera-agent-kit-ai-sdk'

- import { HederaMCPToolkit } from 'hedera-agent-kit'
+ import { HederaMCPToolkit } from '@hashgraph/hedera-agent-kit-mcp'
```

`AgentMode`, `Configuration`, `Context`, `Plugin`, `Tool`, `BaseTool`, `handleTransaction`, output parsers, mirrornode types — all stay in `@hashgraph/hedera-agent-kit`.

### Step 4 — fix the silent behaviour change in toolkit configuration

In v3 an empty `plugins: []` may have loaded default tools. **In v4, empty means zero tools.** This will not throw — the agent will silently have nothing to call. Audit every toolkit construction:

```typescript
// v4: pass plugins explicitly
import { allCorePlugins } from '@hashgraph/hedera-agent-kit/plugins';

new HederaLangchainToolkit({
  client,
  configuration: {
    plugins: allCorePlugins,           // or list specific plugins
    context: { mode: AgentMode.AUTONOMOUS },
  },
});
```

Use `allCorePlugins` to preserve v3's "everything" default. Prefer explicit lists when the user wants a smaller tool surface; bundlers tree-shake either way.

### Step 5 — handle `RETURN_BYTES` consumers

If any code reads `parsedData.raw.bytes` from `ResponseParserService` and converts it (e.g. `Buffer.isBuffer(...)`, `Buffer.from(obj.data)`), **delete the conversion**. v4 standardises `raw.bytes` to `Uint8Array` everywhere; passing it directly to `Transaction.fromBytes()` works in Node and browser. See `references/breaking-changes.md` § "RETURN_BYTES".

### Step 6 — migrate every custom plugin tool to `BaseTool`

`BaseTool` is the supported shape for tools in v4. **Every custom tool must be migrated** — the v3 functional pattern (object literal with an `execute` function) is no longer the supported authoring style and bypasses the hooks/policies system (`HcsAuditTrailHook`, `MaxRecipientsPolicy`, `RejectToolPolicy`, and any subclass of `AbstractHook`/`AbstractPolicy`). Migrate every tool the plugin exports; do not leave a mix of old- and new-style tools.

Full step-by-step recipe with annotated before/after: `references/basetool-migration.md`.

Mechanical summary:

1. Replace `import type { Tool }` with `import { BaseTool }` from `@hashgraph/hedera-agent-kit`.
2. Rewrite the factory: `(context: Context): Tool => ({ ... execute })` becomes a class extending `BaseTool` and a one-line factory `(context) => new MyTool(context)`.
3. Split the body of the old `execute` function into:
   - `normalizeParams` (resolve defaults, validate format)
   - `coreAction` (build the `Transaction` for mutations, fetch the data for queries)
   - `secondaryAction` (call `handleTransaction(...)` for mutations; pass-through for queries)
4. For query-only tools, override `shouldSecondaryAction` to return `false` and provide a no-op `secondaryAction`.
5. Move the `try/catch` body into an `handleError(error, context)` override (BaseTool calls it from any failed stage).
6. Keep the factory return type `BaseTool` — `Plugin.tools()` accepts it directly.

The example under `examples/transfer-hbar-migration/` shows the full transformation on the canonical `transfer_hbar` tool.

### Step 7 — verify

After mutating files, run in this order:

1. `npm install` (or `bun install` / `pnpm install`) — confirms `package.json` resolves. Watch for "no version matching X" errors; toolkit packages are on `^1`, not `^4`.
2. `tsc --noEmit` (or `npm run build`) — picks up missing imports and type drifts (e.g. `setTreasuryAccountId` complaining because a normalised type was not declared, or `noImplicitOverride` complaining about a missing `override` keyword on `handleError` / `secondaryAction`).
3. **For LangChain consumers**, type errors mentioning two different `@langchain/core` paths (one nested under your provider package, one nested under the toolkit) indicate a dual-package situation — the provider package is still on `0.x`. Bump it to `1.x` per Step 2.
4. **For LangChain consumers**, errors like `Cannot find module 'langchain/agents'` or `'langchain/memory'` indicate the legacy `AgentExecutor`/`BufferMemory` pattern — these subpaths were removed in `langchain@1.x`. The fix is a separate framework migration to `createReactAgent` from `@langchain/langgraph/prebuilt`. See `references/breaking-changes.md` § "LangChain ecosystem bump".
5. Smoke-test the agent: instantiate the toolkit, list tools (`toolkit.getTools().length` must be > 0), invoke one tool end-to-end. **A passing build does not prove the migration worked** — the empty-plugins-array footgun is type-safe and silent.

## What this skill does NOT cover

- Solidity / system-contracts migration — see the `system-contracts` plugin.
- Native JS SDK changes inside `@hiero-ledger/sdk` itself — only the *import path* changes; the API surface remained stable across the rename.
- Plugin authoring patterns from scratch — see the `agent-kit-plugin` skill.
- Writing new hooks/policies — see `agent-kit-hook` and `agent-kit-policy` skills. Migration to `BaseTool` is the *prerequisite* for those features.
- **LangChain framework migration** (`AgentExecutor` → `createReactAgent`, `BufferMemory` → `messages`-based history). The v4 LangChain toolkit forces a bump to `langchain@1.x`, which removes these APIs, but rewriting the agent setup is a LangChain-side concern. `references/breaking-changes.md` § "LangChain ecosystem bump" sketches the shape of the change; consult LangChain's own migration guide for details.

## Reference index

- `references/breaking-changes.md` — every breaking change, package mapping, install commands, version-bump notes.
- `references/import-cheatsheet.md` — flat find-and-replace table; load this when sweeping files.
- `references/basetool-migration.md` — annotated before/after for converting one tool from the `Tool` object literal to a `BaseTool` subclass, including the query-only variant.
- `examples/transfer-hbar-migration/` — `before-v3.ts` and `after-v4.ts` of the same tool, side by side, with a `README.md` walking through every change.
