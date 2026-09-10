/**
 * Create Token Tool Example
 *
 * A mutation tool that creates a fungible token on Hedera.
 * Demonstrates the complete pattern for state-changing operations.
 */

import { z } from 'zod';
import { Client, Status, TokenCreateTransaction, TokenType, TokenSupplyType } from '@hiero-ledger/sdk';
import {
  BaseTool,
  Context,
  handleTransaction,
  RawTransactionResponse,
  transactionToolOutputParser,
} from '@hashgraph/hedera-agent-kit';

/**
 * Tool name constant
 */
export const CREATE_TOKEN_TOOL = 'create_token_tool';

/**
 * Prompt function with context awareness.
 *
 * The prompt tells the AI agent:
 * - what this tool does
 * - what parameters it accepts
 * - parameter types and requirements
 */
const createTokenPrompt = (context: Context = {}) => {
  let contextSnippet = '';
  if (context.accountId) {
    contextSnippet = `Current operator account: ${context.accountId}\n\n`;
  }

  return `${contextSnippet}This tool creates a fungible token on Hedera.
Parameters:
- tokenName (str, required): The name of the token
- tokenSymbol (str, required): The symbol of the token (e.g., "USDC")
- initialSupply (int, optional): Initial supply of tokens, defaults to 0
- decimals (int, optional): Decimal places (0-18), defaults to 0
- supplyType (str, optional): "finite" or "infinite", defaults to "infinite"
- maxSupply (int, optional): Maximum supply (required if supplyType is "finite")
- treasuryAccountId (str, optional): Treasury account, defaults to operator

Note: Token IDs are returned in format X.X.X (e.g., 0.0.12345)`;
};

/**
 * Parameter schema using Zod.
 *
 * This schema:
 * - validates input at runtime
 * - provides TypeScript types via `z.infer`
 * - describes fields for the AI agent (via `.describe()`)
 */
const createTokenParameters = (_context: Context = {}) => {
  return z.object({
    tokenName: z.string()
      .describe('The name of the token'),
    tokenSymbol: z.string()
      .describe('The symbol of the token'),
    initialSupply: z.number().int().min(0).optional()
      .describe('Initial supply of tokens, defaults to 0'),
    decimals: z.number().int().min(0).max(18).optional()
      .describe('Decimal places (0-18), defaults to 0'),
    supplyType: z.enum(['finite', 'infinite']).optional()
      .describe('Supply type: "finite" or "infinite"'),
    maxSupply: z.number().int().positive().optional()
      .describe('Maximum supply (required for finite supply type)'),
    treasuryAccountId: z.string().optional()
      .describe('Treasury account ID, defaults to operator'),
  });
};

type CreateTokenParams = z.infer<ReturnType<typeof createTokenParameters>>;

/**
 * Normalised params have every default resolved — coreAction can rely on a
 * concrete `treasuryAccountId` and never has to reach back to the client.
 */
type NormalisedCreateTokenParams = CreateTokenParams & {
  treasuryAccountId: string;
};

/**
 * Post-process function — the agent kit sets `scheduleId` automatically when
 * the call was wrapped in a Schedule (via `schedulingParams` on the request).
 */
const postProcess = (response: RawTransactionResponse): string => {
  if (response.scheduleId) {
    return `Scheduled token creation transaction created.
Transaction ID: ${response.transactionId}
Schedule ID: ${response.scheduleId.toString()}

The token will be created when the scheduled transaction is executed.`;
  }

  const tokenIdStr = response.tokenId
    ? response.tokenId.toString()
    : 'unknown';

  return `Token created successfully!
Transaction ID: ${response.transactionId}
Token ID: ${tokenIdStr}

You can now use this token ID for transfers, minting, and other operations.`;
};

/**
 * BaseTool subclass — drives the 7-stage lifecycle (preToolExecutionHook →
 * normalizeParams → postParamsNormalizationHook → coreAction → postCoreActionHook
 * → secondaryAction → postToolExecutionHook). Hooks/policies registered on the
 * agent kit fire automatically at the surrounding stages.
 */
export class CreateTokenTool extends BaseTool<CreateTokenParams, NormalisedCreateTokenParams> {
  method = CREATE_TOKEN_TOOL;
  name = 'Create Fungible Token';
  description: string;
  parameters: ReturnType<typeof createTokenParameters>;
  outputParser = transactionToolOutputParser;

  constructor(context: Context) {
    super();
    this.description = createTokenPrompt(context);
    this.parameters = createTokenParameters(context);
  }

  // Stage 2 — resolve defaults that depend on the client/context.
  async normalizeParams(
    params: CreateTokenParams,
    _context: Context,
    client: Client,
  ): Promise<NormalisedCreateTokenParams> {
    const operatorId = client.operatorAccountId;
    const treasury = params.treasuryAccountId ?? operatorId?.toString();
    if (!treasury) {
      throw new Error('No operator account configured and no treasuryAccountId supplied');
    }
    return { ...params, treasuryAccountId: treasury };
  }

  // Stage 4 — build the transaction (no signing/submission yet).
  async coreAction(
    params: NormalisedCreateTokenParams,
    _context: Context,
    _client: Client,
  ): Promise<TokenCreateTransaction> {
    const tx = new TokenCreateTransaction()
      .setTokenName(params.tokenName)
      .setTokenSymbol(params.tokenSymbol)
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(params.decimals ?? 0)
      .setInitialSupply(params.initialSupply ?? 0)
      .setTreasuryAccountId(params.treasuryAccountId);

    if (params.supplyType === 'finite') {
      tx.setSupplyType(TokenSupplyType.Finite);
      if (params.maxSupply) {
        tx.setMaxSupply(params.maxSupply);
      }
    } else {
      tx.setSupplyType(TokenSupplyType.Infinite);
    }

    return tx;
  }

  // Stage 6 — sign and submit the transaction.
  async secondaryAction(
    transaction: TokenCreateTransaction,
    client: Client,
    context: Context,
  ) {
    return handleTransaction(transaction, client, context, postProcess);
  }

  // Custom error formatter — overriding the default lets us tag logs with the tool name.
  async handleError(error: unknown, _context: Context) {
    const message = 'Failed to create token' + (error instanceof Error ? `: ${error.message}` : '');
    console.error('[create_token_tool]', message);
    return {
      raw: { status: Status.InvalidTransaction, error: message },
      humanMessage: message,
    };
  }
}

/**
 * Tool factory — returns a BaseTool instance, accepted everywhere a Tool is.
 */
const tool = (context: Context): BaseTool => new CreateTokenTool(context);

export default tool;
