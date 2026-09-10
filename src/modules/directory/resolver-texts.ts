import { createPublicClient, http, parseAbi, toHex, zeroAddress } from "viem";
import { namehash, packetToBytes } from "viem/ens";
import { sepolia } from "viem/chains";
import { DESK_TEXT_KEY_LIST } from "./keys.ts";

/** Official Sepolia Universal Resolver from vendor/ens-cli `addresses.sepolia`. */
export const SEPOLIA_UNIVERSAL_RESOLVER = "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe";

const findResolverAbi = parseAbi([
  "function findResolver(bytes name) view returns (address resolver, bytes32 node, uint256 offset)",
]);

const textAbi = parseAbi(["function text(bytes32 node, string key) view returns (string)"]);

export type ResolverTextClients = {
  findResolver: (name: string) => Promise<`0x${string}`>;
  readText: (resolver: `0x${string}`, name: string, key: string) => Promise<string>;
};

function defaultClients(rpcUrl?: string): ResolverTextClients {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl ?? process.env.ETH_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com"),
  });
  return {
    async findResolver(name) {
      const [resolver] = await client.readContract({
        address: SEPOLIA_UNIVERSAL_RESOLVER,
        abi: findResolverAbi,
        functionName: "findResolver",
        args: [toHex(packetToBytes(name))],
      });
      return resolver;
    },
    async readText(resolver, name, key) {
      return await client.readContract({
        address: resolver,
        abi: textAbi,
        functionName: "text",
        args: [namehash(name), key],
      });
    },
  };
}

export async function fetchTextsFromResolver(
  name: string,
  clients: ResolverTextClients = defaultClients(),
): Promise<Record<string, string>> {
  const resolver = await clients.findResolver(name);
  if (!resolver || resolver === zeroAddress) {
    return {};
  }
  const texts: Record<string, string> = {};
  for (const key of DESK_TEXT_KEY_LIST) {
    const value = await clients.readText(resolver, name, key);
    if (value.trim()) texts[key] = value;
  }
  return texts;
}
