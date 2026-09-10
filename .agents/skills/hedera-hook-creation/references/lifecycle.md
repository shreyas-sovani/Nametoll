# Lifecycle Reference (Hook Perspective)

How hook methods interleave with `BaseTool`'s lifecycle stages.

## Full sequence

```text
                                                    HOOKS DISPATCHED
                                                    ───────────────
┌─[1] preToolExecutionHook ───────────────────────► hook.preToolExecutionHook(
│                                                     { context, rawParams, client },
│                                                     method,
│                                                   )
│
├─[2] BaseTool.normalizeParams(rawParams, ...)      (no hook)
│      └─ resolves defaults, validates input
│
├─[3] postParamsNormalizationHook ────────────────► hook.postParamsNormalizationHook(
│                                                     { context, rawParams, normalisedParams, client },
│                                                     method,
│                                                   )
│
├─[4] BaseTool.coreAction(normalisedParams, ...)    (no hook)
│      └─ builds the transaction OR runs the query
│
├─[5] postCoreActionHook ─────────────────────────► hook.postCoreActionHook(
│                                                     { ..., coreActionResult },
│                                                     method,
│                                                   )
│
├─[6] BaseTool.secondaryAction(...)                 (no hook)
│      └─ signs and submits the transaction
│      └─ skipped if shouldSecondaryAction() === false (query tools)
│
└─[7] postToolExecutionHook ──────────────────────► hook.postToolExecutionHook(
                                                      { ..., toolResult },
                                                      method,
                                                    )

           returns toolResult to caller
```

## What's available at each stage

| Field | Stage 1 | Stage 3 | Stage 5 | Stage 7 |
|---|:-:|:-:|:-:|:-:|
| `context` | ✓ | ✓ | ✓ | ✓ |
| `rawParams` | ✓ | ✓ | ✓ | ✓ |
| `client` | ✓ | ✓ | ✓ | ✓ |
| `normalisedParams` | — | ✓ | ✓ | ✓ |
| `coreActionResult` | — | — | ✓ | ✓ |
| `toolResult` | — | — | — | ✓ |

## Picking the right stage

| Goal | Stage |
|---|---|
| Reject by raw input shape (before normalisation) | 1 |
| Validate after defaults are resolved | 3 |
| Inspect/log the built transaction before submission | 5 |
| Log the final outcome / write audit trail | 7 |
| Time the whole call | 1 + 7 (record start, compute duration) |
| Per-call counter on `Context` | 1 |
| Side-effect that depends on success (HCS write) | 7 |

## Multiple hooks on `Context.hooks`

Hooks fire in array order at each stage. All Stage 1 hooks run before any Stage 2 work; all Stage 3 hooks run after stage 2 completes; and so on.

```text
Stage 1 → hookA.preToolExecutionHook
        → hookB.preToolExecutionHook
        → hookC.preToolExecutionHook
Stage 2 → BaseTool.normalizeParams
Stage 3 → hookA.postParamsNormalizationHook
        → hookB.postParamsNormalizationHook
        → hookC.postParamsNormalizationHook
...
```

If any hook throws, subsequent hooks at that stage are skipped and the tool call aborts.

## Query tools (no stage 6)

Query tools override `shouldSecondaryAction` to return `false`. In that case stage 6 is skipped, and `toolResult` at stage 7 is whatever `coreAction` returned (typically `coreActionResult === toolResult`).
