# Example: `transfer_hbar` v3 → v4

Side-by-side migration of the canonical `transfer_hbar` tool. Read both files in this directory together with this walkthrough.

- `before-v3.ts` — v3 functional `Tool` style.
- `after-v4.ts` — v4 `BaseTool` subclass.

## Diff summary

There are exactly three categories of change. Everything else is identical.

### 1. Imports (mechanical rename)

```diff
- import type { Tool } from '@/shared/tools';
- import { Client, Status } from '@hashgraph/sdk';
- import { handleTransaction, RawTransactionResponse } from '@/shared/strategies/tx-mode-strategy';
- import { transactionToolOutputParser } from '@/shared/utils/default-tool-output-parsing';
+ import {
+   BaseTool,
+   handleTransaction,
+   RawTransactionResponse,
+   transactionToolOutputParser,
+ } from '@hashgraph/hedera-agent-kit';
+ import { Client, Status, Transaction } from '@hiero-ledger/sdk';
```

`handleTransaction`, `RawTransactionResponse`, and `transactionToolOutputParser` are now top-level exports of `@hashgraph/hedera-agent-kit`. The local `@/shared/...` paths from v3 disappear.

### 2. The body of the old `execute` is split into lifecycle stages

The old `execute` function held four concerns in one block. v4 puts each in its own method so hooks/policies (`AbstractHook`, `AbstractPolicy`) can wrap them:

| v3 line in `execute`                                  | v4 stage                              |
|-------------------------------------------------------|---------------------------------------|
| `HederaParameterNormaliser.normaliseTransferHbar(...)` | `normalizeParams` (stage 2)           |
| `HederaBuilder.transferHbar(...)`                      | `coreAction` (stage 4)                |
| `handleTransaction(tx, client, context, postProcess)`  | `secondaryAction` (stage 6)           |
| `try / catch` block                                    | `handleError`                         |

No code inside those blocks moves between methods — each chunk is lifted as-is into its new home.

### 3. The factory returns a `BaseTool` instance

```diff
- const tool = (context: Context): Tool => ({
-   method: TRANSFER_HBAR_TOOL,
-   name: 'Transfer HBAR',
-   description: transferHbarPrompt(context),
-   parameters: transferHbarParameters(context),
-   execute: transferHbar,
-   outputParser: transactionToolOutputParser,
- });
+ const tool = (context: Context): BaseTool => new TransferHbarTool(context);
```

The fields that used to live on the literal (`method`, `name`, `description`, `parameters`, `outputParser`) become class fields. `description` and `parameters` are computed in the constructor because they depend on `context`.

`Plugin.tools()` returns `Tool[]`; `BaseTool` is the v4-supported implementation of that interface, so the factory's new return type is the right one.

## What does NOT change

These are byte-for-byte identical between the two files:

- `transferHbarPrompt(context)` — prompt function and its `PromptGenerator.*` helpers.
- `transferHbarParameters(context)` — Zod schema, including every `.describe()`.
- `postProcess(response)` — formats the human message from `RawTransactionResponse`.
- `TRANSFER_HBAR_TOOL` constant.
- The behaviour observable to the LLM and to the consumer of the tool.

## Why migrate this tool?

`BaseTool` is the supported authoring shape in v4 — every custom tool must be migrated. The v3 functional shape is unsupported and bypasses the hooks/policies lifecycle. After migration, hooks (`HcsAuditTrailHook`, custom subclasses of `AbstractHook`) and policies (`MaxRecipientsPolicy`, `RejectToolPolicy`, custom subclasses of `AbstractPolicy`) fire automatically at stages 1, 3, 5, 7.

## Generalising to other tools

Apply the same three-step transformation to every custom tool in the plugin:

1. **Mutation tools** (token create, mint, transfer, account update, topic submit, EVM call): follow this example exactly. `coreAction` builds the `Transaction`, `secondaryAction` calls `handleTransaction`.
2. **Query tools** (token info, balance lookup, mirror-node fetches): `coreAction` returns the final `{ raw, humanMessage }` directly. Override `shouldSecondaryAction` to return `false` and provide a no-op `secondaryAction`. Use `untypedQueryOutputParser` instead of `transactionToolOutputParser`.

See `references/basetool-migration.md` for the query-tool variant and the second `BaseTool<TParams, TNormalisedParams>` generic (used when `normalizeParams` resolves defaults).
