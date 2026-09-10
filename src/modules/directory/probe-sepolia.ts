import { createPublicClient, formatEther, formatUnits, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { loadSepoliaAccounts } from "./sepolia-accounts.ts";

const PAYMENT_TOKEN = "0x768F42455A2D082E23ceeF7d51e5787C82d67a39" as const;
const erc20 = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

const client = createPublicClient({
  chain: sepolia,
  transport: http(process.env.ETH_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com"),
});

const { owner, operator } = loadSepoliaAccounts();
const [ownerEth, operatorEth, tokenDecimals, tokenSymbol, ownerToken, operatorToken] =
  await Promise.all([
    client.getBalance({ address: owner.address }),
    client.getBalance({ address: operator.address }),
    client.readContract({ address: PAYMENT_TOKEN, abi: erc20, functionName: "decimals" }),
    client.readContract({ address: PAYMENT_TOKEN, abi: erc20, functionName: "symbol" }),
    client.readContract({
      address: PAYMENT_TOKEN,
      abi: erc20,
      functionName: "balanceOf",
      args: [owner.address],
    }),
    client.readContract({
      address: PAYMENT_TOKEN,
      abi: erc20,
      functionName: "balanceOf",
      args: [operator.address],
    }),
  ]);

console.log(
  JSON.stringify(
    {
      owner: owner.address,
      operator: operator.address,
      ownerEth: formatEther(ownerEth),
      operatorEth: formatEther(operatorEth),
      paymentToken: PAYMENT_TOKEN,
      tokenSymbol,
      ownerToken: formatUnits(ownerToken, tokenDecimals),
      operatorToken: formatUnits(operatorToken, tokenDecimals),
    },
    null,
    2,
  ),
);
