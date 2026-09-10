# Breaking Changes — v3 → v4

Reference document for the migration skill. Each section is a discrete breaking change a migrator must address.

## 1. Package rename and scope

Core package moved from unscoped `hedera-agent-kit` to the `@hashgraph` scope:

```diff
- npm install hedera-agent-kit
+ npm install @hashgraph/hedera-agent-kit
```

The old package name no longer receives updates.

## 2. Toolkits split into separate packages

Framework integrations are no longer bundled in core. Each toolkit ships as its own npm package and bundles the framework SDK it depends on.

| Package | What it exports |
|---|---|
| `@hashgraph/hedera-agent-kit` | `HederaAgentAPI`, `AgentMode`, `Configuration`, `Context`, `Plugin`, `Tool`, `BaseTool`, `ToolDiscovery`, `HederaBuilder`, `handleTransaction`, `ExecuteStrategy`, parameter schemas, mirrornode types, `AbstractHook`, `AbstractPolicy` |
| `@hashgraph/hedera-agent-kit-langchain` | `HederaLangchainToolkit`, `ResponseParserService`, `HederaMCPServer` |
| `@hashgraph/hedera-agent-kit-ai-sdk` | `HederaAIToolkit`, `HederaMCPServer` |
| `@hashgraph/hedera-agent-kit-elizaos` | `HederaElizaOSToolkit` |
| `@hashgraph/hedera-agent-kit-mcp` | `HederaMCPToolkit` |

## 3. Plugins moved to `/plugins` subpath

Plugins are no longer exported from the core package root. Import them from the dedicated subpath:

```diff
- import { coreTokenPlugin, coreAccountPlugin } from 'hedera-agent-kit';
+ import { coreTokenPlugin, coreAccountPlugin } from '@hashgraph/hedera-agent-kit/plugins';
```

Available built-in plugins from this subpath:

```typescript
import {
  coreAccountPlugin,
  coreTokenPlugin,
  coreConsensusPlugin,
  coreEVMPlugin,
  coreAccountQueryPlugin,
  coreTokenQueryPlugin,
  coreConsensusQueryPlugin,
  coreEVMQueryPlugin,
  coreMiscQueriesPlugin,
  coreTransactionQueryPlugin,
  allCorePlugins,
} from '@hashgraph/hedera-agent-kit/plugins';
```

## 4. Explicit plugin opt-in (silent behaviour change)

In v3, an empty `plugins: []` may have loaded default tools. In v4, **empty means zero tools**. The agent will run, the call will not throw — the agent will simply have no tools.

```typescript
// v4: pass plugins explicitly
new HederaLangchainToolkit({
  client,
  configuration: {
    plugins: [coreAccountPlugin, coreTokenPlugin],
    context: { mode: AgentMode.AUTONOMOUS },
  },
});

// or, to mirror the v3 "everything" default:
import { allCorePlugins } from '@hashgraph/hedera-agent-kit/plugins';
new HederaLangchainToolkit({
  client,
  configuration: { plugins: allCorePlugins, context: { mode: AgentMode.AUTONOMOUS } },
});
```

`allCorePlugins` is the union of every built-in core plugin. Prefer a hand-picked list when a smaller tool surface is desired; bundlers tree-shake unused plugins either way.

## 5. Deprecated plugin aliases removed

| Removed alias | Replacement |
|---|---|
| `coreHTSPlugin` | `coreTokenPlugin` |
| `coreSCSPlugin` | `coreEVMPlugin` |
| `coreQueriesPlugin` | Individual query plugins: `coreAccountQueryPlugin`, `coreTokenQueryPlugin`, `coreConsensusQueryPlugin`, `coreEVMQueryPlugin`, `coreMiscQueriesPlugin`, `coreTransactionQueryPlugin` |

## 6. Framework dependencies are transitive

Toolkits bundle their framework SDK so the consumer no longer installs it directly:

- `@hashgraph/hedera-agent-kit-langchain` bundles `@langchain/core`, `langchain`, `@langchain/mcp-adapters`.
- `@hashgraph/hedera-agent-kit-ai-sdk` bundles `ai`, `@ai-sdk/mcp`.

The LLM provider is **never** bundled. Always install it separately:

```bash
# LangChain + OpenAI
npm install @hiero-ledger/sdk @hashgraph/hedera-agent-kit @hashgraph/hedera-agent-kit-langchain @langchain/openai

# LangChain + Anthropic
npm install @hiero-ledger/sdk @hashgraph/hedera-agent-kit @hashgraph/hedera-agent-kit-langchain @langchain/anthropic

# AI SDK + OpenAI
npm install @hiero-ledger/sdk @hashgraph/hedera-agent-kit @hashgraph/hedera-agent-kit-ai-sdk @ai-sdk/openai
```

## 7. MCP-related exports moved out of core

`HederaMCPServer` (the enum used to connect to external MCP servers like Hederion or Hgraph) is no longer exported from core. It now lives in the toolkit packages:

```diff
- import { HederaMCPServer } from 'hedera-agent-kit';
+ import { HederaMCPServer } from '@hashgraph/hedera-agent-kit-langchain';
// or
+ import { HederaMCPServer } from '@hashgraph/hedera-agent-kit-ai-sdk';
```

`HederaMCPServer` (client-side enum) is **distinct** from `@hashgraph/hedera-agent-kit-mcp` (the `HederaMCPToolkit` adapter that exposes the agent kit *as* an MCP server).

## 8. Hedera SDK rename and peer dependency

The Hedera SDK was renamed from `@hashgraph/sdk` to `@hiero-ledger/sdk` and demoted from a regular dependency to a **peer dependency** (`^2.81.0`). Every package in the v4 family declares it as peer; the consumer installs it.

```diff
- npm install @hashgraph/sdk
+ npm install @hiero-ledger/sdk
```

```diff
- import { Client, PrivateKey } from '@hashgraph/sdk';
+ import { Client, PrivateKey } from '@hiero-ledger/sdk';
```

`@hiero-ledger/sdk` is the successor maintained under the Hiero Ledger project. `@hashgraph/sdk` no longer receives updates aligned with the agent kit.

## 9. `RETURN_BYTES` mode — `raw.bytes` standardised to `Uint8Array`

In v3, `raw.bytes` returned by `ResponseParserService` could be a Node.js `Buffer` or a plain `{ type: 'Buffer', data: [...] }` object depending on the runtime. In v4 it is always a `Uint8Array` in both Node.js and the browser.

Remove any conversion code:

```diff
- const realBytes = Buffer.isBuffer(bytesObject)
-   ? bytesObject
-   : Buffer.from(bytesObject.data);
- const tx = Transaction.fromBytes(realBytes);
+ const tx = Transaction.fromBytes(toolCall.parsedData.raw.bytes);
```

## 10. ElizaOS subpath removed

The `hedera-agent-kit/elizaos` subpath no longer exists. ElizaOS is its own package:

```diff
- import { HederaElizaOSToolkit } from 'hedera-agent-kit/elizaos';
+ import { HederaElizaOSToolkit } from '@hashgraph/hedera-agent-kit-elizaos';
```

## 11. Custom tools must extend `BaseTool`

`BaseTool` is the supported authoring pattern for tools in v4. Every custom tool in the project must be migrated from the v3 functional `Tool` shape (object literal with an `execute` function) to a `BaseTool` subclass. The v3 shape is unsupported in v4 and bypasses the hooks (`AbstractHook`) and policies (`AbstractPolicy`) system entirely.

See `references/basetool-migration.md` for the mechanical conversion recipe and an annotated before/after.

## 12. LangChain ecosystem bump (LangChain consumers only)

`@hashgraph/hedera-agent-kit-langchain@1.x` pins `langchain@1.x` and `@langchain/core@1.x`. v3 LangChain consumers were typically on `langchain@0.3.x` / `@langchain/core@0.3.x`, which is a **major** version behind. Several consequences:

- **Removed subpaths:** `langchain@1.x` no longer exports `langchain/agents` or `langchain/memory`. Code using `AgentExecutor`, `createToolCallingAgent`, or `BufferMemory` will fail to resolve.
- **Replacement:** the `AgentExecutor` pattern is replaced by `createReactAgent` from `@langchain/langgraph/prebuilt` (LangGraph). Conversation history is now passed via the `messages` array on each invocation rather than a `BufferMemory` instance.
- **Provider packages:** `@langchain/openai`, `@langchain/anthropic`, etc. must be bumped to their `1.x` line — the `0.x` versions depend on `@langchain/core@^0.3` and will produce dual-package type errors when mixed with the toolkit's `@langchain/core@^1`.
- **Direct deps:** if your code imports from `langchain` or `@langchain/core` directly (rather than only through `@hashgraph/hedera-agent-kit-langchain`), keep them as direct deps so package managers with strict resolution (bun, pnpm) can resolve them. They can no longer be omitted just because the toolkit "bundles" them transitively.

Sketch of the migration in a CLI/agent file:

```diff
- import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
- import { BufferMemory } from 'langchain/memory';
+ import { createReactAgent } from '@langchain/langgraph/prebuilt';

- const agent = createToolCallingAgent({ llm, tools, prompt });
- const memory = new BufferMemory({ memoryKey: 'chat_history', returnMessages: true });
- const executor = new AgentExecutor({ agent, tools, memory });
- const result = await executor.invoke({ input });
+ const agent = createReactAgent({ llm, tools, prompt });
+ const result = await agent.invoke({ messages: [...history, { role: 'user', content: input }] });
```

This is a **separate framework migration** from the Hedera v4 migration, but it is forced by the toolkit's v4 release. AI SDK and ElizaOS toolkits do not have this issue.

## Versioning

Packages in the `@hashgraph/hedera-agent-kit` family use **independent versioning**. Toolkit packages were re-baselined at `1.0.0` for the v4 release of the core kit; their major numbers do **not** track core.

Look up the current version of each package on npm rather than guessing — `^4` for `@hashgraph/hedera-agent-kit-langchain` will fail to resolve.

Example of a working combination at the time of writing:

- `@hashgraph/hedera-agent-kit@^4.0.0`
- `@hashgraph/hedera-agent-kit-langchain@^1.0.0`
- `@hashgraph/hedera-agent-kit-ai-sdk@^1.0.0`
- `@hashgraph/hedera-agent-kit-elizaos@^1.0.0`
- `@hashgraph/hedera-agent-kit-mcp@^1.0.0`
- `@hiero-ledger/sdk@^2.81.0`

When picking ranges for `package.json`, run `npm view <pkg> version` (or `npm view <pkg> versions`) for each toolkit package to confirm what's actually published — these numbers will drift over time.
