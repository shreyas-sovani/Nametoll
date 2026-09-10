# Import Cheatsheet — v3 → v4

Flat find-and-replace table. Load this when sweeping a project file by file.

## Package mapping

```
hedera-agent-kit                  → @hashgraph/hedera-agent-kit           (core only)
(was bundled in core)             → @hashgraph/hedera-agent-kit-langchain (LangChain)
(was bundled in core)             → @hashgraph/hedera-agent-kit-ai-sdk    (Vercel AI SDK)
hedera-agent-kit/elizaos          → @hashgraph/hedera-agent-kit-elizaos   (ElizaOS)
(was bundled in core)             → @hashgraph/hedera-agent-kit-mcp       (MCP server adapter)
@hashgraph/sdk                    → @hiero-ledger/sdk                     (Hedera SDK rename)
```

## Toolkits

```diff
- import { HederaLangchainToolkit } from 'hedera-agent-kit';
+ import { HederaLangchainToolkit } from '@hashgraph/hedera-agent-kit-langchain';

- import { HederaAIToolkit } from 'hedera-agent-kit';
+ import { HederaAIToolkit } from '@hashgraph/hedera-agent-kit-ai-sdk';

- import { HederaElizaOSToolkit } from 'hedera-agent-kit/elizaos';
+ import { HederaElizaOSToolkit } from '@hashgraph/hedera-agent-kit-elizaos';

- import { HederaMCPToolkit } from 'hedera-agent-kit';
+ import { HederaMCPToolkit } from '@hashgraph/hedera-agent-kit-mcp';
```

## Core types and helpers (same exports, new package name)

```diff
- import { AgentMode, Configuration, Context, Plugin, Tool, BaseTool } from 'hedera-agent-kit';
+ import { AgentMode, Configuration, Context, Plugin, Tool, BaseTool } from '@hashgraph/hedera-agent-kit';

- import { handleTransaction, RawTransactionResponse } from 'hedera-agent-kit';
+ import { handleTransaction, RawTransactionResponse } from '@hashgraph/hedera-agent-kit';

- import { transactionToolOutputParser, untypedQueryOutputParser } from 'hedera-agent-kit';
+ import { transactionToolOutputParser, untypedQueryOutputParser } from '@hashgraph/hedera-agent-kit';

- import { AbstractHook, AbstractPolicy } from 'hedera-agent-kit';
+ import { AbstractHook, AbstractPolicy } from '@hashgraph/hedera-agent-kit';
```

## Plugins (moved from root to `/plugins` subpath)

```diff
- import { coreTokenPlugin, coreAccountPlugin, coreConsensusPlugin } from 'hedera-agent-kit';
+ import { coreTokenPlugin, coreAccountPlugin, coreConsensusPlugin } from '@hashgraph/hedera-agent-kit/plugins';
```

Full list of available plugins from `@hashgraph/hedera-agent-kit/plugins`:

- `coreAccountPlugin`
- `coreTokenPlugin`
- `coreConsensusPlugin`
- `coreEVMPlugin`
- `coreAccountQueryPlugin`
- `coreTokenQueryPlugin`
- `coreConsensusQueryPlugin`
- `coreEVMQueryPlugin`
- `coreMiscQueriesPlugin`
- `coreTransactionQueryPlugin`
- `allCorePlugins` — convenience array of every built-in plugin above

## Toolkit-specific helpers

```diff
- import { ResponseParserService } from 'hedera-agent-kit';
+ import { ResponseParserService } from '@hashgraph/hedera-agent-kit-langchain';

- import { HederaMCPServer } from 'hedera-agent-kit';
+ import { HederaMCPServer } from '@hashgraph/hedera-agent-kit-langchain';
// or '@hashgraph/hedera-agent-kit-ai-sdk' depending on which toolkit the file uses
```

## Hedera SDK rename

```diff
- import { Client, PrivateKey } from '@hashgraph/sdk';
+ import { Client, PrivateKey } from '@hiero-ledger/sdk';

- import { TokenCreateTransaction, TokenType, TokenSupplyType } from '@hashgraph/sdk';
+ import { TokenCreateTransaction, TokenType, TokenSupplyType } from '@hiero-ledger/sdk';

- import { Transaction, Status } from '@hashgraph/sdk';
+ import { Transaction, Status } from '@hiero-ledger/sdk';
```

The SDK API surface itself was not renamed — only the package name. Class names (`Client`, `Transaction`, `TokenCreateTransaction`, `Status`, `PrivateKey`, etc.) stay the same.

## Deprecated plugin aliases

```diff
- import { coreHTSPlugin } from 'hedera-agent-kit';
+ import { coreTokenPlugin } from '@hashgraph/hedera-agent-kit/plugins';

- import { coreSCSPlugin } from 'hedera-agent-kit';
+ import { coreEVMPlugin } from '@hashgraph/hedera-agent-kit/plugins';

- import { coreQueriesPlugin } from 'hedera-agent-kit';
+ import {
+   coreAccountQueryPlugin,
+   coreTokenQueryPlugin,
+   coreConsensusQueryPlugin,
+   coreEVMQueryPlugin,
+   coreMiscQueriesPlugin,
+   coreTransactionQueryPlugin,
+ } from '@hashgraph/hedera-agent-kit/plugins';
```

`coreQueriesPlugin` was a single mega-plugin in v3; v4 splits it into the six query plugins above. Pick the ones the project actually uses, or use `allCorePlugins` to load every built-in plugin (mutation + query) at once.

## `package.json` peer dependency (for plugin authors)

```diff
  "peerDependencies": {
-   "hedera-agent-kit": "^3.0.0"
+   "@hashgraph/hedera-agent-kit": "^4.0.0"
  }
```
