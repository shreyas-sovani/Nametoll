import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  isAddressEqual,
  namehash,
  type Account,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { sepolia } from "viem/chains";
import { HBAR_ASSET, loadConfig } from "../../config.ts";
import { dnsEncodedName } from "./dns-name.ts";
import {
  ALL_ROLES,
  ENSV2_SEPOLIA,
  V2Status,
  V2_DEFAULT_OWNER_ROLE_BITMAP,
  YEAR_SECONDS,
  computeOwnedResolverAddress,
  defaultOwnedResolverSalt,
  eth2ldLabel,
  isContract,
  permissionedResolverWriteAbi,
  v2LabelId,
  v2RegistryAbi,
  verifiableFactoryAbi,
  zeroAddress,
} from "./ensv2-sepolia.ts";
import { DESK_TEXT_KEY_LIST, DESK_TEXT_KEYS } from "./keys.ts";
import { childName } from "./parent-name.ts";
import { loadSepoliaAccounts } from "./sepolia-accounts.ts";
import type { ConstrainedDeskRecords, IssuedDesk } from "./register.ts";
import { ENS_CLI, type WritePlan } from "./write-plan.ts";

const STATE_PATH = resolve(".ens/sepolia-live.json");
const SECOND_RESOLVER_INDEX = 1n;

export type IssueSubnameInput = {
  owner: string;
  operator: string;
  parent: string;
  label: string;
  endpoint: string;
  payTo: string;
  priceRule: string;
  hcsTopic: string;
};

export function issueSubnamePlan(input: IssueSubnameInput): WritePlan {
  const parent = input.parent.trim();
  const label = input.label.trim();
  if (!parent) {
    throw new Error("Parent name is required. Pass it as an argument — do not bake one in.");
  }
  if (!label) {
    throw new Error("Child label is required. Pass --label — do not bake one in.");
  }
  const child = childName(parent, label);
  const context = JSON.stringify({
    payTo: input.payTo,
    priceRule: input.priceRule,
    hcsTopic: input.hcsTopic,
    asset: HBAR_ASSET,
  });
  return {
    broadcast: false,
    steps: [
      {
        title: "Deploy a second owner Permissioned Resolver",
        command: `${ENS_CLI} resolver deploy ${input.owner} --chain sepolia --json`,
        note: `Salt index 1 — distinct from the parent resolver. Save predicted resolver for ${child}.`,
      },
      {
        title: "Register the child under the parent UserRegistry",
        command: `register(${label}) on parent UserRegistry → ${child} with the new Permissioned Resolver`,
        note: "Own resolver. Do not grant registry transfer roles.",
      },
      {
        title: "Set documented desk text records on the child",
        command: `${ENS_CLI} set batch ${child} --resolver <RESOLVER> --chain sepolia --data url,agent-context,agent-endpoint[web]`,
        note: `agent-context carries payTo, priceRule, hcsTopic, asset ${HBAR_ASSET}. Endpoint ${input.endpoint}.`,
      },
      {
        title: "EAC: operator may edit those text keys only",
        command: [
          `authorizeTextRoles(dnsName(${child}), "${DESK_TEXT_KEYS.url}", ${input.operator}, true)`,
          `authorizeTextRoles(dnsName(${child}), "${DESK_TEXT_KEYS.agentContext}", ${input.operator}, true)`,
          `authorizeTextRoles(dnsName(${child}), "${DESK_TEXT_KEYS.agentEndpointWeb}", ${input.operator}, true)`,
        ].join(" && "),
        note: "ROLE_SET_TEXT on those keys only. Do not grant registry transfer roles, so the operator cannot transfer the name.",
      },
    ],
  };
}

type LiveState = {
  parent?: string;
  subregistry?: Hex;
  child?: string;
  agents?: string[];
};

function loadState(): LiveState {
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as LiveState;
  } catch {
    return {};
  }
}

function saveState(state: LiveState): void {
  mkdirSync(resolve(".ens"), { recursive: true });
  const previous = loadState();
  writeFileSync(STATE_PATH, `${JSON.stringify({ ...previous, ...state }, null, 2)}\n`);
}

function flag(name: string, argv = process.argv): string | undefined {
  const index = argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function logStep(step: string, extra: Record<string, string | boolean | number> = {}): void {
  console.log(JSON.stringify({ step, ...extra }));
}

async function send(
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Account,
  params: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  },
): Promise<Hex> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const nonce = await publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      });
      const { request } = await publicClient.simulateContract({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
        account,
        nonce,
      });
      const hash = await wallet.writeContract({ ...request, nonce });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error(`${params.functionName} failed: ${hash}`);
      }
      return hash;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!/nonce|already known|replacement/i.test(message) || attempt === 4) {
        throw new Error(
          `${params.functionName} failed: ${message.replace(/0x[0-9a-fA-F]{64}/g, "0x<hex>").split("\n")[0]}`,
        );
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 1500 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function runIssueSubname(opts: {
  parent?: string;
  label?: string;
  planOnly?: boolean;
}): Promise<void> {
  const config = loadConfig();
  const { owner, operator } = loadSepoliaAccounts();
  const state = loadState();
  const parent = (opts.parent ?? state.parent ?? "").trim();
  const label = (opts.label ?? "agent-02").trim();
  const endpoint = config.publicDeskUrl?.trim() ?? "";
  const payTo = config.sellerAccountId ?? "";
  const hcsTopic = config.hcsTopicId ?? "";
  const priceRule = `${config.priceTinybars} tinybars per protocol`;

  if (opts.planOnly) {
    console.log(
      JSON.stringify(
        issueSubnamePlan({
          owner: owner.address,
          operator: operator.address,
          parent,
          label,
          endpoint,
          payTo,
          priceRule,
          hcsTopic,
        }),
        null,
        2,
      ),
    );
    return;
  }

  if (!parent) {
    throw new Error("Pass --parent or run npm run ens:sepolia first so .ens/sepolia-live.json has parent.");
  }
  if (!endpoint || !payTo || !hcsTopic) {
    throw new Error("Set PUBLIC_DESK_URL, HEDERA_SELLER_ACCOUNT_ID, and HCS_TOPIC_ID.");
  }

  const issued = await issueDeskChild({
    parent,
    label,
    endpoint,
    payTo,
    priceRule,
    hcsTopic,
    asset: HBAR_ASSET,
  });
  console.log(JSON.stringify(issued, null, 2));
}

export async function issueDeskChild(input: ConstrainedDeskRecords): Promise<IssuedDesk> {
  const { owner, operator } = loadSepoliaAccounts();
  const state = loadState();
  const parent = input.parent.trim();
  const label = input.label.trim();
  const endpoint = input.endpoint;
  const payTo = input.payTo;
  const hcsTopic = input.hcsTopic;
  const priceRule = input.priceRule;

  const rpc = process.env.ETH_RPC_URL?.trim() || "https://ethereum-sepolia-rpc.publicnode.com";
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const wallet = createWalletClient({ account: owner, chain: sepolia, transport: http(rpc) });
  const child = childName(parent, label);
  const resolver = computeOwnedResolverAddress({
    deployer: owner.address,
    owner: owner.address,
    index: SECOND_RESOLVER_INDEX,
  });

  if (!(await isContract(publicClient, resolver))) {
    const initializeData = encodeFunctionData({
      abi: permissionedResolverWriteAbi,
      functionName: "initialize",
      args: [owner.address, ALL_ROLES, []],
    });
    const hash = await send(publicClient, wallet, owner, {
      address: ENSV2_SEPOLIA.resolverFactory,
      abi: verifiableFactoryAbi,
      functionName: "deployProxy",
      args: [
        ENSV2_SEPOLIA.resolverImplementation,
        defaultOwnedResolverSalt(owner.address, SECOND_RESOLVER_INDEX),
        initializeData,
      ],
    });
    logStep("resolver", { resolver, hash, index: Number(SECOND_RESOLVER_INDEX) });
  } else {
    logStep("resolver", { resolver, alreadyDeployed: true, index: Number(SECOND_RESOLVER_INDEX) });
  }

  const subregistry = (state.subregistry ??
    (await publicClient.readContract({
      address: ENSV2_SEPOLIA.registry,
      abi: v2RegistryAbi,
      functionName: "getSubregistry",
      args: [eth2ldLabel(parent)],
    }))) as `0x${string}`;
  if (isAddressEqual(subregistry, zeroAddress)) {
    throw new Error(`${parent} has no UserRegistry. Run npm run ens:sepolia first.`);
  }

  const childState = await publicClient.readContract({
    address: subregistry,
    abi: v2RegistryAbi,
    functionName: "getState",
    args: [v2LabelId(label)],
  });
  let registerTx: Hex | undefined;
  if (childState.status !== V2Status.REGISTERED) {
    const block = await publicClient.getBlock();
    registerTx = await send(publicClient, wallet, owner, {
      address: subregistry,
      abi: v2RegistryAbi,
      functionName: "register",
      args: [
        label,
        owner.address,
        zeroAddress,
        resolver,
        V2_DEFAULT_OWNER_ROLE_BITMAP,
        block.timestamp + YEAR_SECONDS,
      ],
    });
    logStep("child", { child, hash: registerTx });
  } else {
    logStep("child", { child, alreadyRegistered: true });
  }

  const agentContext = JSON.stringify({
    payTo,
    priceRule,
    hcsTopic,
    asset: HBAR_ASSET,
  });
  const needed = {
    [DESK_TEXT_KEYS.url]: endpoint,
    [DESK_TEXT_KEYS.agentEndpointWeb]: endpoint,
    [DESK_TEXT_KEYS.agentContext]: agentContext,
  };
  const node = namehash(child);
  const current = Object.fromEntries(
    await Promise.all(
      DESK_TEXT_KEY_LIST.map(async (key) => {
        const value = await publicClient.readContract({
          address: resolver,
          abi: permissionedResolverWriteAbi,
          functionName: "text",
          args: [node, key],
        });
        return [key, value] as const;
      }),
    ),
  );
  if (!DESK_TEXT_KEY_LIST.every((key) => current[key] === needed[key])) {
    const calls = DESK_TEXT_KEY_LIST.map((key) =>
      encodeFunctionData({
        abi: permissionedResolverWriteAbi,
        functionName: "setText",
        args: [node, key, needed[key]],
      }),
    );
    const hash = await send(publicClient, wallet, owner, {
      address: resolver,
      abi: permissionedResolverWriteAbi,
      functionName: "multicall",
      args: [calls],
    });
    logStep("texts", { name: child, hash });
  } else {
    logStep("texts", { name: child, alreadySet: true });
  }

  const dnsName = dnsEncodedName(child);
  for (const key of DESK_TEXT_KEY_LIST) {
    const hash = await send(publicClient, wallet, owner, {
      address: resolver,
      abi: permissionedResolverWriteAbi,
      functionName: "authorizeTextRoles",
      args: [dnsName, key, operator.address, true],
    });
    logStep("eac-text", { name: child, key, hash });
  }

  const agents = [...new Set([...(state.agents ?? []), child])];
  saveState({ parent, subregistry, agents });
  return {
    parent,
    child,
    resolver,
    ...(registerTx ? { registerTx } : {}),
  };
}

const invoked = process.argv[1]?.includes("issue-subname");
if (invoked) {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const planOnly = process.argv.includes("--plan");
  const parentArg = flag("parent");
  const labelArg = flag("label");
  await runIssueSubname({
    ...(parentArg ? { parent: parentArg } : {}),
    ...(labelArg ? { label: labelArg } : {}),
    planOnly,
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
