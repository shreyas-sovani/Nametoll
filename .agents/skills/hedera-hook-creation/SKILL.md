---
name: Hedera Hook Creation
description: This skill should be used when the user asks to "create a hedera hook", "write an agent kit hook", "extend AbstractHook", "add a tool lifecycle hook", "log tool executions", "audit trail hook", "track tool calls", or needs guidance on building observation/logging/metrics extensions for Hedera Agent Kit tools. Hooks are non-blocking — for blocking validation rules use the policy skill instead.
version: 1.0.0
---

# Creating Hedera Agent Kit Hooks

Hooks are non-blocking extensions that run around the `BaseTool` lifecycle. They observe and can enrich execution: log calls, write audit trails, track metrics, persist state on `Context`. They **do not block** tool execution — that's the job of policies (see `agent-kit-policy` skill).

> Hooks fire **only** for tools that extend `BaseTool`. A tool that implements the `Tool` interface directly without extending `BaseTool` bypasses the hook system entirely.

## When to write a hook vs. a policy

| If you want to… | Use |
|---|---|
| Log/audit/track tool calls | **Hook** |
| Enrich `Context` (counters, session state) | **Hook** |
| Stop a call from happening when a condition holds | **Policy** (see `agent-kit-policy`) |
| Reject specific tool methods | **Policy** |

Built-in hooks include `HcsAuditTrailHook` and `HolAuditTrailHook` (HCS-backed audit trails) — both live in `@hashgraph/hedera-agent-kit/hooks`.

## The 7-stage lifecycle

`BaseTool.execute()` runs:

```text
[1] preToolExecutionHook        ← hook fires
[2] normalizeParams             (tool internal)
[3] postParamsNormalizationHook ← hook fires
[4] coreAction                  (tool internal)
[5] postCoreActionHook          ← hook fires
[6] secondaryAction             (tool internal)
[7] postToolExecutionHook       ← hook fires
```

Hooks tap into stages 1, 3, 5, 7. They never fire at stages 2, 4, 6.

For full param shapes at each stage see `references/lifecycle.md`.

## `AbstractHook` contract

```typescript
import { AbstractHook } from '@hashgraph/hedera-agent-kit';

export abstract class AbstractHook {
  abstract name: string;             // human-readable identifier
  abstract description?: string;     // what the hook does
  abstract relevantTools: string[];  // tool methods this hook cares about

  // Override only the stages you need; defaults are no-ops.
  preToolExecutionHook(params, method): Promise<any>;
  postParamsNormalizationHook(params, method): Promise<any>;
  postCoreActionHook(params, method): Promise<any>;
  postToolExecutionHook(params, method): Promise<any>;
}
```

**Critical:** the method signature is `(params, method)` — `params` is one of four typed objects, and `context` lives **inside** it (`params.context`). It is not a separate first argument.

| Stage | Params type | Notable fields |
|---|---|---|
| 1 | `PreToolExecutionParams` | `context`, `rawParams`, `client` |
| 3 | `PostParamsNormalizationParams` | `+ normalisedParams` |
| 5 | `PostCoreActionParams` | `+ coreActionResult` |
| 7 | `PostSecondaryActionParams` | `+ toolResult` |

## Skeleton

```typescript
import {
  AbstractHook,
  Context,
  PreToolExecutionParams,
  PostSecondaryActionParams,
} from '@hashgraph/hedera-agent-kit';

export class MyHook extends AbstractHook {
  name = 'My Hook';
  description = 'What this hook does, in one sentence';
  relevantTools = ['transfer_hbar', 'create_token'];

  async preToolExecutionHook(params: PreToolExecutionParams, method: string) {
    if (!this.relevantTools.includes(method)) return;
    // ... your pre-execution logic ...
    // params.context, params.rawParams, params.client
  }

  async postToolExecutionHook(params: PostSecondaryActionParams, method: string) {
    if (!this.relevantTools.includes(method)) return;
    // params.toolResult is the final tool output
  }
}
```

The first line of every hook method should filter by `relevantTools`. The kit dispatches **all** hooks for **all** tool calls — `relevantTools` is informational unless you act on it.

## Registering hooks

Hooks go on `Context.hooks`. The toolkit threads that context through to `BaseTool.execute()`, where the lifecycle dispatches them.

```typescript
import { AgentMode } from '@hashgraph/hedera-agent-kit';
import { allCorePlugins } from '@hashgraph/hedera-agent-kit/plugins';
import { HederaLangchainToolkit } from '@hashgraph/hedera-agent-kit-langchain';
import { MyHook } from './my-hook';

const toolkit = new HederaLangchainToolkit({
  client,
  configuration: {
    plugins: allCorePlugins,
    context: {
      mode: AgentMode.AUTONOMOUS,
      hooks: [new MyHook()],
    },
  },
});
```

Multiple hooks can coexist — they run in array order at each stage. Policies (see `agent-kit-policy`) are also `AbstractHook` instances and go in the same array.

## Multi-tool typing patterns

Hook params are generic (`any`) — the kit can't infer per-tool types because one hook can target many tools with different schemas. Three patterns:

### 1. Universal logic

When the hook is parameter-agnostic (counting calls, logging the whole payload as JSON):

```typescript
async postToolExecutionHook(params: PostSecondaryActionParams, method: string) {
  console.log(`[${method}]`, JSON.stringify(params.rawParams));
}
```

### 2. Type guards (small known set)

Switch on `method`, narrow with a cast or guard:

```typescript
async postParamsNormalizationHook(
  params: PostParamsNormalizationParams,
  method: string,
) {
  switch (method) {
    case 'transfer_hbar':
    case 'transfer_hbar_with_allowance': {
      const p = params.normalisedParams as { transfers: Array<{ amount: number }> };
      const total = p.transfers.reduce((s, t) => s + t.amount, 0);
      console.log(`[${method}] total HBAR: ${total}`);
      break;
    }
  }
}
```

### 3. Strategy map (pluggable, third-party tools)

Accept a `Record<string, (params: any) => SomeResult>` in the constructor. Validate each `additionalTool` has a strategy, throw at construction time if missing. This is the pattern used by `MaxRecipientsPolicy`.

## State on `Context`

`params.context` is the same `Context` instance for the whole agent run. Use it as a per-session scratchpad:

```typescript
async preToolExecutionHook(params: PreToolExecutionParams, method: string) {
  if (!this.relevantTools.includes(method)) return;
  const counts = ((params.context as any).callCounts ??= {} as Record<string, number>);
  counts[method] = (counts[method] ?? 0) + 1;
}
```

(`Context` is structurally typed; cast to attach ad-hoc state. If you publish the hook, document the keys you write.)

## Best practices

1. **Filter by `relevantTools`** at the top of every method — cheap and idiomatic
2. **Wrap in `try/catch`** if the hook does I/O (HCS write, HTTP) — a thrown hook aborts the whole tool call
3. **Keep hooks lightweight** — they sit on the hot path
4. **Don't block** — if you need to stop execution, write a policy
5. **Don't mutate `rawParams` or `normalisedParams`** unless you really mean to; subsequent hooks see your changes
6. **Use `description` to document side-effects** (HCS topic writes, external API calls) so policy authors / agent operators know what the hook does
7. **Tag log lines** with `[<hook-name>]` for easy grep

## Resources

- **`references/hook-interface.md`** — full param-type definitions, all four hook stages
- **`references/lifecycle.md`** — what fires when, around `BaseTool`'s `normalizeParams`/`coreAction`/`secondaryAction`
- **`examples/tx-timing-hook/`** — minimal hook that times tool execution and logs duration

## Common imports

```typescript
import {
  AbstractHook,
  Context,
  PreToolExecutionParams,
  PostParamsNormalizationParams,
  PostCoreActionParams,
  PostSecondaryActionParams,
} from '@hashgraph/hedera-agent-kit';

// Built-in implementations live in the /hooks subpath
import { HcsAuditTrailHook, HolAuditTrailHook } from '@hashgraph/hedera-agent-kit/hooks';
```
