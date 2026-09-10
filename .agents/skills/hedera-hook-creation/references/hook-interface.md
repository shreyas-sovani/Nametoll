# `AbstractHook` Interface Reference

Complete reference for `AbstractHook` — the base class for non-blocking lifecycle extensions.

## Class signature

```typescript
import { AbstractHook } from '@hashgraph/hedera-agent-kit';

export abstract class AbstractHook {
  abstract name: string;
  abstract description?: string;
  abstract relevantTools: string[];

  preToolExecutionHook(params: PreToolExecutionParams, method: string): Promise<any>;
  postParamsNormalizationHook(params: PostParamsNormalizationParams, method: string): Promise<any>;
  postCoreActionHook(params: PostCoreActionParams, method: string): Promise<any>;
  postToolExecutionHook(params: PostSecondaryActionParams, method: string): Promise<any>;
}
```

| Field/method | Required | Notes |
|---|---|---|
| `name` | Yes | Human-readable identifier; appears in logs/error messages |
| `description` | Yes (typed optional but enforced abstract) | One-line summary of what the hook does and any side effects |
| `relevantTools` | Yes | Tool methods this hook applies to. The kit does **not** filter — your hook is invoked for every tool call. Always check `this.relevantTools.includes(method)` at the top of each method |
| Hook methods | Override only what you need | Default implementations are no-ops |

## Hook method signatures

The signature is uniform — `(params, method)` — but `params` is one of four typed interfaces, picked per stage:

### Stage 1 — `preToolExecutionHook(params, method)`

Fires before any work. Use for: early validation logging, "tool is starting" notifications, capturing the start timestamp.

```typescript
interface PreToolExecutionParams<TParams = any> {
  context: Context;
  rawParams: TParams;
  client: Client;
}
```

### Stage 3 — `postParamsNormalizationHook(params, method)`

Fires after `normalizeParams` runs. Use for: parameter-derived logging, telemetry on resolved defaults, enriching the params for downstream hooks.

```typescript
interface PostParamsNormalizationParams<TParams = any, TNormalisedParams = any> {
  context: Context;
  rawParams: TParams;
  normalisedParams: TNormalisedParams;
  client: Client;
}
```

### Stage 5 — `postCoreActionHook(params, method)`

Fires after `coreAction` returns the built transaction (or query result), before `secondaryAction` signs/submits. Use for: inspecting the transaction that's about to be signed, logging the transaction shape.

```typescript
interface PostCoreActionParams<TParams = any, TNormalisedParams = any> {
  context: Context;
  rawParams: TParams;
  normalisedParams: TNormalisedParams;
  coreActionResult: any;   // the value returned by coreAction (typically a Transaction)
  client: Client;
}
```

### Stage 7 — `postToolExecutionHook(params, method)`

Fires after the tool returns. Use for: audit trails, final metrics, end-of-call logging. This is where `HcsAuditTrailHook` writes its message.

```typescript
interface PostSecondaryActionParams<TParams = any, TNormalisedParams = any> {
  context: Context;
  rawParams: TParams;
  normalisedParams: TNormalisedParams;
  coreActionResult: any;
  toolResult: any;         // the value returned by secondaryAction (the final tool output)
  client: Client;
}
```

## `Context` shape (recap)

```typescript
type Context = {
  accountId?: string;
  accountPublicKey?: string;
  mode?: AgentMode;                            // AgentMode.AUTONOMOUS | AgentMode.RETURN_BYTES
  mirrornodeService?: IHederaMirrornodeService;
  hooks?: AbstractHook[];                      // hooks AND policies live here
};
```

`Context` is the same instance across all hook calls within a single agent run, so it's a safe per-session scratchpad. Cast to attach state:

```typescript
const state = ((params.context as any).myHookState ??= { calls: 0 });
state.calls += 1;
```

## Throwing from a hook

If a hook throws, the tool call aborts and the error propagates back to the caller (the LLM agent). This is the mechanism `AbstractPolicy` uses to block execution. For an observation-only hook, **catch internally**:

```typescript
async postToolExecutionHook(params: PostSecondaryActionParams, method: string) {
  if (!this.relevantTools.includes(method)) return;
  try {
    await writeAuditEntry(params);
  } catch (err) {
    console.error('[my-hook] failed to write audit entry:', err);
    // swallow — don't break the tool call
  }
}
```

## Built-in hooks (for reference)

| Hook | Subpath | Constructor |
|---|---|---|
| `HcsAuditTrailHook` | `@hashgraph/hedera-agent-kit/hooks` | `(relevantTools: string[], hcsTopicId: string, loggingClient?: Client)` |
| `HolAuditTrailHook` | `@hashgraph/hedera-agent-kit/hooks` | `({ relevantTools, sessionId })` |

Both fire only in `AgentMode.AUTONOMOUS` and require a pre-existing HCS topic with appropriate submit permissions.
