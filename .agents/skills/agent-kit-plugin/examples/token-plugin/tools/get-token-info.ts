/**
 * Get Token Info Tool Example
 *
 * A query tool that retrieves token information from Hedera mirror node.
 * Demonstrates the BaseTool pattern for read-only operations:
 * `coreAction` returns the result directly and `shouldSecondaryAction`
 * is set to false so the lifecycle ends after stage 4.
 */

import { z } from 'zod';
import { Client } from '@hiero-ledger/sdk';
import { BaseTool, Context, untypedQueryOutputParser } from '@hashgraph/hedera-agent-kit';

/**
 * Tool name constant
 */
export const GET_TOKEN_INFO_TOOL = 'get_token_info_tool';

/**
 * Token info response type from mirror node
 */
interface TokenInfo {
  token_id: string;
  name: string;
  symbol: string;
  decimals: string;
  total_supply: string;
  supply_type: string;
  treasury_account_id: string;
  created_timestamp: string;
  modified_timestamp: string;
  freeze_default: boolean;
}

/**
 * Prompt function for query tools.
 *
 * Query tools typically have simpler prompts since they only read data
 * and don't modify state.
 */
const getTokenInfoPrompt = (_context: Context = {}) => {
  return `This tool retrieves information about a Hedera token.
Parameters:
- tokenId (str, required): The token ID to query (e.g., 0.0.12345)

Returns token details including name, symbol, supply, decimals, and treasury account.`;
};

/**
 * Parameter schema for queries.
 *
 * Query parameters are typically simpler than transaction params —
 * usually just identifiers and optional pagination/filtering.
 */
const getTokenInfoParameters = (_context: Context = {}) => {
  return z.object({
    tokenId: z.string()
      .describe('The token ID to query (e.g., 0.0.12345)'),
  });
};

type GetTokenInfoParams = z.infer<ReturnType<typeof getTokenInfoParameters>>;

/**
 * Format the raw mirror node response into a user-friendly message.
 */
const postProcess = (tokenInfo: TokenInfo): string => {
  const formatSupply = (supply: string) => {
    const decimals = Number(tokenInfo.decimals || '0');
    const amount = Number(supply);
    if (isNaN(amount)) return supply;
    return (amount / 10 ** decimals).toLocaleString();
  };

  const supplyType = tokenInfo.supply_type === 'INFINITE' ? 'Infinite' : 'Finite';
  const freezeStatus = tokenInfo.freeze_default ? 'Frozen by default' : 'Not frozen by default';
  const formatTimestamp = (ts: string) => {
    const seconds = parseFloat(ts);
    return new Date(seconds * 1000).toISOString();
  };

  return `**Token ${tokenInfo.token_id}** Information:

**Basic Info:**
- **Name**: ${tokenInfo.name}
- **Symbol**: ${tokenInfo.symbol}
- **Decimals**: ${tokenInfo.decimals}

**Supply:**
- **Current Supply**: ${formatSupply(tokenInfo.total_supply)}
- **Supply Type**: ${supplyType}

**Accounts:**
- **Treasury**: ${tokenInfo.treasury_account_id}

**Settings:**
- **Freeze**: ${freezeStatus}

**Timestamps:**
- **Created**: ${formatTimestamp(tokenInfo.created_timestamp)}
- **Modified**: ${formatTimestamp(tokenInfo.modified_timestamp)}`;
};

/**
 * BaseTool subclass for a read-only mirror-node query.
 */
export class GetTokenInfoTool extends BaseTool<GetTokenInfoParams, GetTokenInfoParams> {
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

  // Stage 2 — validate the token ID up front.
  async normalizeParams(params: GetTokenInfoParams) {
    const tokenIdRegex = /^\d+\.\d+\.\d+$/;
    if (!tokenIdRegex.test(params.tokenId)) {
      throw new Error(`Invalid token ID format: ${params.tokenId}. Expected format: X.X.X (e.g., 0.0.12345)`);
    }
    return params;
  }

  // Stage 4 — fetch from the mirror node and produce the final response.
  async coreAction(params: GetTokenInfoParams, _context: Context, client: Client) {
    const network = client.ledgerId?.toString() || 'testnet';
    const mirrorNodeUrl = `https://${network}.mirrornode.hedera.com`;
    const response = await fetch(`${mirrorNodeUrl}/api/v1/tokens/${params.tokenId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          raw: { error: 'Token not found' },
          humanMessage: `Token ${params.tokenId} was not found on the network`,
        };
      }
      throw new Error(`Mirror node returned ${response.status}`);
    }

    const tokenInfo: TokenInfo = await response.json();
    return {
      raw: { tokenId: params.tokenId, tokenInfo },
      humanMessage: postProcess(tokenInfo),
    };
  }

  // Skip stage 6 — pure query, nothing to sign or submit.
  async shouldSecondaryAction() {
    return false;
  }

  async secondaryAction(result: any) {
    return result;
  }

  async handleError(error: unknown) {
    const message = 'Failed to get token info' + (error instanceof Error ? `: ${error.message}` : '');
    console.error('[get_token_info_tool]', message);
    return { raw: { error: message }, humanMessage: message };
  }
}

const tool = (context: Context): BaseTool => new GetTokenInfoTool(context);

export default tool;
