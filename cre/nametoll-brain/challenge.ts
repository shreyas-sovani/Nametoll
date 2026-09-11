import { encodeFunctionData, parseAbi } from 'viem'

/**
 * Official Automated Liquidation Protection Challenge (Sepolia).
 * Address from the live challenge README / frontend, which ETHOnline
 * prizes.txt links as the Challenge Repo. Do not invent a contract.
 * Live 11 Sep 2026: challengeOpen = true, numUsers = 5.
 * The ETHOnline scrape `0x59d5B29F…` is an older ChallengeLending; numUsers reverts.
 *
 * https://github.com/solangegueiros/cf-liquidation-protection-challenge
 * ABI: contracts/ChallengeLending.sol `function join() external`
 */
export const CHALLENGE_LENDING = '0x88574e7Cc0027afd04951daa09B64d4441931ba1' as const
export const CHALLENGE_CHAIN_ID = 11155111
export const CHALLENGE_CHAIN_NAME = 'ethereum-testnet-sepolia'

/** From ChallengeLending.sol — join has no arguments. */
export const CHALLENGE_JOIN_ABI = parseAbi(['function join()'])

export function encodeJoinCalldata(): `0x${string}` {
  return encodeFunctionData({
    abi: CHALLENGE_JOIN_ABI,
    functionName: 'join',
  })
}

export type JoinCall = {
  action: 'join'
  to: typeof CHALLENGE_LENDING | string
  data: `0x${string}`
  chainId: typeof CHALLENGE_CHAIN_ID
  chain: typeof CHALLENGE_CHAIN_NAME
}

export function unsignedJoinCall(to: string = CHALLENGE_LENDING): JoinCall {
  return {
    action: 'join',
    to,
    data: encodeJoinCalldata(),
    chainId: CHALLENGE_CHAIN_ID,
    chain: CHALLENGE_CHAIN_NAME,
  }
}
