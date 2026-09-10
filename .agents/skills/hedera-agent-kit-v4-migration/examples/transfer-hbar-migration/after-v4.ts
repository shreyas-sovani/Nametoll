/**
 * v4 — `transfer_hbar` tool, `BaseTool` subclass.
 *
 * This file is the AFTER state. The prompt function, the Zod schema, the
 * `postProcess` helper, and the tool method constant are unchanged from
 * `before-v3.ts`. Only three things move:
 *
 *   1. Imports — `hedera-agent-kit` → `@hashgraph/hedera-agent-kit`,
 *      `@hashgraph/sdk` → `@hiero-ledger/sdk`.
 *   2. The body of the old `execute` function is split across the
 *      `normalizeParams` / `coreAction` / `secondaryAction` lifecycle stages
 *      so hooks and policies (`AbstractHook`, `AbstractPolicy`) can fire
 *      between them.
 *   3. The factory now returns a `BaseTool` subclass instance instead of an
 *      object literal — the supported shape for tools in v4.
 */

import { z } from 'zod';
import type { Context } from '@/shared/configuration';
import {
  BaseTool,
  handleTransaction,
  RawTransactionResponse,
  transactionToolOutputParser,
} from '@hashgraph/hedera-agent-kit';
import { Client, Status, Transaction } from '@hiero-ledger/sdk';
import HederaBuilder from '@/shared/hedera-utils/hedera-builder';
import { transferHbarParameters } from '@/shared/parameter-schemas/account.zod';
import HederaParameterNormaliser from '@/shared/hedera-utils/hedera-parameter-normaliser';
import { PromptGenerator } from '@/shared/utils/prompt-generator';

// Unchanged from v3.
const transferHbarPrompt = (context: Context = {}) => {
  const contextSnippet = PromptGenerator.getContextSnippet(context);
  const sourceAccountDesc = PromptGenerator.getAccountParameterDescription(
    'sourceAccountId',
    context,
  );
  const usageInstructions = PromptGenerator.getParameterUsageInstructions();
  return `
${contextSnippet}
This tool will transfer HBAR to an account.
Parameters:
- transfers (array): List of transfers. Each: { accountId, amount }
- ${sourceAccountDesc}
- transactionMemo (string, optional)
${PromptGenerator.getScheduledTransactionParamsDescription(context)}
${usageInstructions}
`;
};

// Unchanged from v3.
const postProcess = (response: RawTransactionResponse) => {
  if (response.scheduleId) {
    return `Scheduled HBAR transfer created successfully.
Transaction ID: ${response.transactionId}
Schedule ID: ${response.scheduleId.toString()}`;
  }
  return `HBAR successfully transferred.
Transaction ID: ${response.transactionId}`;
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

  // Stage 2 — was the first line of the old `execute`.
  async normalizeParams(params: TransferHbarParams, context: Context, client: Client) {
    return HederaParameterNormaliser.normaliseTransferHbar(params, context, client);
  }

  // Stage 4 — was the `HederaBuilder.transferHbar(...)` call inside `execute`.
  async coreAction(normalisedParams: any, _context: Context, _client: Client) {
    return HederaBuilder.transferHbar(normalisedParams);
  }

  // Stage 6 — was the `handleTransaction(...)` call inside `execute`.
  override async secondaryAction(transaction: Transaction, client: Client, context: Context) {
    return handleTransaction(transaction, client, context, postProcess);
  }

  // Replaces the v3 try/catch block. Called from any failed stage.
  // `override` is required when `noImplicitOverride` is enabled in tsconfig.
  override async handleError(error: unknown, _context: Context) {
    const desc = 'Failed to transfer HBAR';
    const message = desc + (error instanceof Error ? `: ${error.message}` : '');
    console.error('[transfer_hbar_tool]', message);
    return {
      raw: { status: Status.InvalidTransaction, error: message },
      humanMessage: message,
    };
  }
}

const tool = (context: Context): BaseTool => new TransferHbarTool(context);

export default tool;
