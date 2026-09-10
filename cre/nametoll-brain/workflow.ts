import { cre, decodeJson, type HTTPPayload, type TeeRuntime } from '@chainlink/cre-sdk'
import { z } from 'zod'
import { decideSpend } from './verdict'

export const configSchema = z.object({
  secretId: z.string(),
})
type Config = z.infer<typeof configSchema>

function requestedTinybarsFrom(payload: HTTPPayload): string {
  if (!payload.input || payload.input.length === 0) return ''
  const parsed = decodeJson(payload.input) as { requestedTinybars?: unknown }
  return typeof parsed.requestedTinybars === 'string' ? parsed.requestedTinybars : ''
}

/**
 * Verdict-only TEE handler. Merchandise HTTP stays on the desk.
 * Do not call ConfidentialHTTPClient from a TeeRuntime.
 * Do not pass the spend cap through usingTheDons().
 */
export const onHttpTrigger = (runtime: TeeRuntime<Config>, payload: HTTPPayload): string => {
  const cap = runtime.getSecret({ id: runtime.config.secretId }).result().value
  const verdict = decideSpend(requestedTinybarsFrom(payload), cap)
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
