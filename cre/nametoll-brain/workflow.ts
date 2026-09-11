import { cre, decodeJson, type HTTPPayload, type TeeRuntime } from '@chainlink/cre-sdk'
import { z } from 'zod'
import { CHALLENGE_LENDING, unsignedJoinCall } from './challenge'
import { decidePolicy } from './verdict'

export const configSchema = z.object({
  secretId: z.string(),
  allowlistSecretId: z.string().optional(),
  rateLimitSecretId: z.string().optional(),
  challengeLending: z.string().optional(),
})
type Config = z.infer<typeof configSchema>

function parseHttpInput(payload: HTTPPayload): {
  requestedTinybars: string
  action: 'join' | 'spend'
  payer: string
  paysThisHour: string
} {
  if (!payload.input || payload.input.length === 0) {
    return { requestedTinybars: '', action: 'spend', payer: '', paysThisHour: '' }
  }
  const parsed = decodeJson(payload.input) as {
    requestedTinybars?: unknown
    action?: unknown
    payer?: unknown
    paysThisHour?: unknown
  }
  return {
    requestedTinybars: typeof parsed.requestedTinybars === 'string' ? parsed.requestedTinybars : '',
    action: parsed.action === 'join' ? 'join' : 'spend',
    payer: typeof parsed.payer === 'string' ? parsed.payer : '',
    paysThisHour: typeof parsed.paysThisHour === 'string' ? parsed.paysThisHour : '',
  }
}

function readSecret(runtime: TeeRuntime<Config>, id: string | undefined): string {
  if (!id) return ''
  try {
    return runtime.getSecret({ id }).result().value ?? ''
  } catch {
    return ''
  }
}

/**
 * Verdict-only TEE handler, plus unsigned join() calldata on the same engine.
 * Merchandise HTTP stays on the desk. join() is ChallengeLending.sol — not a CRE report consumer.
 * Do not call ConfidentialHTTPClient from a TeeRuntime.
 * Do not pass secrets through usingTheDons().
 */
export const onHttpTrigger = (runtime: TeeRuntime<Config>, payload: HTTPPayload): string => {
  const input = parseHttpInput(payload)
  // Join is still TEE-gated: the secret must load or the handler fails closed.
  const cap = runtime.getSecret({ id: runtime.config.secretId }).result().value
  if (input.action === 'join') {
    runtime.log('TEE handler: action=join')
    return JSON.stringify(unsignedJoinCall(runtime.config.challengeLending ?? CHALLENGE_LENDING))
  }
  const verdict = decidePolicy({
    requestedTinybars: input.requestedTinybars,
    spendCapTinybars: cap,
    payer: input.payer,
    allowlist: readSecret(runtime, runtime.config.allowlistSecretId ?? 'BUYER_ALLOWLIST'),
    paysThisHour: input.paysThisHour,
    rateLimit: readSecret(runtime, runtime.config.rateLimitSecretId ?? 'RATE_LIMIT'),
  })
  // Simulation only. Never log the secret.
  runtime.log(`TEE handler: verdict=${verdict.allow ? 'allow' : 'deny'} reason=${verdict.reason}`)
  return JSON.stringify(verdict)
}

export function initWorkflow(config: Config) {
  const http = new cre.capabilities.HTTPCapability()
  return [
    cre.handlerInTee(http.trigger({}), onHttpTrigger, [
      { tee: 'nitro', regions: ['us-west-2'] },
    ]),
  ]
}
