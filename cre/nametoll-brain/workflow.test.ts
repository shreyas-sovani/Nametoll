import { describe, expect } from 'bun:test'
import type { TeeRuntime } from '@chainlink/cre-sdk'
import { test } from '@chainlink/cre-sdk/test'
import type { HTTPPayload } from '@chainlink/cre-sdk'
import { encodeFunctionData, parseAbi } from 'viem'
import { decidePolicy, decideSpend } from './verdict'
import { initWorkflow, onHttpTrigger } from './workflow'

const OFFICIAL_CHALLENGE_LENDING = '0x88574e7Cc0027afd04951daa09B64d4441931ba1'
const ETHONLINE_SCRAPE_CHALLENGE = '0x59d5B29FbA5ca865a171076BE94EbEeC5BCA1E04'
const JOIN_DATA = encodeFunctionData({
  abi: parseAbi(['function join()']),
  functionName: 'join',
})

const CAP = '150000'

function httpPayload(requestedTinybars: string, extra: Record<string, unknown> = {}): HTTPPayload {
  return {
    input: new TextEncoder().encode(JSON.stringify({ requestedTinybars, ...extra })),
  } as HTTPPayload
}

const makeFakeTeeRuntime = (
  cap = CAP,
  extras: { allowlist?: string; rateLimit?: string } = {},
) => {
  const logs: string[] = []
  const secrets: Record<string, string> = {
    SPEND_CAP: cap,
    BUYER_ALLOWLIST: extras.allowlist ?? '',
    RATE_LIMIT: extras.rateLimit ?? '',
  }
  const runtime = {
    config: {
      secretId: 'SPEND_CAP',
      allowlistSecretId: 'BUYER_ALLOWLIST',
      rateLimitSecretId: 'RATE_LIMIT',
    },
    getSecret: (request: { id?: string }) => ({
      result: () => ({ id: request.id, value: request.id ? (secrets[request.id] ?? '') : '' }),
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

describe('decidePolicy', () => {
  test('returns distinct public reasons for allowlist, rate, and cap', () => {
    expect(
      decidePolicy({
        requestedTinybars: '100000',
        spendCapTinybars: CAP,
        payer: '0.0.9',
        allowlist: '0.0.1',
      }).reason,
    ).toBe('buyer not allowlisted')
    expect(
      decidePolicy({
        requestedTinybars: '100000',
        spendCapTinybars: CAP,
        paysThisHour: '8',
        rateLimit: '8',
      }).reason,
    ).toBe('rate limited')
    expect(
      decidePolicy({
        requestedTinybars: '200000',
        spendCapTinybars: CAP,
      }).reason,
    ).toBe('over cap')
  })
})

describe('onHttpTrigger policy', () => {
  test('denies an unknown payer from the allowlist secret', () => {
    const { runtime } = makeFakeTeeRuntime(CAP, { allowlist: '0.0.1' })
    const body = JSON.parse(onHttpTrigger(runtime, httpPayload('100000', { payer: '0.0.9' })))
    expect(body.allow).toBe(false)
    expect(body.reason).toBe('buyer not allowlisted')
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

describe('join on the same CRE engine', () => {
  test('emits unsigned join() calldata for the live official ChallengeLending', () => {
    const { runtime } = makeFakeTeeRuntime()
    const body = JSON.parse(onHttpTrigger(runtime, httpPayload('100000', { action: 'join' })))
    expect(body.to).toBe(OFFICIAL_CHALLENGE_LENDING)
    expect(body.to).not.toBe(ETHONLINE_SCRAPE_CHALLENGE)
    expect(body.data).toBe(JOIN_DATA)
    expect(body.chainId).toBe(11155111)
    expect(body.action).toBe('join')
  })

  test('still fetches the TEE secret and does not log it on join', () => {
    const { runtime, logs } = makeFakeTeeRuntime('super-secret-cap')
    const body = JSON.parse(onHttpTrigger(runtime, httpPayload('', { action: 'join' })))
    expect(body.data).toBe(JOIN_DATA)
    for (const line of logs) {
      expect(line).not.toContain('super-secret-cap')
    }
  })

  test('spend payloads still return a verdict, not join calldata', () => {
    const { runtime } = makeFakeTeeRuntime()
    const body = JSON.parse(onHttpTrigger(runtime, httpPayload('100000')))
    expect(body.allow).toBe(true)
    expect(body.to).toBeUndefined()
  })
})
