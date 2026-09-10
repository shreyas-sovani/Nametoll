import { describe, expect } from 'bun:test'
import type { TeeRuntime } from '@chainlink/cre-sdk'
import { test } from '@chainlink/cre-sdk/test'
import type { HTTPPayload } from '@chainlink/cre-sdk'
import { decideSpend } from './verdict'
import { initWorkflow, onHttpTrigger } from './workflow'

const CAP = '150000'

function httpPayload(requestedTinybars: string): HTTPPayload {
  return {
    input: new TextEncoder().encode(JSON.stringify({ requestedTinybars })),
  } as HTTPPayload
}

const makeFakeTeeRuntime = (cap = CAP) => {
  const logs: string[] = []
  const runtime = {
    config: { secretId: 'SPEND_CAP' },
    getSecret: (request: { id?: string }) => ({
      result: () => ({ id: request.id, value: cap }),
    }),
    log: (message: string) => logs.push(message),
  }
  return { runtime: runtime as unknown as TeeRuntime<{ secretId: string }>, logs }
}

describe('decideSpend', () => {
  test('allows at or under the secret cap', () => {
    expect(decideSpend('100000', CAP)).toEqual({
      allow: true,
      maxTinybars: CAP,
      reason: 'under cap',
    })
  })

  test('denies over the secret cap', () => {
    expect(decideSpend('200000', CAP)).toEqual({
      allow: false,
      maxTinybars: CAP,
      reason: 'over cap',
    })
  })
})

describe('onHttpTrigger', () => {
  test('secret spend cap changes the verdict', () => {
    const { runtime } = makeFakeTeeRuntime()
    const allow = JSON.parse(onHttpTrigger(runtime, httpPayload('100000')))
    const deny = JSON.parse(onHttpTrigger(runtime, httpPayload('200000')))
    expect(allow.allow).toBe(true)
    expect(deny.allow).toBe(false)
  })

  test('does not log the secret', () => {
    const { runtime, logs } = makeFakeTeeRuntime('super-secret-cap')
    onHttpTrigger(runtime, httpPayload('1'))
    for (const line of logs) {
      expect(line).not.toContain('super-secret-cap')
    }
    expect(logs.some((line) => line.includes('TEE handler'))).toBe(true)
  })
})

describe('initWorkflow', () => {
  test('registers an HTTP TEE handler, not a normal handler', () => {
    const handlers = initWorkflow({ secretId: 'SPEND_CAP' })
    expect(handlers).toHaveLength(1)
    expect(handlers[0].fn).toBe(onHttpTrigger)
    expect(handlers[0].requirements).toBeDefined()
  })
})
