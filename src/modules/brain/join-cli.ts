import { existsSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Address,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";
import type { JoinCall } from "../../types.ts";
import { loadSepoliaAccounts } from "../directory/sepolia-accounts.ts";
import {
  assertJoinCall,
  broadcastUnsignedJoin,
  CHALLENGE_LENDING,
  CHALLENGE_READ_ABI,
  unsignedJoinCall,
} from "./join-broadcast.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const rpc =
  process.env.ETH_RPC_URL?.trim() || "https://ethereum-sepolia-rpc.publicnode.com";
const checkOnly = process.argv.includes("--check");
const deskUrl =
  process.env.JOIN_DESK_URL?.trim() || "http://127.0.0.1:8787";

async function unsignedJoinFromDesk(url: string): Promise<JoinCall> {
  const res = await fetch(new URL("/desk/join", `${url.replace(/\/+$/, "")}/`), {
    headers: { accept: "application/json", "ngrok-skip-browser-warning": "1" },
  });
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok || body.action !== "join") {
    throw new Error(
      typeof body.error === "string" ? body.error : "TEE join() unavailable",
    );
  }
  return assertJoinCall({
    action: "join",
    to: String(body.to),
    data: String(body.data),
    chainId: Number(body.chainId),
    chain: String(body.chain),
  });
}

async function loadCall(): Promise<{ call: JoinCall; source: string }> {
  try {
    return { call: await unsignedJoinFromDesk(deskUrl), source: deskUrl };
  } catch {
    return { call: unsignedJoinCall(), source: "local-encode" };
  }
}

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpc),
});

async function preflight(address: Address) {
  const [challengeOpen, alreadyJoined, numUsers, balance] = await Promise.all([
    publicClient.readContract({
      address: CHALLENGE_LENDING,
      abi: CHALLENGE_READ_ABI,
      functionName: "challengeOpen",
    }),
    publicClient.readContract({
      address: CHALLENGE_LENDING,
      abi: CHALLENGE_READ_ABI,
      functionName: "isUser",
      args: [address],
    }),
    publicClient.readContract({
      address: CHALLENGE_LENDING,
      abi: CHALLENGE_READ_ABI,
      functionName: "numUsers",
    }),
    publicClient.getBalance({ address }),
  ]);
  return { challengeOpen, alreadyJoined, numUsers: numUsers.toString(), balance: balance.toString() };
}

const { call, source } = await loadCall();
assertJoinCall(call);
const { owner, operator } = loadSepoliaAccounts();
const candidates: Array<{ role: "owner" | "operator"; account: Account }> = [
  { role: "owner", account: owner },
  { role: "operator", account: operator },
];

const rows: Array<{
  role: "owner" | "operator";
  address: Address;
  challengeOpen: boolean;
  alreadyJoined: boolean;
  numUsers: string;
  balance: string;
}> = [];
for (const candidate of candidates) {
  rows.push({
    role: candidate.role,
    address: candidate.account.address,
    ...(await preflight(candidate.account.address)),
  });
}

if (checkOnly) {
  console.log(JSON.stringify({ call, source, wallets: rows }, null, 2));
  process.exit(0);
}

const sender = candidates.find((_, index) => {
  const row = rows[index];
  return row && row.challengeOpen && !row.alreadyJoined && BigInt(row.balance) > 0n;
});

if (!sender) {
  console.log(
    JSON.stringify(
      {
        error: "No funded Sepolia wallet can join() (closed, already joined, or zero balance).",
        call,
        source,
        wallets: rows,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const wallet = createWalletClient({
  account: sender.account,
  chain: sepolia,
  transport: http(rpc),
});

const result = await broadcastUnsignedJoin({
  call,
  from: sender.account.address,
  async challengeOpen() {
    return publicClient.readContract({
      address: CHALLENGE_LENDING,
      abi: CHALLENGE_READ_ABI,
      functionName: "challengeOpen",
    });
  },
  async alreadyJoined() {
    return publicClient.readContract({
      address: CHALLENGE_LENDING,
      abi: CHALLENGE_READ_ABI,
      functionName: "isUser",
      args: [sender.account.address],
    });
  },
  async send(tx) {
    const hash = await wallet.sendTransaction({
      to: tx.to,
      data: tx.data,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error(`join() reverted: ${hash}`);
    }
    return hash as Hex;
  },
});

console.log(JSON.stringify({ source, role: sender.role, ...result }, null, 2));
