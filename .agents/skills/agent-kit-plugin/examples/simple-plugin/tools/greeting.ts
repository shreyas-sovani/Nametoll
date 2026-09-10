/**
 * Simple Greeting Tool Example
 *
 * Demonstrates the BaseTool pattern on a "query-style" tool — one that does
 * no Hedera transaction, only computes a value. The lifecycle skips
 * `secondaryAction` because `shouldSecondaryAction` returns false.
 */

import { z } from 'zod';
import { BaseTool, Context, untypedQueryOutputParser } from '@hashgraph/hedera-agent-kit';

/**
 * Tool name constant — exported for external reference.
 * Convention: UPPER_SNAKE_CASE with _TOOL suffix.
 */
export const GREETING_TOOL = 'greeting_tool';

/**
 * Prompt function — describes the tool to the AI agent.
 * Returns a string that helps the AI understand when to use this tool.
 */
const greetingPrompt = (_context: Context = {}) => {
  return `This tool generates a greeting message.
Parameters:
- name (str, required): The name to greet
- formal (bool, optional): Whether to use formal greeting, defaults to false`;
};

/**
 * Parameters function — defines and validates input using Zod.
 * Always use `.describe()` on each field; the AI uses these descriptions
 * to decide how to fill the parameters.
 */
const greetingParameters = (_context: Context = {}) => {
  return z.object({
    name: z.string().describe('The name to greet'),
    formal: z.boolean().optional().describe('Use formal greeting style'),
  });
};

type GreetingParams = z.infer<ReturnType<typeof greetingParameters>>;

/**
 * Post-process — formats the result for human display
 */
const postProcess = (result: { greeting: string; name: string }) =>
  `${result.greeting}\n\nWelcome to Hedera, ${result.name}!`;

/**
 * BaseTool subclass.
 *
 * For pure-compute tools, override `shouldSecondaryAction` to return false
 * so the lifecycle ends after `coreAction`. `secondaryAction` is still
 * required by the abstract class — implement it as a no-op pass-through.
 */
export class GreetingTool extends BaseTool<GreetingParams, GreetingParams> {
  method = GREETING_TOOL;
  name = 'Generate Greeting';
  description: string;
  parameters: ReturnType<typeof greetingParameters>;
  outputParser = untypedQueryOutputParser;

  constructor(context: Context) {
    super();
    this.description = greetingPrompt(context);
    this.parameters = greetingParameters(context);
  }

  // Stage 2 — pass-through; no normalisation needed.
  async normalizeParams(params: GreetingParams) {
    return params;
  }

  // Stage 4 — produce the result directly.
  async coreAction(params: GreetingParams) {
    const { name, formal = false } = params;
    const greeting = formal
      ? `Good day, ${name}. It is a pleasure to make your acquaintance.`
      : `Hey ${name}! Great to meet you!`;
    const result = { greeting, name };
    return { raw: result, humanMessage: postProcess(result) };
  }

  // Skip stage 6 — no transaction to sign/submit.
  async shouldSecondaryAction() {
    return false;
  }

  // Never invoked — `shouldSecondaryAction` returns false. Provided only
  // because the abstract class requires an implementation.
  async secondaryAction(result: any) {
    return result;
  }

  async handleError(error: unknown) {
    const message = 'Failed to generate greeting' + (error instanceof Error ? `: ${error.message}` : '');
    console.error('[greeting_tool]', message);
    return { raw: { error: message }, humanMessage: message };
  }
}

/**
 * Tool factory — returns a BaseTool instance, accepted everywhere a Tool is.
 */
const tool = (context: Context): BaseTool => new GreetingTool(context);

export default tool;
