import { createPublicClient, http, parseAbiItem, type PublicClient } from "viem";
import { sepolia } from "viem/chains";
import { ENSV2_SEPOLIA, v2RegistryAbi, zeroAddress } from "./ensv2-sepolia.ts";

/**
 * Official ENSv2 registry event from https://docs.ens.domains/ensv2/indexing/
 * (`IRegistryEvents.LabelRegistered`). The label string is on the log.
 */
export const LABEL_REGISTERED_EVENT = parseAbiItem(
  "event LabelRegistered(uint256 indexed tokenId, bytes32 indexed labelHash, string label, address owner, uint64 expiry, address indexed sender)",
);

/** publicnode serves recent logs; 3×8k blocks is about three days. */
export const LOG_WINDOW = 8_000n;
export const MAX_LOG_WINDOWS = 3;

export type RegistryChildrenClients = {
  getBlockNumber: () => Promise<bigint>;
  getSubregistry: (registry: `0x${string}`, label: string) => Promise<`0x${string}`>;
  getLabelRegistered: (
    registry: `0x${string}`,
    fromBlock: bigint,
    toBlock: bigint,
  ) => Promise<string[]>;
};

function defaultClients(rpcUrl?: string): RegistryChildrenClients {
  const client: PublicClient = createPublicClient({
    chain: sepolia,
    transport: http(
      rpcUrl ?? process.env.ETH_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
    ),
  });
  return {
    getBlockNumber: () => client.getBlockNumber(),
    getSubregistry: (registry, label) =>
      client.readContract({
        address: registry,
        abi: v2RegistryAbi,
        functionName: "getSubregistry",
        args: [label],
      }),
    async getLabelRegistered(registry, fromBlock, toBlock) {
      const rows = await client.getLogs({
        address: registry,
        event: LABEL_REGISTERED_EVENT,
        fromBlock,
        toBlock,
      });
      const now = BigInt(Math.floor(Date.now() / 1000));
      return rows
        .filter((row) => {
          const expiry = row.args.expiry;
          return expiry == null || expiry > now;
        })
        .map((row) => row.args.label)
        .filter((label): label is string => Boolean(label));
    },
  };
}

export async function parentUserRegistry(
  parent: string,
  clients: RegistryChildrenClients,
): Promise<`0x${string}`> {
  const labels = parent.trim().split(".");
  if (labels.length < 2 || labels[labels.length - 1] !== "eth" || labels.some((label) => !label)) {
    throw new Error(`Expected a .eth name, got ${parent}`);
  }
  let registry: `0x${string}` = ENSV2_SEPOLIA.registry;
  for (const label of labels.slice(0, -1).reverse()) {
    registry = await clients.getSubregistry(registry, label);
    if (registry === zeroAddress) {
      throw new Error(`No UserRegistry under ${parent.trim()}`);
    }
  }
  return registry;
}

export async function listChildNamesFromRegistry(
  parent: string,
  clients: RegistryChildrenClients = defaultClients(),
): Promise<string[]> {
  const trimmed = parent.trim();
  const registry = await parentUserRegistry(trimmed, clients);
  const latest = await clients.getBlockNumber();
  const found = new Set<string>();
  for (let window = 0; window < MAX_LOG_WINDOWS; window += 1) {
    const toBlock = latest - BigInt(window) * LOG_WINDOW;
    if (toBlock < 0n) break;
    const fromBlock = toBlock + 1n > LOG_WINDOW ? toBlock - LOG_WINDOW + 1n : 0n;
    const labels = await clients.getLabelRegistered(registry, fromBlock, toBlock);
    for (const label of labels) {
      found.add(`${label}.${trimmed}`);
    }
    if (fromBlock === 0n) break;
  }
  return [...found].sort();
}
