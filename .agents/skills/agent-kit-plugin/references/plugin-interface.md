# Plugin and Tool Interfaces

Complete interface documentation for Hedera Agent Kit plugins.

## Plugin Interface

```typescript
export interface Plugin {
  name: string;
  version?: string;
  description?: string;
  tools: (context: Context) => Tool[];
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique identifier in kebab-case (e.g., `my-token-plugin`) |
| `version` | `string` | No | Semantic version following MAJOR.MINOR.PATCH format |
| `description` | `string` | No | Brief explanation of what the plugin provides |
| `tools` | `function` | Yes | Factory function receiving Context, returning Tool array |

### Example Plugin Definition

```typescript
import { Context, Plugin } from '@hashgraph/hedera-agent-kit';
import createTokenTool, { CREATE_TOKEN_TOOL } from './tools/tokens/create-token';
import getTokenInfoTool, { GET_TOKEN_INFO_TOOL } from './tools/queries/get-token-info';

export const myTokenPlugin: Plugin = {
  name: 'my-token-plugin',
  version: '1.0.0',
  description: 'Custom token operations for Hedera Token Service',
  tools: (context: Context) => {
    return [
      createTokenTool(context),
      getTokenInfoTool(context),
    ];
  },
};

// Export tool name constants for programmatic access
export const myTokenPluginToolNames = {
  CREATE_TOKEN_TOOL,
  GET_TOKEN_INFO_TOOL,
} as const;

export default { myTokenPlugin, myTokenPluginToolNames };
```

## Tool Interface

```typescript
export type Tool = {
  method: string;
  name: string;
  description: string;
  parameters: z.ZodObject<any, any>;
  execute: (client: Client, context: Context, params: any) => Promise<any>;
  outputParser?: (rawOutput: string) => { raw: any; humanMessage: string };
};
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `method` | `string` | Yes | Unique identifier in snake_case with `_tool` suffix |
| `name` | `string` | Yes | Human-readable display name shown to users |
| `description` | `string` | Yes | LLM-friendly description guiding the AI agent |
| `parameters` | `z.ZodObject` | Yes | Zod schema for validating and typing input parameters |
| `execute` | `function` | Yes | Async function performing the Hedera operation |
| `outputParser` | `function` | No | Transforms raw output into structured response |

### Execute Function Signature

```typescript
execute: (
  client: Client,      // Hedera SDK client (@hiero-ledger/sdk)
  context: Context,    // Configuration context (network, mode, services)
  params: any          // Validated parameters matching Zod schema
) => Promise<{
  raw: any;            // Technical data for programmatic use
  humanMessage: string // Formatted message for user display
}>
```

### Output Parser Function Signature

```typescript
outputParser: (rawOutput: string) => {
  raw: any;            // Parsed technical data
  humanMessage: string // Human-readable message
}
```

## `BaseTool`

`BaseTool` is an abstract class that **implements** the `Tool` interface. Any class extending `BaseTool` is accepted everywhere a `Tool` is expected — including inside `Plugin.tools()`. It enforces a 7-stage lifecycle and is the only way to opt into the hooks and policies system (`HcsAuditTrailHook`, `MaxRecipientsPolicy`, `RejectToolPolicy`, etc.).

### Lifecycle stages

```text
[1] preToolExecutionHook
[2] normalizeParams        ← your logic
[3] postParamsNormalizationHook
[4] coreAction             ← your logic
[5] postCoreActionHook
[6] secondaryAction        ← your logic (optional, e.g. tx signing/submission)
[7] postToolExecutionHook
```

Hooks and policies tap into stages 1, 3, 5, and 7 automatically — you never call them manually.

### Mutation-tool example

```typescript
import { z } from 'zod';
import { Client, Status } from '@hiero-ledger/sdk';
import {
  BaseTool,
  Context,
  handleTransaction,
  RawTransactionResponse,
  transactionToolOutputParser,
} from '@hashgraph/hedera-agent-kit';

export const TRANSFER_HBAR_TOOL = 'transfer_hbar_tool';

const transferHbarPrompt = (_context: Context = {}) => `...`;
const transferHbarParameters = (_context: Context = {}) => z.object({
  toAccountId: z.string(),
  amount: z.number().positive(),
});

const postProcess = (response: RawTransactionResponse) =>
  `HBAR transferred. Transaction ID: ${response.transactionId}`;

export class TransferHbarTool extends BaseTool {
  method = TRANSFER_HBAR_TOOL;
  name = 'Transfer HBAR';
  description: string;
  parameters: ReturnType<typeof transferHbarParameters>;
  outputParser = transactionToolOutputParser;

  constructor(context: Context) {
    super();
    this.description = transferHbarPrompt(context);
    this.parameters = transferHbarParameters(context);
  }

  // Stage 2
  async normalizeParams(params: any, _context: Context, _client: Client) {
    return params; // call your normaliser here
  }

  // Stage 4 — build the transaction, do not sign/submit yet
  async coreAction(normalisedParams: any, _context: Context, _client: Client) {
    // return a built Transaction
    return /* HederaBuilder.transferHbar(normalisedParams) */ undefined as any;
  }

  // Stage 6 — sign & submit
  async secondaryAction(transaction: any, client: Client, context: Context) {
    return await handleTransaction(transaction, client, context, postProcess);
  }

  async handleError(error: unknown, _context: Context) {
    const message = 'Failed to transfer HBAR' + (error instanceof Error ? `: ${error.message}` : '');
    console.error('[transfer_hbar_tool]', message);
    return { raw: { status: Status.InvalidTransaction, error: message }, humanMessage: message };
  }
}

const tool = (context: Context): BaseTool => new TransferHbarTool(context);
export default tool;
```

### Query-tool variant — skip stage 6

For read-only tools, override `shouldSecondaryAction` so the lifecycle stops after `coreAction`:

```typescript
export class MyQueryTool extends BaseTool {
  // ...
  async coreAction(params: any, _context: Context, client: Client) {
    return await someHederaQuery(params, client);
  }

  async shouldSecondaryAction(_coreActionResult: any, _context: Context) {
    return false;
  }

  // Still required by the abstract class — provide a no-op
  async secondaryAction(result: any, _client: Client, _context: Context) {
    return result;
  }
}
```

## Context Interface

The Context object provides configuration and services to tools:

```typescript
import { AgentMode, IHederaMirrornodeService, AbstractHook } from '@hashgraph/hedera-agent-kit';

export type Context = {
  accountId?: string;
  accountPublicKey?: string;
  mode?: AgentMode;                            // AgentMode.AUTONOMOUS | AgentMode.RETURN_BYTES
  mirrornodeService?: IHederaMirrornodeService;
  hooks?: AbstractHook[];
};
```

### Common Context Properties

| Property | Type | Description |
|----------|------|-------------|
| `accountId` | `string` | Operator account ID currently signing transactions |
| `accountPublicKey` | `string` | Public key of the operator account |
| `mode` | `AgentMode` | `AUTONOMOUS` (sign and submit) or `RETURN_BYTES` (return signed bytes for the caller to submit) |
| `mirrornodeService` | `IHederaMirrornodeService` | Service for querying the mirror node |
| `hooks` | `AbstractHook[]` | Hooks dispatched around the `BaseTool` lifecycle |

> **`RETURN_BYTES` mode requires `accountId` and `accountPublicKey`.** In `RETURN_BYTES` the agent does not hold the operator key — it only assembles the transaction and hands the unsigned bytes to the caller. The agent therefore needs `accountId` and `accountPublicKey` on the `Context` to know **on whose behalf** the transaction is being built (payer, sender of a transfer, owner of a token, etc.). These two fields are **mandatory** in `RETURN_BYTES` mode; tools and built-in plugins read them when populating transaction fields.

> **Scheduled transactions.** Scheduling is opted into **per-tool**: tools that support scheduling expose a `schedulingParams` object on their Zod parameters (with fields like `isScheduled`, `adminKey`, `payerAccountId`, `expirationTime`, `waitForExpiry`). Built-in plugins already wire this in; for custom tools, see the scheduling pattern in `references/zod-schema-patterns.md`.

## Registering Plugins with a Toolkit

Plugins are passed directly to the toolkit's `configuration.plugins` array. **An empty array means the agent has no tools.**

Pick the toolkit package matching your framework:

| Framework | Toolkit package |
|---|---|
| LangChain | `@hashgraph/hedera-agent-kit-langchain` |
| Vercel AI SDK | `@hashgraph/hedera-agent-kit-ai-sdk` |
| ElizaOS | `@hashgraph/hedera-agent-kit-elizaos` |
| MCP | `@hashgraph/hedera-agent-kit-mcp` |

### LangChain example

```typescript
import { Client, PrivateKey } from '@hiero-ledger/sdk';
import { AgentMode } from '@hashgraph/hedera-agent-kit';
import { coreTokenPlugin, coreAccountPlugin } from '@hashgraph/hedera-agent-kit/plugins';
import { HederaLangchainToolkit } from '@hashgraph/hedera-agent-kit-langchain';
import { myTokenPlugin } from './my-token-plugin';

const client = Client.forTestnet().setOperator(
  process.env.ACCOUNT_ID!,
  PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY!),
);

const toolkit = new HederaLangchainToolkit({
  client,
  configuration: {
    plugins: [coreTokenPlugin, coreAccountPlugin, myTokenPlugin], // explicit, required
    context: { mode: AgentMode.AUTONOMOUS },
  },
});

const tools = toolkit.getTools();
console.log(`Loaded ${tools.length} tools`);
```

### Loading every built-in core plugin at once

```typescript
import { allCorePlugins } from '@hashgraph/hedera-agent-kit/plugins';
// ...
plugins: [...allCorePlugins, myTokenPlugin],
```

### Available built-in plugins

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

## Built-in Output Parsers

Set `outputParser` as a property on your `BaseTool` subclass.

### transactionToolOutputParser

For mutation tools that execute transactions:

```typescript
import { BaseTool, transactionToolOutputParser } from '@hashgraph/hedera-agent-kit';

export class CreateTokenTool extends BaseTool</* ... */> {
  outputParser = transactionToolOutputParser;
  // ...
}
```

### untypedQueryOutputParser

For query tools that read data:

```typescript
import { BaseTool, untypedQueryOutputParser } from '@hashgraph/hedera-agent-kit';

export class GetTokenInfoTool extends BaseTool</* ... */> {
  outputParser = untypedQueryOutputParser;
  // ...
}
```

## Plugin Author `package.json`

If you publish a plugin, declare the core package and the SDK as peer dependencies:

```json
{
  "peerDependencies": {
    "@hashgraph/hedera-agent-kit": "^4.0.0",
    "@hiero-ledger/sdk": "^2.83.0"
  }
}
```

## Type Imports Summary

```typescript
// Core interfaces and helpers
import {
  Plugin,
  Tool,
  BaseTool,
  Context,
  AgentMode,
  Configuration,
  handleTransaction,
  RawTransactionResponse,
  transactionToolOutputParser,
  untypedQueryOutputParser,
} from '@hashgraph/hedera-agent-kit';

// Built-in plugins
import {
  coreAccountPlugin,
  coreTokenPlugin,
  allCorePlugins,
  // ...
} from '@hashgraph/hedera-agent-kit/plugins';

// Hedera SDK
import { Client, Status } from '@hiero-ledger/sdk';

// Parameter validation
import { z } from 'zod';
```
