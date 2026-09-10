# Migrating Custom Tools: `Tool` → `BaseTool`

Reference for converting one v3 tool (object literal with `execute`) into a v4 `BaseTool` subclass. **`BaseTool` is the supported authoring pattern in v4**; every custom tool in the project must be migrated. The v3 functional shape is unsupported and bypasses the hooks (`AbstractHook`) and policies (`AbstractPolicy`) system entirely.

## The 7-stage lifecycle

```text
[1] preToolExecutionHook
[2] normalizeParams         ← author logic
[3] postParamsNormalizationHook
[4] coreAction              ← author logic
[5] postCoreActionHook
[6] secondaryAction         ← author logic (optional, e.g. tx signing/submission)
[7] postToolExecutionHook
```

Hooks/policies hook into stages 1, 3, 5, 7. The author writes 2, 4, 6.

## Mechanical conversion checklist

Walk through these in order on every tool file:

1. **Imports**
   - Replace `import type { Tool }` with `import { BaseTool }` from `@hashgraph/hedera-agent-kit`.
   - Replace `from '@hashgraph/sdk'` with `from '@hiero-ledger/sdk'`.

2. **Identify the body of the old `execute` function**
   - Lines that resolve defaults / validate IDs / look up the operator → go into `normalizeParams`.
   - Lines that build a `Transaction` (or fetch from mirror node for queries) → go into `coreAction`.
   - The `await handleTransaction(...)` call → goes into `secondaryAction`.
   - The `try/catch` block → goes into an `handleError` override.

3. **Declare the class**
   - `export class MyTool extends BaseTool<TParams, TNormalisedParams>`. Both generics are optional; when `normalizeParams` resolves defaults, declaring `TNormalisedParams` lets `coreAction` rely on a non-undefined type and removes the need for `!` assertions.
   - Required fields: `method`, `name`, `description`, `parameters`.
   - Optional fields: `outputParser`.

4. **Constructor**
   - Set `description = promptFn(context)` and `parameters = paramSchemaFn(context)` in the constructor. Preserve the v3 prompt and Zod functions verbatim — they did not change.

5. **`shouldSecondaryAction` for query tools**
   - Override to return `false`. Provide a no-op `secondaryAction` to satisfy the abstract class (it is never invoked when `shouldSecondaryAction` is `false`).

6. **Factory**
   - Replace `(context: Context): Tool => ({ method, name, ..., execute })` with `(context: Context): BaseTool => new MyTool(context)`.
   - `Plugin.tools()` accepts the new return type unchanged.

## Mutation tool — annotated before/after

Reference example: the `transfer_hbar` tool. The same pattern applies to every state-changing tool (token create, mint, transfer, account update, topic submit, EVM call, etc.).

### Before — v3 functional style

```typescript
import { z } from 'zod';
import type { Context } from '@/shared/configuration';
import type { Tool } from '@/shared/tools';                                   // ← old type
import { Client, Status } from '@hashgraph/sdk';                              // ← old SDK package
import { handleTransaction, RawTransactionResponse } from '@/shared/strategies/tx-mode-strategy';
import HederaBuilder from '@/shared/hedera-utils/hedera-builder';
import { transferHbarParameters } from '@/shared/parameter-schemas/account.zod';
import HederaParameterNormaliser from '@/shared/hedera-utils/hedera-parameter-normaliser';
import { transactionToolOutputParser } from '@/shared/utils/default-tool-output-parsing';

const transferHbarPrompt = (context: Context = {}) => `…`;

const postProcess = (response: RawTransactionResponse) => {
  if (response.scheduleId) {
    return `Scheduled HBAR transfer created…`;
  }
  return `HBAR successfully transferred. Transaction ID: ${response.transactionId}`;
};

// Monolithic execute — every step lives here. No hookable seams.
const transferHbar = async (
  client: Client,
  context: Context,
  params: z.infer<ReturnType<typeof transferHbarParameters>>,
) => {
  try {
    const normalisedParams = await HederaParameterNormaliser.normaliseTransferHbar(
      params, context, client,
    );
    const tx = HederaBuilder.transferHbar(normalisedParams);
    return await handleTransaction(tx, client, context, postProcess);
  } catch (error) {
    const message = 'Failed to transfer HBAR' + (error instanceof Error ? `: ${error.message}` : '');
    console.error('[transfer_hbar_tool]', message);
    return { raw: { status: Status.InvalidTransaction, error: message }, humanMessage: message };
  }
};

export const TRANSFER_HBAR_TOOL = 'transfer_hbar_tool';

const tool = (context: Context): Tool => ({
  method: TRANSFER_HBAR_TOOL,
  name: 'Transfer HBAR',
  description: transferHbarPrompt(context),
  parameters: transferHbarParameters(context),
  execute: transferHbar,
  outputParser: transactionToolOutputParser,
});

export default tool;
```

### After — v4 `BaseTool` class

```typescript
import { z } from 'zod';
import type { Context } from '@/shared/configuration';
import {
  BaseTool,                                                                   // ← new abstract class
  handleTransaction,
  RawTransactionResponse,
  transactionToolOutputParser,
} from '@hashgraph/hedera-agent-kit';                                         // ← new package
import { Client, Status } from '@hiero-ledger/sdk';                           // ← new SDK package
import HederaBuilder from '@/shared/hedera-utils/hedera-builder';
import { transferHbarParameters } from '@/shared/parameter-schemas/account.zod';
import HederaParameterNormaliser from '@/shared/hedera-utils/hedera-parameter-normaliser';

// Prompt + Zod schema — unchanged from v3.
const transferHbarPrompt = (context: Context = {}) => `…`;

const postProcess = (response: RawTransactionResponse) => {
  if (response.scheduleId) {
    return `Scheduled HBAR transfer created…`;
  }
  return `HBAR successfully transferred. Transaction ID: ${response.transactionId}`;
};

export const TRANSFER_HBAR_TOOL = 'transfer_hbar_tool';

type TransferHbarParams = z.infer<ReturnType<typeof transferHbarParameters>>;

export class TransferHbarTool extends BaseTool<TransferHbarParams> {
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

  // Stage 2 — resolve defaults that need the client/context.
  async normalizeParams(params: TransferHbarParams, context: Context, client: Client) {
    return HederaParameterNormaliser.normaliseTransferHbar(params, context, client);
  }

  // Stage 4 — build the transaction. No signing/submission yet.
  async coreAction(normalisedParams: any, _context: Context, _client: Client) {
    return HederaBuilder.transferHbar(normalisedParams);
  }

  // Stage 6 — sign and submit. Mutation tools always have something here.
  async secondaryAction(transaction: any, client: Client, context: Context) {
    return handleTransaction(transaction, client, context, postProcess);
  }

  // Single failure path — replaces the old try/catch in execute.
  // Use `override` — `handleError` is a concrete method on BaseTool and projects with
  // `noImplicitOverride: true` (a common strict-TS setting) require the modifier.
  override async handleError(error: unknown, _context: Context) {
    const message = 'Failed to transfer HBAR' + (error instanceof Error ? `: ${error.message}` : '');
    console.error('[transfer_hbar_tool]', message);
    return {
      raw: { status: Status.InvalidTransaction, error: message },
      humanMessage: message,
    };
  }
}

const tool = (context: Context): BaseTool => new TransferHbarTool(context);

export default tool;
```

## Query tool — additional override

For read-only tools (token info, balance lookups, mirror-node fetches), `coreAction` returns the final result directly and there is nothing to sign or submit. Override `shouldSecondaryAction` to skip stage 6:

```typescript
export class GetTokenInfoTool extends BaseTool<GetTokenInfoParams> {
  method = GET_TOKEN_INFO_TOOL;
  name = 'Get Token Info';
  description: string;
  parameters: ReturnType<typeof getTokenInfoParameters>;
  outputParser = untypedQueryOutputParser;

  constructor(context: Context) {
    super();
    this.description = getTokenInfoPrompt(context);
    this.parameters = getTokenInfoParameters(context);
  }

  async normalizeParams(params: GetTokenInfoParams) {
    // validate format, etc.
    return params;
  }

  async coreAction(params: GetTokenInfoParams, _context: Context, client: Client) {
    // fetch from mirror node, format, and return the final response
    return { raw: { /* … */ }, humanMessage: 'Token info: …' };
  }

  // Skip stage 6 — pure query.
  override async shouldSecondaryAction() {
    return false;
  }

  // Required by the abstract class but never invoked when shouldSecondaryAction is false.
  override async secondaryAction(result: any) {
    return result;
  }
}
```

## Using the second `BaseTool` generic

`BaseTool<TParams, TNormalisedParams>` accepts a second generic for the **normalised** params type — what `normalizeParams` returns and what `coreAction` consumes. Use it whenever `normalizeParams` resolves defaults that the rest of the lifecycle should treat as guaranteed.

Example — a token-create tool whose schema marks `treasuryAccountId` as optional, but whose `normalizeParams` falls back to the operator account:

```typescript
type CreateTokenParams = z.infer<ReturnType<typeof createTokenParameters>>;

// Narrow `treasuryAccountId` from `string | undefined` to `string` after normalisation.
type NormalisedCreateTokenParams = CreateTokenParams & {
  treasuryAccountId: string;
};

export class CreateTokenTool extends BaseTool<CreateTokenParams, NormalisedCreateTokenParams> {
  async normalizeParams(
    params: CreateTokenParams,
    _context: Context,
    client: Client,
  ): Promise<NormalisedCreateTokenParams> {
    const treasury = params.treasuryAccountId ?? client.operatorAccountId?.toString();
    if (!treasury) throw new Error('No operator and no treasuryAccountId supplied');
    return { ...params, treasuryAccountId: treasury };
  }

  async coreAction(params: NormalisedCreateTokenParams, _ctx: Context, _c: Client) {
    // params.treasuryAccountId is `string`, not `string | undefined` — no `!` needed
    return new TokenCreateTransaction()
      .setTreasuryAccountId(params.treasuryAccountId)
      // …
      ;
  }
}
```

Without the second generic, `coreAction` would receive the original `CreateTokenParams` and the type checker would still see `treasuryAccountId: string | undefined`, forcing `!` or a redundant null check.

## What does NOT change

These remain stable across the migration — do not rewrite them:

- The Zod parameter schema function and its `.describe()` strings.
- The prompt function returning the LLM-facing description.
- The `postProcess` helper that formats the human message from `RawTransactionResponse`.
- Mirror-node service usage (`context.mirrornodeService`, `getMirrornodeService(...)`).
- `handleTransaction`'s signature and behaviour.
- Tool method constants (`export const MY_TOOL = 'my_tool'`).

## Common pitfalls

- **Forgetting `super()` in the constructor** — TypeScript will error; do not work around it by skipping the constructor entirely. Move all field initialisation back into `super()` plus assignments.
- **Missing `override` modifier on overridden methods** — projects with `noImplicitOverride: true` (a common strict-TS setting; bun's default `tsconfig` enables strict mode in general) will reject overrides without the keyword. Apply `override` to every method that's concrete on the base class: `handleError`, `shouldSecondaryAction`, and the no-op `secondaryAction` in query tools. `normalizeParams` and `coreAction` are abstract and don't need it.
- **Trying to call `preToolExecutionHook` / `postCoreActionHook` from inside the class** — those are dispatched by `BaseTool.execute()` based on the registered hooks/policies. Never invoke them manually.
- **Returning the raw transaction from `secondaryAction` instead of calling `handleTransaction`** — for canonical mutation tools, the framework expects the `{ raw, humanMessage }` shape that `handleTransaction` produces. Tools that need custom mode dispatch (e.g. plugins that build EVM call data manually and want both AUTONOMOUS execution and a custom RETURN_BYTES path) can implement that logic directly in `secondaryAction` as long as the return value still matches `{ raw, humanMessage }`.
- **Leaving the v3 `try/catch` inside `coreAction`** — it swallows errors that `handleError` should format. Move the catch to `handleError`.
- **Throwing a string from `normalizeParams` instead of an `Error`** — v3 tools sometimes returned a user-friendly error message as a plain string. In v4, `normalizeParams` must return the normalised params or throw. Throw `new Error(message)` and format inside `handleError`.
- **Leaving any tool as a `Tool` object literal** — every tool the plugin exports must extend `BaseTool`. Mixing v3-style and v4-style tools in the same plugin is unsupported.
