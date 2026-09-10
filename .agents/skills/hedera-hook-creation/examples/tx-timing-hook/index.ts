/**
 * Tx Timing Hook Example
 *
 * Records the start time at stage 1 and logs the elapsed duration at stage 7.
 * Demonstrates: stage filtering, per-call state on `Context`, safe error swallowing.
 */

import {
  AbstractHook,
  PreToolExecutionParams,
  PostSecondaryActionParams,
} from '@hashgraph/hedera-agent-kit';

type TimingState = {
  starts: Map<string, number>;
};

/**
 * Pull (or initialise) the per-session state bag on `Context`.
 * `Context` is a structurally typed object, so we cast to attach state.
 */
const getState = (context: any): TimingState => {
  return (context.__txTimingState ??= { starts: new Map<string, number>() });
};

/**
 * Build a unique key per call. The `method` alone isn't enough because the same
 * tool can be called several times within one agent run; we tag the entry with
 * a counter scoped to the method.
 */
const callKey = (state: TimingState, method: string): string => {
  const seq = (state.starts.size + 1).toString(36);
  return `${method}#${seq}`;
};

export class TxTimingHook extends AbstractHook {
  name = 'Transaction Timing Hook';
  description = 'Logs how long each relevant tool call takes (stage 1 → stage 7).';
  relevantTools: string[];

  constructor(relevantTools: string[]) {
    super();
    this.relevantTools = relevantTools;
  }

  async preToolExecutionHook(params: PreToolExecutionParams, method: string) {
    if (!this.relevantTools.includes(method)) return;

    try {
      const state = getState(params.context);
      const key = callKey(state, method);
      state.starts.set(key, Date.now());
      // Stash the key on rawParams so postToolExecutionHook can find it.
      // (rawParams is `any` at the hook level — safe to attach metadata.)
      (params.rawParams as any).__timingKey = key;
    } catch (err) {
      console.error('[tx-timing-hook] preTool failed:', err);
    }
  }

  async postToolExecutionHook(params: PostSecondaryActionParams, method: string) {
    if (!this.relevantTools.includes(method)) return;

    try {
      const state = getState(params.context);
      const key = (params.rawParams as any).__timingKey as string | undefined;
      if (!key) return;

      const start = state.starts.get(key);
      state.starts.delete(key);
      if (start === undefined) return;

      const elapsedMs = Date.now() - start;
      console.log(`[tx-timing-hook] ${method} took ${elapsedMs}ms`);
    } catch (err) {
      console.error('[tx-timing-hook] postTool failed:', err);
    }
  }
}

export default TxTimingHook;
