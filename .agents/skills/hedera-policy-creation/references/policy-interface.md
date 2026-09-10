# `AbstractPolicy` Interface Reference

Complete reference for `AbstractPolicy` — the base class for blocking validation rules.

## Class signature

```typescript
import { AbstractPolicy } from '@hashgraph/hedera-agent-kit';

export abstract class AbstractPolicy extends AbstractHook {
  abstract name: string;
  abstract description?: string;
  abstract relevantTools: string[];

  // Override one or more — return true to BLOCK, false to ALLOW
  protected shouldBlockPreToolExecution(params, method): boolean | Promise<boolean>;
  protected shouldBlockPostParamsNormalization(params, method): boolean | Promise<boolean>;
  protected shouldBlockPostCoreAction(params, method): boolean | Promise<boolean>;
  protected shouldBlockPostSecondaryAction(params, method): boolean | Promise<boolean>;

  // @internal — DO NOT OVERRIDE; the base class wires these to the shouldBlock methods
  preToolExecutionHook(params, method): Promise<void>;
  postParamsNormalizationHook(params, method): Promise<void>;
  postCoreActionHook(params, method): Promise<void>;
  postToolExecutionHook(params, method): Promise<void>;
}
```

## What the base class does for you

For each lifecycle stage, `AbstractPolicy`'s internal hook implementation:

1. Calls your `shouldBlock<Stage>(...)` (or the default, which returns `false`)
2. If the return value is `true`, throws a generic block error
3. If your method itself throws, that error propagates instead

This is why **you must not override the `*Hook` methods on a policy subclass** — doing so disables the block-and-throw machinery.

## `shouldBlock...` method signatures

| Method | Stage | Params type | Notes |
|---|:-:|---|---|
| `shouldBlockPreToolExecution` | 1 | `PreToolExecutionParams` | `rawParams` only — cheapest |
| `shouldBlockPostParamsNormalization` | 3 | `PostParamsNormalizationParams` | `normalisedParams` available |
| `shouldBlockPostCoreAction` | 5 | `PostCoreActionParams` | `coreActionResult` (built `Transaction`) available |
| `shouldBlockPostSecondaryAction` | 7 | `PostSecondaryActionParams` | `toolResult` available — call already executed; rarely a useful place to "block" |

All four can be `boolean` or `Promise<boolean>`. Mark them `protected` (the base class typing requires it) and **always** filter by `relevantTools` first:

```typescript
protected shouldBlockPreToolExecution(
  params: PreToolExecutionParams,
  method: string,
): boolean {
  if (!this.relevantTools.includes(method)) return false;
  // ... your logic ...
}
```

## Param types

Identical to `AbstractHook` (see `agent-kit-hook` skill, `references/hook-interface.md`):

```typescript
interface PreToolExecutionParams<TParams = any> {
  context: Context;
  rawParams: TParams;
  client: Client;
}
interface PostParamsNormalizationParams<TParams = any, TNormalisedParams = any> {
  context: Context;
  rawParams: TParams;
  normalisedParams: TNormalisedParams;
  client: Client;
}
interface PostCoreActionParams<TParams = any, TNormalisedParams = any>
  extends PostParamsNormalizationParams<TParams, TNormalisedParams> {
  coreActionResult: any;
}
interface PostSecondaryActionParams<TParams = any, TNormalisedParams = any>
  extends PostCoreActionParams<TParams, TNormalisedParams> {
  toolResult: any;
}
```

## Returning `true` vs. throwing

| Approach | Resulting error message |
|---|---|
| `return true` | Generic message from `AbstractPolicy` (typically mentions the policy `name`) |
| `throw new Error('...')` | Your message, verbatim |

For user-facing policies (the LLM sees the error), prefer `throw`. The agent often surfaces the message in its reply, so make it actionable: include the limit, the offending value, and the tool method.

## Built-in policies (for reference)

| Policy | Subpath | Constructor |
|---|---|---|
| `RejectToolPolicy` | `@hashgraph/hedera-agent-kit/policies` | `(relevantTools: string[])` — blocks listed methods at stage 1 |
| `MaxRecipientsPolicy` | `@hashgraph/hedera-agent-kit/policies` | `(max: number, additionalTools?, strategies?)` — blocks at stage 3 by counting recipients |

`MaxRecipientsPolicy` ships with built-in counting strategies for: `transfer_hbar`, `transfer_hbar_with_allowance`, `airdrop_fungible_token`, `transfer_fungible_token_with_allowance`, `transfer_non_fungible_token`, `transfer_non_fungible_token_with_allowance`. Custom tools added via `additionalTools` **must** have a strategy in `customStrategies` — otherwise the constructor throws.

## Composing policies

Multiple policies can be combined; they all live on `Context.hooks` and run in array order at each stage. The first one whose `shouldBlock...` returns `true` (or throws) aborts the call.

```typescript
context: {
  mode: AgentMode.AUTONOMOUS,
  hooks: [
    new RejectToolPolicy(['delete_account', 'freeze_token']),  // stage 1
    new MaxAmountPolicy(1000),                                  // stage 3, custom
    new MaxRecipientsPolicy(5),                                 // stage 3, built-in
  ],
}
```

Policies that block at the same stage run sequentially — there is no parallel evaluation.
