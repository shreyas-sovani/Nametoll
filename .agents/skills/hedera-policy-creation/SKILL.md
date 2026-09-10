---
name: Hedera Policy Creation
description: This skill should be used when the user asks to "create a hedera policy", "block a tool", "limit recipients", "extend AbstractPolicy", "reject a tool", "enforce a threshold", "rate limit a tool", "block transfers over X", "allowlist tools", or needs guidance on writing blocking validation rules for Hedera Agent Kit tools. Policies block tool execution by throwing — for non-blocking observation use the hook skill instead.
version: 1.0.0
---

# Creating Hedera Agent Kit Policies

Policies are blocking validation rules layered on the `BaseTool` lifecycle. A policy checks the call at one or more stages and **throws** to abort execution — the error propagates back to the LLM agent. Use them to enforce thresholds, allowlists/blocklists, rate limits, business hours, compliance rules, etc.

> Policies fire **only** for tools that extend `BaseTool`. A tool that implements the `Tool` interface directly without extending `BaseTool` bypasses policies entirely.

## Policy vs. hook

| Goal | Use |
|---|---|
| Stop a call when a condition holds | **Policy** (this skill) |
| Reject specific tool methods | **Policy** |
| Threshold / rate-limit / allowlist / blocklist | **Policy** |
| Log, audit, enrich context | **Hook** (see `agent-kit-hook` skill) |

`AbstractPolicy` extends `AbstractHook`, so policies live in the same `Context.hooks` array and run through the same lifecycle.

Built-in policies live in `@hashgraph/hedera-agent-kit/policies`:
- `RejectToolPolicy(relevantTools: string[])` — blocks the listed tool methods unconditionally
- `MaxRecipientsPolicy(maxRecipients, additionalTools?, customStrategies?)` — caps recipient count for transfer/airdrop tools

## How blocking actually works

You **never** override `preToolExecutionHook` or any of the other `*Hook` methods on a policy — those are wired up by the base class to call your `shouldBlock...` method and throw if it returns `true`.

Override one or more of these instead:

```typescript
abstract class AbstractPolicy extends AbstractHook {
  abstract name: string;
  abstract description?: string;
  abstract relevantTools: string[];

  protected shouldBlockPreToolExecution(params, method): boolean | Promise<boolean>;
  protected shouldBlockPostParamsNormalization(params, method): boolean | Promise<boolean>;
  protected shouldBlockPostCoreAction(params, method): boolean | Promise<boolean>;
  protected shouldBlockPostSecondaryAction(params, method): boolean | Promise<boolean>;
}
```

Defaults all return `false` (allow). Returning `true` causes the base class to throw a generic block error. Throwing your own error from `shouldBlock...` lets you control the message.

> **Don't override `preToolExecutionHook` etc.** — those are `@internal` on `AbstractPolicy`. They drive the block flow. If you override them, your policy will never block.

## Picking the stage

| Stage | What's available | Good for |
|---|---|---|
| `shouldBlockPreToolExecution` | `rawParams` only | allowlist/blocklist by tool method, time-based, rate limits |
| `shouldBlockPostParamsNormalization` | `+ normalisedParams` | thresholds on resolved values, recipient counts |
| `shouldBlockPostCoreAction` | `+ coreActionResult` | inspect the built `Transaction` before submission |
| `shouldBlockPostSecondaryAction` | `+ toolResult` | very rare — call already executed; usually too late to "block" |

Most policies live at stage 1 (cheapest) or stage 3 (after defaults are filled in).

## Skeleton

```typescript
import {
  AbstractPolicy,
  PreToolExecutionParams,
  PostParamsNormalizationParams,
} from '@hashgraph/hedera-agent-kit';

export class MyPolicy extends AbstractPolicy {
  name = 'My Policy';
  description = 'What this policy blocks, in one sentence';
  relevantTools = ['transfer_hbar', 'transfer_fungible_token'];

  // Stage 1 — block by raw input or method
  protected shouldBlockPreToolExecution(
    params: PreToolExecutionParams,
    method: string,
  ): boolean {
    if (!this.relevantTools.includes(method)) return false;
    // throw new Error('<custom message>') for tailored errors
    return /* condition */ false;
  }

  // Stage 3 — block on resolved/normalised values
  protected shouldBlockPostParamsNormalization(
    params: PostParamsNormalizationParams,
    method: string,
  ): boolean {
    if (!this.relevantTools.includes(method)) return false;
    return /* condition */ false;
  }
}
```

`relevantTools` is informational unless you check it — the kit dispatches your policy for every tool call. Always filter by `method` first thing in the method.

## Registering policies

Policies are `AbstractHook` instances. They go in the same `Context.hooks` array as observation hooks:

```typescript
import { AgentMode } from '@hashgraph/hedera-agent-kit';
import { allCorePlugins } from '@hashgraph/hedera-agent-kit/plugins';
import { RejectToolPolicy, MaxRecipientsPolicy } from '@hashgraph/hedera-agent-kit/policies';
import { HederaLangchainToolkit } from '@hashgraph/hedera-agent-kit-langchain';
import { MyPolicy } from './my-policy';

const toolkit = new HederaLangchainToolkit({
  client,
  configuration: {
    plugins: allCorePlugins,
    context: {
      mode: AgentMode.AUTONOMOUS,
      hooks: [
        new RejectToolPolicy(['delete_account', 'freeze_token']),
        new MaxRecipientsPolicy(5),
        new MyPolicy(),
      ],
    },
  },
});
```

Policies run in array order at each stage — the first one to return `true` (or throw) wins.

## Common patterns

### Threshold

```typescript
protected shouldBlockPostParamsNormalization(
  params: PostParamsNormalizationParams,
  method: string,
): boolean {
  if (!this.relevantTools.includes(method)) return false;
  const p = params.normalisedParams as { amount?: number };
  return (p.amount ?? 0) > this.maxAmount;
}
```

### Allowlist / Blocklist

```typescript
protected shouldBlockPreToolExecution(
  params: PreToolExecutionParams,
  method: string,
): boolean {
  if (!this.relevantTools.includes(method)) return false;
  const accountId = (params.rawParams as { accountId?: string }).accountId;
  return accountId !== undefined && this.blockedAccounts.has(accountId);
}
```

### Time-based

```typescript
protected shouldBlockPreToolExecution(
  _params: PreToolExecutionParams,
  method: string,
): boolean {
  if (!this.relevantTools.includes(method)) return false;
  const hour = new Date().getUTCHours();
  return hour < 9 || hour > 17;  // outside business hours
}
```

### Rate limiting (uses `Context` as scratchpad)

```typescript
protected shouldBlockPreToolExecution(
  params: PreToolExecutionParams,
  method: string,
): boolean {
  if (!this.relevantTools.includes(method)) return false;
  const counters = ((params.context as any).__rateCounts ??= {} as Record<string, number>);
  counters[method] = (counters[method] ?? 0) + 1;
  return counters[method] > this.maxCallsPerSession;
}
```

### Strategy map (pluggable for custom tools)

When a single policy needs to support tools the kit doesn't know about, accept a `Record<string, (params) => SomeMetric>` and validate that every tool added via `additionalTools` has a strategy. This is the pattern of `MaxRecipientsPolicy`:

```typescript
constructor(
  private maxRecipients: number,
  additionalTools: string[] = [],
  private customStrategies: Record<string, (p: any) => number> = {},
) {
  super();
  this.relevantTools = [...DEFAULT_TOOLS, ...additionalTools];
  for (const tool of additionalTools) {
    if (!this.customStrategies[tool]) {
      throw new Error(`Custom tool "${tool}" requires a strategy function`);
    }
  }
}
```

## Custom error messages

The default block error is generic. To control the message, **throw** from your `shouldBlock...` method instead of returning `true`:

```typescript
protected shouldBlockPostParamsNormalization(
  params: PostParamsNormalizationParams,
  method: string,
): boolean {
  if (!this.relevantTools.includes(method)) return false;
  const p = params.normalisedParams as { amount?: number };
  if ((p.amount ?? 0) > this.maxAmount) {
    throw new Error(
      `[max-amount-policy] Refusing ${method}: amount ${p.amount} exceeds limit ${this.maxAmount}`,
    );
  }
  return false;
}
```

The agent receives the thrown message verbatim — make it informative.

## Best practices

1. **Filter by `relevantTools`** at the top of every `shouldBlock...` method
2. **Pick the earliest stage** that has the data you need — stage 1 is cheapest
3. **Throw with a clear message** when blocking; the LLM sees this
4. **Don't override `*Hook` methods** — only `shouldBlock...`
5. **Don't do I/O on the hot path** unless you must — policies run synchronously in the lifecycle
6. **Document `relevantTools` defaults** so consumers understand what your policy guards
7. **Tag the error message** with `[<policy-name>]` for easy log correlation

## Resources

- **`references/policy-interface.md`** — full `AbstractPolicy` contract, when each `shouldBlock` fires
- **`examples/max-amount-policy/`** — threshold policy that blocks transfers above a cap

## Common imports

```typescript
import {
  AbstractPolicy,
  Context,
  PreToolExecutionParams,
  PostParamsNormalizationParams,
  PostCoreActionParams,
  PostSecondaryActionParams,
} from '@hashgraph/hedera-agent-kit';

// Built-in implementations live in the /policies subpath
import { RejectToolPolicy, MaxRecipientsPolicy } from '@hashgraph/hedera-agent-kit/policies';
```
