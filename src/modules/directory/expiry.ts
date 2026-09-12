import { createPublicClient, http, type PublicClient } from "viem";
import { sepolia } from "viem/chains";
import {
  V2Status,
  YEAR_SECONDS,
  v2LabelId,
  v2RegistryAbi,
} from "./ensv2-sepolia.ts";
import { parentUserRegistry } from "./registry-children.ts";

export const MIN_EXPIRES_IN = 60n;
export const MAX_EXPIRES_IN = YEAR_SECONDS;

export type RegistrationState = {
  status: number;
  expiry: bigint;
};

export function nowUnixSeconds(nowMs = Date.now()): bigint {
  return BigInt(Math.floor(nowMs / 1000));
}

export function parseExpiresIn(input: unknown, _now = nowUnixSeconds()): bigint {
  if (input == null || input === "") {
    return MAX_EXPIRES_IN;
  }
  const raw = typeof input === "number" ? input : Number(String(input).trim());
  if (!Number.isFinite(raw) || !Number.isInteger(raw)) {
    throw new Error("Expiry must be a whole number of seconds from now.");
  }
  const duration = BigInt(raw);
  if (duration < MIN_EXPIRES_IN || duration > MAX_EXPIRES_IN) {
    throw new Error(
      `Expiry must be between ${MIN_EXPIRES_IN} and ${MAX_EXPIRES_IN} seconds from now.`,
    );
  }
  return duration;
}

export function isLiveRegistration(
  state: RegistrationState,
  now: bigint = nowUnixSeconds(),
): boolean {
  return state.status === V2Status.REGISTERED && state.expiry > now;
}

function childLabelOf(name: string): { parent: string; label: string } | undefined {
  const trimmed = name.trim();
  const labels = trimmed.split(".");
  if (labels.length < 3 || labels[labels.length - 1] !== "eth") {
    return undefined;
  }
  const label = labels[0];
  const parent = labels.slice(1).join(".");
  if (!label || !parent) return undefined;
  return { parent, label };
}

export async function ensv2ChildIsLive(
  name: string,
  client?: PublicClient,
): Promise<boolean> {
  const parts = childLabelOf(name);
  if (!parts) return true;
  const publicClient =
    client ??
    createPublicClient({
      chain: sepolia,
      transport: http(
        process.env.ETH_RPC_URL?.trim() || "https://ethereum-sepolia-rpc.publicnode.com",
      ),
    });
  try {
    const registry = await parentUserRegistry(parts.parent, {
      getBlockNumber: () => publicClient.getBlockNumber(),
      getSubregistry: (address, label) =>
        publicClient.readContract({
          address,
          abi: v2RegistryAbi,
          functionName: "getSubregistry",
          args: [label],
        }),
      getLabelRegistered: async () => [],
    });
    const state = await publicClient.readContract({
      address: registry,
      abi: v2RegistryAbi,
      functionName: "getState",
      args: [v2LabelId(parts.label)],
    });
    return isLiveRegistration(
      { status: Number(state.status), expiry: BigInt(state.expiry) },
      nowUnixSeconds(),
    );
  } catch {
    return true;
  }
}
