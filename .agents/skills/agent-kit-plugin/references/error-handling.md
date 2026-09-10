# Error Handling and Output Parsing

Patterns for handling errors and formatting tool output in Hedera plugins. All tools extend `BaseTool` and centralise their failure path in `handleError` instead of wrapping every stage in a `try/catch`.

## Standard Response Structure

All tools return a consistent response structure:

```typescript
interface ToolResponse {
  raw: any;           // Technical data for programmatic use
  humanMessage: string; // Formatted message for user display
}
```

## How `BaseTool` handles errors

`BaseTool.execute()` runs the lifecycle and routes any thrown error through `handleError(error, context)`. The default implementation returns a generic structured failure; override it on your subclass to tag the log with the tool method and shape the `raw` payload.

```typescript
async handleError(error: unknown, _context: Context): Promise<ToolResponse> {
  const message = 'Failed to perform operation' + (error instanceof Error ? `: ${error.message}` : '');
  console.error('[my_tool_name]', message);
  return { raw: { error: message }, humanMessage: message };
}
```

This means **`normalizeParams`, `coreAction`, and `secondaryAction` should `throw` on failure** — let `handleError` do the formatting once.

### With Hedera SDK `Status` codes

```typescript
import { Status } from '@hiero-ledger/sdk';

async handleError(error: unknown, _context: Context) {
  const message = 'Failed to create token' + (error instanceof Error ? `: ${error.message}` : '');
  console.error('[create_token_tool]', message);
  return {
    raw: { status: Status.InvalidTransaction, error: message },
    humanMessage: message,
  };
}
```

### Validating preconditions early

Throw inside `normalizeParams` or `coreAction` for known failure modes — `handleError` will format the response:

```typescript
async normalizeParams(params: TransferParams, _context: Context, client: Client) {
  const accountInfo = await getAccountInfo(params.toAccountId);
  if (!accountInfo) {
    throw new Error(`Account ${params.toAccountId} does not exist`);
  }

  const balance = await getBalance(client);
  if (balance < params.amount) {
    throw new Error(`Insufficient balance. Have ${balance}, need ${params.amount}`);
  }

  return params;
}
```

For cases where you want a **non-throwing** structured short-circuit (e.g. an HTTP 404 from the mirror node should produce a "not found" message but isn't really an error), return the structured response directly from `coreAction` and let the lifecycle complete normally:

```typescript
async coreAction(params: GetTokenInfoParams, _context: Context, client: Client) {
  const response = await fetch(/* ... */);
  if (response.status === 404) {
    return {
      raw: { error: 'Token not found' },
      humanMessage: `Token ${params.tokenId} was not found on the network`,
    };
  }
  if (!response.ok) {
    throw new Error(`Mirror node returned ${response.status}`);
  }
  // ...
}
```

## Post-Processing Functions

### Transaction Results

```typescript
import { RawTransactionResponse } from '@hashgraph/hedera-agent-kit';

const postProcess = (response: RawTransactionResponse): string => {
  // Handle scheduled transactions
  if (response.scheduleId) {
    return `Scheduled transaction created successfully.
Transaction ID: ${response.transactionId}
Schedule ID: ${response.scheduleId.toString()}`;
  }

  // Handle regular transactions
  const tokenIdStr = response.tokenId
    ? response.tokenId.toString()
    : 'unknown';

  return `Token created successfully.
Transaction ID: ${response.transactionId}
Token ID: ${tokenIdStr}`;
};
```

### Query Results

```typescript
interface TokenInfo {
  token_id: string;
  name: string;
  symbol: string;
  decimals: string;
  total_supply: string;
  supply_type: string;
}

const postProcess = (tokenInfo: TokenInfo): string => {
  const formatSupply = (supply: string) => {
    const decimals = Number(tokenInfo.decimals || '0');
    const amount = Number(supply);
    if (isNaN(amount)) return supply;
    return (amount / 10 ** decimals).toLocaleString();
  };

  const supplyType = tokenInfo.supply_type === 'INFINITE'
    ? 'Infinite'
    : 'Finite';

  return `Token **${tokenInfo.token_id}** Details:
- **Name**: ${tokenInfo.name}
- **Symbol**: ${tokenInfo.symbol}
- **Decimals**: ${tokenInfo.decimals}
- **Current Supply**: ${formatSupply(tokenInfo.total_supply)}
- **Supply Type**: ${supplyType}`;
};
```

### Account Balance Results

```typescript
interface AccountBalance {
  account: string;
  balance: number;
  tokens: Array<{ token_id: string; balance: number }>;
}

const postProcess = (balance: AccountBalance): string => {
  const hbarBalance = (balance.balance / 100_000_000).toFixed(8);

  let message = `Account **${balance.account}** Balance:
- **HBAR**: ${hbarBalance}`;

  if (balance.tokens.length > 0) {
    message += '\n- **Tokens**:';
    for (const token of balance.tokens) {
      message += `\n  - ${token.token_id}: ${token.balance}`;
    }
  }

  return message;
};
```

## Built-in Output Parsers

Set `outputParser` as a property on your `BaseTool` subclass.

### transactionToolOutputParser

Use for mutation tools:

```typescript
import { transactionToolOutputParser } from '@hashgraph/hedera-agent-kit';

export class CreateTokenTool extends BaseTool</* ... */> {
  outputParser = transactionToolOutputParser;
  // ...
}
```

### untypedQueryOutputParser

Use for query tools:

```typescript
import { untypedQueryOutputParser } from '@hashgraph/hedera-agent-kit';

export class GetTokenInfoTool extends BaseTool</* ... */> {
  outputParser = untypedQueryOutputParser;
  // ...
}
```

## Using `handleTransaction`

For mutation tools, call `handleTransaction` from `secondaryAction`. It handles execution, error mapping, and feeds `RawTransactionResponse` into your `postProcess`:

```typescript
import { handleTransaction, RawTransactionResponse, BaseTool } from '@hashgraph/hedera-agent-kit';

async secondaryAction(transaction: TokenCreateTransaction, client: Client, context: Context) {
  return handleTransaction(transaction, client, context, postProcess);
}
```

## Logging Conventions

Use consistent logging format inside `handleError` and any custom logs:

```typescript
console.error('[create_token_tool]', 'Failed to create token:', error.message);
console.log('[transfer_tool]', 'Transfer completed:', result.transactionId);
console.warn('[query_tool]', 'Rate limit approaching');
```

## Complete Tool Example with Error Handling

```typescript
import { z } from 'zod';
import { Client, Status, TokenMintTransaction } from '@hiero-ledger/sdk';
import {
  BaseTool,
  Context,
  handleTransaction,
  RawTransactionResponse,
  transactionToolOutputParser,
} from '@hashgraph/hedera-agent-kit';

export const MINT_TOKEN_TOOL = 'mint_token_tool';

const mintTokenPrompt = (_context: Context = {}) => `
This tool mints additional supply of a fungible token on Hedera.
Parameters:
- tokenId (str, required): The token ID to mint
- amount (int, required): Amount of tokens to mint`;

const mintTokenParameters = (_context: Context = {}) => z.object({
  tokenId: z.string().describe('Token ID to mint'),
  amount: z.number().int().positive().describe('Amount to mint'),
});

type MintTokenParams = z.infer<ReturnType<typeof mintTokenParameters>>;

const postProcess = (response: RawTransactionResponse): string => {
  if (response.scheduleId) {
    return `Scheduled mint transaction created.
Transaction ID: ${response.transactionId}
Schedule ID: ${response.scheduleId.toString()}`;
  }
  return `Tokens minted successfully.
Transaction ID: ${response.transactionId}
New Supply: ${response.newTotalSupply ?? 'Updated'}`;
};

export class MintTokenTool extends BaseTool<MintTokenParams, MintTokenParams> {
  method = MINT_TOKEN_TOOL;
  name = 'Mint Token';
  description: string;
  parameters: ReturnType<typeof mintTokenParameters>;
  outputParser = transactionToolOutputParser;

  constructor(context: Context) {
    super();
    this.description = mintTokenPrompt(context);
    this.parameters = mintTokenParameters(context);
  }

  // Stage 2 — validate preconditions; throw on failure.
  async normalizeParams(params: MintTokenParams) {
    const tokenInfo = await fetchTokenInfo(params.tokenId);
    if (!tokenInfo) {
      throw new Error(`Token ${params.tokenId} does not exist`);
    }
    if (!tokenInfo.supplyKey) {
      throw new Error(`Token ${params.tokenId} does not have a supply key and cannot be minted`);
    }
    return params;
  }

  // Stage 4 — build the transaction.
  async coreAction(params: MintTokenParams, _context: Context, _client: Client) {
    return new TokenMintTransaction()
      .setTokenId(params.tokenId)
      .setAmount(params.amount);
  }

  // Stage 6 — sign and submit.
  async secondaryAction(transaction: TokenMintTransaction, client: Client, context: Context) {
    return handleTransaction(transaction, client, context, postProcess);
  }

  async handleError(error: unknown, _context: Context) {
    const message = 'Failed to mint tokens' + (error instanceof Error ? `: ${error.message}` : '');
    console.error('[mint_token_tool]', message);
    return {
      raw: { status: Status.InvalidTransaction, error: message },
      humanMessage: message,
    };
  }
}

declare function fetchTokenInfo(tokenId: string): Promise<{ supplyKey?: unknown } | null>;

const tool = (context: Context): BaseTool => new MintTokenTool(context);
export default tool;
```

## Error Response Best Practices

1. **Throw, don't `try/catch` per stage** — let `BaseTool.execute()` route through `handleError`
2. **Return structured short-circuits** for "expected absences" (404s, missing optional resources) where the call is not really an error
3. **Tag logs with the tool method** in `handleError`
4. **Use Hedera `Status` codes** in the `raw` payload for transaction failures
5. **Validate preconditions in `normalizeParams`** so failures fire before the transaction is built
6. **Format `humanMessage` for users** — readable, no stack traces, no internal jargon
