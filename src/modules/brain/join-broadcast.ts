import {
  encodeFunctionData,
  getAddress,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import type { JoinCall } from "../../types.ts";

/**
 * Official Automated Liquidation Protection Challenge (Sepolia).
 * Same address as `cre/nametoll-brain/challenge.ts`. Do not invent a contract.
 */
export const CHALLENGE_LENDING =
  "0x88574e7Cc0027afd04951daa09B64d4441931ba1" as const;
export const CHALLENGE_CHAIN_ID = 11155111;
export const CHALLENGE_CHAIN_NAME = "ethereum-testnet-sepolia";
export const CHALLENGE_JOIN_ABI = parseAbi(["function join()"]);

export function encodeJoinCalldata(): Hex {
  return encodeFunctionData({
    abi: CHALLENGE_JOIN_ABI,
    functionName: "join",
  });
}

export function unsignedJoinCall(): JoinCall {
  return {
    action: "join",
    to: CHALLENGE_LENDING,
    data: encodeJoinCalldata(),
    chainId: CHALLENGE_CHAIN_ID,
    chain: CHALLENGE_CHAIN_NAME,
  };
}

/** View ABI from ChallengeLending.sol — join() still has no arguments. */
export const CHALLENGE_READ_ABI = parseAbi([
  "function challengeOpen() view returns (bool)",
  "function isUser(address user) view returns (bool)",
  "function numUsers() view returns (uint256)",
]);

export type JoinBroadcastResult = {
  txHash: Hex;
  from: Address;
  to: Address;
  chainId: number;
  explorerUrl: string;
};

export function sepoliaJoinExplorerUrl(txHash: Hex | string): string {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

export function assertJoinCall(call: JoinCall): JoinCall {
  if (call.action !== "join") {
    throw new Error("TEE result is not a join() call");
  }
  if (call.chainId !== CHALLENGE_CHAIN_ID) {
    throw new Error(`join() must be on Sepolia (${CHALLENGE_CHAIN_ID})`);
  }
  if (getAddress(call.to) !== getAddress(CHALLENGE_LENDING)) {
    throw new Error(
      `join() must target official ChallengeLending ${CHALLENGE_LENDING}`,
    );
  }
  if (call.data.toLowerCase() !== encodeJoinCalldata().toLowerCase()) {
    throw new Error("join() calldata must be the official join() selector");
  }
  return call;
}

export function assertCanJoin(preflight: {
  challengeOpen: boolean;
  alreadyJoined: boolean;
}): void {
  if (!preflight.challengeOpen) {
    throw new Error("Challenge is not open");
  }
  if (preflight.alreadyJoined) {
    throw new Error("Already joined");
  }
}

export async function broadcastUnsignedJoin(input: {
  call: JoinCall;
  from: Address;
  challengeOpen: () => Promise<boolean>;
  alreadyJoined: () => Promise<boolean>;
  send: (tx: { to: Address; data: Hex }) => Promise<Hex>;
}): Promise<JoinBroadcastResult> {
  const call = assertJoinCall(input.call);
  const challengeOpen = await input.challengeOpen();
  const alreadyJoined = await input.alreadyJoined();
  assertCanJoin({ challengeOpen, alreadyJoined });
  const to = getAddress(call.to);
  const txHash = await input.send({
    to,
    data: call.data as Hex,
  });
  return {
    txHash,
    from: getAddress(input.from),
    to,
    chainId: call.chainId,
    explorerUrl: sepoliaJoinExplorerUrl(txHash),
  };
}
