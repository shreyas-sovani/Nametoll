/**
 * v3 — `transfer_hbar` tool, functional `Tool` style.
 *
 * This file is the BEFORE state for the migration example. It shows the
 * canonical v3 shape: import from `hedera-agent-kit` (unscoped), import the
 * SDK from `@hashgraph/sdk`, and return an object literal with an `execute`
 * function from the factory. There are no hookable seams — every step
 * (normalisation, transaction build, signing/submission, error handling)
 * is collapsed inside one async function.
 *
 * The matching AFTER file (`after-v4.ts`) keeps the prompt, schema, and
 * post-process helpers byte-for-byte identical and only restructures the
 * execute flow into a `BaseTool` subclass.
 */

import { z } from 'zod';
import type { Context } from '@/shared/configuration';
import type { Tool } from '@/shared/tools';
import { Client, Status } from '@hashgraph/sdk';
import { handleTransaction, RawTransactionResponse } from '@/shared/strategies/tx-mode-strategy';
import HederaBuilder from '@/shared/hedera-utils/hedera-builder';
import { transferHbarParameters } from '@/shared/parameter-schemas/account.zod';
import HederaParameterNormaliser from '@/shared/hedera-utils/hedera-parameter-normaliser';
import { PromptGenerator } from '@/shared/utils/prompt-generator';
import { transactionToolOutputParser } from '@/shared/utils/default-tool-output-parsing';

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

const postProcess = (response: RawTransactionResponse) => {
  if (response.scheduleId) {
    return `Scheduled HBAR transfer created successfully.
Transaction ID: ${response.transactionId}
Schedule ID: ${response.scheduleId.toString()}`;
  }
  return `HBAR successfully transferred.
Transaction ID: ${response.transactionId}`;
};

// Monolithic execute — every stage of the lifecycle lives here.
// Hooks and policies have no entry point because there are no
// distinct lifecycle stages exposed to the framework.
const transferHbar = async (
  client: Client,
  context: Context,
  params: z.infer<ReturnType<typeof transferHbarParameters>>,
) => {
  try {
    const normalisedParams = await HederaParameterNormaliser.normaliseTransferHbar(
      params,
      context,
      client,
    );
    const tx = HederaBuilder.transferHbar(normalisedParams);
    return await handleTransaction(tx, client, context, postProcess);
  } catch (error) {
    const desc = 'Failed to transfer HBAR';
    const message = desc + (error instanceof Error ? `: ${error.message}` : '');
    console.error('[transfer_hbar_tool]', message);
    return {
      raw: { status: Status.InvalidTransaction, error: message },
      humanMessage: message,
    };
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
