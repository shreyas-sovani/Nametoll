import { createPublicClient, createWalletClient, http, namehash } from "viem";
import { sepolia } from "viem/chains";
import { computeOwnedResolverAddress, permissionedResolverWriteAbi } from "./ensv2-sepolia.ts";
import { DESK_TEXT_KEYS } from "./keys.ts";
import { loadSepoliaAccounts } from "./sepolia-accounts.ts";

const name = process.argv[2];
const endpoint = process.argv[3];
if (!name || !endpoint) {
  console.error("Usage: tsx src/modules/directory/operator-set.ts <name> <endpoint>");
  process.exit(1);
}

const rpc = process.env.ETH_RPC_URL?.trim() || "https://ethereum-sepolia-rpc.publicnode.com";
const { owner, operator } = loadSepoliaAccounts();
const resolver = computeOwnedResolverAddress({
  deployer: owner.address,
  owner: owner.address,
});
const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) });
const wallet = createWalletClient({ account: operator, chain: sepolia, transport: http(rpc) });
const node = namehash(name);
const nonce = await publicClient.getTransactionCount({
  address: operator.address,
  blockTag: "pending",
});
const hash = await wallet.writeContract({
  address: resolver,
  abi: permissionedResolverWriteAbi,
  functionName: "setText",
  args: [node, DESK_TEXT_KEYS.agentEndpointWeb, endpoint],
  nonce,
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(JSON.stringify({ name, key: DESK_TEXT_KEYS.agentEndpointWeb, endpoint, hash, status: receipt.status }));
