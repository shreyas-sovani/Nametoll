import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  isAddressEqual,
  zeroHash,
  type Account,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { sepolia } from "viem/chains";
import { namehash } from "viem/ens";
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
  defaultUserRegistrySalt,
  dummyUsdcAbi,
  eth2ldLabel,
  ethRegistrarAbi,
  isContract,
  permissionedResolverWriteAbi,
  userRegistryAbi,
  v2LabelId,
  v2RegistryAbi,
  verifiableFactoryAbi,
  zeroAddress,
} from "./ensv2-sepolia.ts";
import { DESK_TEXT_KEY_LIST, DESK_TEXT_KEYS } from "./keys.ts";
import { PARENT_CANDIDATES, childName, chooseParentName } from "./parent-name.ts";
import { loadSepoliaAccounts } from "./sepolia-accounts.ts";

const STATE_PATH = resolve(".ens/sepolia-live.json");
const COMMIT_WAIT_MS = 65_000;
const CHILD_LABEL = "desk";

type LiveState = {
  parent?: string;
  secret?: Hex;
  commitment?: Hex;
  commitTx?: Hex;
  commitMinedAt?: number;
  resolver?: Hex;
  registerTx?: Hex;
  subregistry?: Hex;
  child?: string;
};

type StepLog = Record<string, string | boolean | number>;

function loadState(): LiveState {
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as LiveState;
  } catch {
    return {};
  }
}

function saveState(state: LiveState): void {
  mkdirSync(resolve(".ens"), { recursive: true });
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

function logStep(step: string, extra: StepLog = {}): void {
  console.log(JSON.stringify({ step, ...extra }));
}

function newSecret(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Buffer.from(bytes).toString("hex")}` as Hex;
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

async function parentStatus(
  client: PublicClient,
  name: string,
  owner: `0x${string}`,
) {
  const label = eth2ldLabel(name);
  const [available, state] = await Promise.all([
    client.readContract({
      address: ENSV2_SEPOLIA.registrar,
      abi: ethRegistrarAbi,
      functionName: "isAvailable",
      args: [label],
    }),
    client.readContract({
      address: ENSV2_SEPOLIA.registry,
      abi: v2RegistryAbi,
      functionName: "getState",
      args: [v2LabelId(label)],
    }),
  ]);
  const ownedByUs =
    state.status === V2Status.REGISTERED && isAddressEqual(state.latestOwner, owner);
  return { name, label, available, ownedByUs, state };
}

function deskValues(config: ReturnType<typeof loadConfig>) {
  const endpoint = config.publicDeskUrl?.trim();
  if (!endpoint || !/^https?:\/\//i.test(endpoint)) {
    throw new Error("Set PUBLIC_DESK_URL to the public desk origin before writing records.");
  }
  const payTo = config.sellerAccountId;
  const hcsTopic = config.hcsTopicId;
  if (!payTo || !hcsTopic) {
    throw new Error("Set HEDERA_SELLER_ACCOUNT_ID and HCS_TOPIC_ID for agent-context.");
  }
  const priceRule = `${config.priceTinybars} tinybars per protocol`;
  const agentContext = JSON.stringify({
    payTo,
    priceRule,
    hcsTopic,
    asset: HBAR_ASSET,
  });
  return { endpoint, payTo, hcsTopic, priceRule, agentContext };
}

async function readDeskTexts(
  client: PublicClient,
  resolver: `0x${string}`,
  name: string,
): Promise<Record<string, string>> {
  const node = namehash(name);
  const pairs = await Promise.all(
    DESK_TEXT_KEY_LIST.map(async (key) => {
      const value = await client.readContract({
        address: resolver,
        abi: permissionedResolverWriteAbi,
        functionName: "text",
        args: [node, key],
      });
      return [key, value] as const;
    }),
  );
  return Object.fromEntries(pairs);
}

async function ensureEoaReceiver(
  publicClient: PublicClient,
  wallet: WalletClient,
  account: Account & { address: `0x${string}` },
): Promise<void> {
  const code = await publicClient.getCode({ address: account.address });
  if (!code || code === "0x") return;
  if (!code.toLowerCase().startsWith("0xef0100")) {
    throw new Error(
      `${account.address} has contract code and cannot receive the ENSv2 ERC-1155 name token.`,
    );
  }
  logStep("eip7702-revoke", { address: account.address, delegated: true });
  const authorization = await wallet.signAuthorization({
    account,
    contractAddress: zeroAddress,
    executor: "self",
  });
  const hash = await wallet.sendTransaction({
    account,
    chain: sepolia,
    authorizationList: [authorization],
    to: account.address,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`EIP-7702 revoke failed: ${hash}`);
  }
  const after = await publicClient.getCode({ address: account.address });
  if (after && after !== "0x") {
    throw new Error(`EIP-7702 revoke mined (${hash}) but the account still has code.`);
  }
  logStep("eip7702-revoke", { address: account.address, hash, cleared: true });
}

async function ensureResolver(
  publicClient: PublicClient,
  wallet: WalletClient,
  owner: Account & { address: `0x${string}` },
): Promise<{ resolver: `0x${string}`; hash?: Hex }> {
  const resolver = computeOwnedResolverAddress({
    deployer: owner.address,
    owner: owner.address,
  });
  if (await isContract(publicClient, resolver)) {
    logStep("resolver", { resolver, alreadyDeployed: true });
    return { resolver };
  }
  const initializeData = encodeFunctionData({
    abi: permissionedResolverWriteAbi,
    functionName: "initialize",
    args: [owner.address, ALL_ROLES, []],
  });
  const hash = await send(publicClient, wallet, owner, {
    address: ENSV2_SEPOLIA.resolverFactory,
    abi: verifiableFactoryAbi,
    functionName: "deployProxy",
    args: [ENSV2_SEPOLIA.resolverImplementation, defaultOwnedResolverSalt(owner.address), initializeData],
  });
  logStep("resolver", { resolver, hash });
  return { resolver, hash };
}

async function ensureUsdc(
  publicClient: PublicClient,
  wallet: WalletClient,
  owner: Account & { address: `0x${string}` },
  need: bigint,
): Promise<void> {
  const balance = await publicClient.readContract({
    address: ENSV2_SEPOLIA.paymentToken,
    abi: dummyUsdcAbi,
    functionName: "balanceOf",
    args: [owner.address],
  });
  if (balance < need) {
    const mintHash = await send(publicClient, wallet, owner, {
      address: ENSV2_SEPOLIA.paymentToken,
      abi: dummyUsdcAbi,
      functionName: "mint",
      args: [owner.address, need - balance],
    });
    logStep("usdc-mint", { hash: mintHash });
  }
  const allowance = await publicClient.readContract({
    address: ENSV2_SEPOLIA.paymentToken,
    abi: dummyUsdcAbi,
    functionName: "allowance",
    args: [owner.address, ENSV2_SEPOLIA.registrar],
  });
  if (allowance < need) {
    const approveHash = await send(publicClient, wallet, owner, {
      address: ENSV2_SEPOLIA.paymentToken,
      abi: dummyUsdcAbi,
      functionName: "approve",
      args: [ENSV2_SEPOLIA.registrar, need],
    });
    logStep("usdc-approve", { hash: approveHash });
  }
}

async function ensureRegistered(
  publicClient: PublicClient,
  wallet: WalletClient,
  owner: Account & { address: `0x${string}` },
  parent: string,
  resolver: `0x${string}`,
  state: LiveState,
): Promise<LiveState> {
  const status = await parentStatus(publicClient, parent, owner.address);
  if (status.ownedByUs) {
    logStep("register", { parent, alreadyOwned: true });
    return state;
  }
  if (!status.available) {
    throw new Error(`${parent} is not available and is not owned by ${owner.address}`);
  }

  const label = status.label;
  const secret = state.parent === parent && state.secret ? state.secret : newSecret();
  const next: LiveState = { ...state, parent, secret };
  saveState(next);

  const commitment = await publicClient.readContract({
    address: ENSV2_SEPOLIA.registrar,
    abi: ethRegistrarAbi,
    functionName: "makeCommitment",
    args: [label, owner.address, secret, zeroAddress, resolver, YEAR_SECONDS, zeroHash],
  });

  if (!next.commitTx || next.commitment !== commitment) {
    const commitTx = await send(publicClient, wallet, owner, {
      address: ENSV2_SEPOLIA.registrar,
      abi: ethRegistrarAbi,
      functionName: "commit",
      args: [commitment],
    });
    const receipt = await publicClient.getTransactionReceipt({ hash: commitTx });
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
    next.commitment = commitment;
    next.commitTx = commitTx;
    next.commitMinedAt = Number(block.timestamp) * 1000;
    saveState(next);
    logStep("commit", { hash: commitTx });
  } else {
    logStep("commit", { hash: next.commitTx, reused: true });
  }

  const minedAt = next.commitMinedAt ?? Date.now();
  const waitMs = Math.max(0, COMMIT_WAIT_MS - (Date.now() - minedAt));
  if (waitMs > 0) {
    logStep("commit-wait", { ms: waitMs });
    await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));
  }

  const price = await publicClient.readContract({
    address: ENSV2_SEPOLIA.registrar,
    abi: ethRegistrarAbi,
    functionName: "getRegisterPrice",
    args: [label, YEAR_SECONDS, ENSV2_SEPOLIA.paymentToken],
  });
  const total = price[0] + price[1];
  await ensureUsdc(publicClient, wallet, owner, total);

  const registerTx = await send(publicClient, wallet, owner, {
    address: ENSV2_SEPOLIA.registrar,
    abi: ethRegistrarAbi,
    functionName: "register",
    args: [
      label,
      owner.address,
      secret,
      zeroAddress,
      resolver,
      YEAR_SECONDS,
      ENSV2_SEPOLIA.paymentToken,
      zeroHash,
    ],
  });
  next.registerTx = registerTx;
  saveState(next);
  logStep("register", { parent, hash: registerTx });
  return next;
}

async function ensureSubregistry(
  publicClient: PublicClient,
  wallet: WalletClient,
  owner: Account & { address: `0x${string}` },
  parent: string,
  state: LiveState,
): Promise<{ subregistry: `0x${string}`; state: LiveState }> {
  const existing = await publicClient.readContract({
    address: ENSV2_SEPOLIA.registry,
    abi: v2RegistryAbi,
    functionName: "getSubregistry",
    args: [eth2ldLabel(parent)],
  });
  if (!isAddressEqual(existing, zeroAddress)) {
    logStep("subregistry", { subregistry: existing, alreadySet: true });
    const next = { ...state, subregistry: existing };
    saveState(next);
    return { subregistry: existing, state: next };
  }

  const salt = defaultUserRegistrySalt(parent);
  const initializeData = encodeFunctionData({
    abi: userRegistryAbi,
    functionName: "initialize",
    args: [owner.address, ALL_ROLES],
  });
  const { result: predicted } = await publicClient.simulateContract({
    account: owner,
    address: ENSV2_SEPOLIA.resolverFactory,
    abi: verifiableFactoryAbi,
    functionName: "deployProxy",
    args: [ENSV2_SEPOLIA.subregistryImplementation, salt, initializeData],
  });
  let subregistry = predicted;
  if (!(await isContract(publicClient, subregistry))) {
    const deployHash = await send(publicClient, wallet, owner, {
      address: ENSV2_SEPOLIA.resolverFactory,
      abi: verifiableFactoryAbi,
      functionName: "deployProxy",
      args: [ENSV2_SEPOLIA.subregistryImplementation, salt, initializeData],
    });
    logStep("subregistry-deploy", { subregistry, hash: deployHash });
  } else {
    logStep("subregistry-deploy", { subregistry, alreadyDeployed: true });
  }

  const nameState = await publicClient.readContract({
    address: ENSV2_SEPOLIA.registry,
    abi: v2RegistryAbi,
    functionName: "getState",
    args: [v2LabelId(eth2ldLabel(parent))],
  });
  const setHash = await send(publicClient, wallet, owner, {
    address: ENSV2_SEPOLIA.registry,
    abi: v2RegistryAbi,
    functionName: "setSubregistry",
    args: [nameState.tokenId, subregistry],
  });
  const next = { ...state, subregistry };
  saveState(next);
  logStep("subregistry-set", { subregistry, hash: setHash });
  return { subregistry, state: next };
}

async function ensureChild(
  publicClient: PublicClient,
  wallet: WalletClient,
  owner: Account & { address: `0x${string}` },
  parent: string,
  resolver: `0x${string}`,
  subregistry: `0x${string}`,
): Promise<string> {
  const child = childName(parent, CHILD_LABEL);
  const state = await publicClient.readContract({
    address: subregistry,
    abi: v2RegistryAbi,
    functionName: "getState",
    args: [v2LabelId(CHILD_LABEL)],
  });
  if (state.status === V2Status.REGISTERED) {
    logStep("child", { child, alreadyRegistered: true });
    return child;
  }
  const block = await publicClient.getBlock();
  const expiry = block.timestamp + YEAR_SECONDS;
  const hash = await send(publicClient, wallet, owner, {
    address: subregistry,
    abi: v2RegistryAbi,
    functionName: "register",
    args: [
      CHILD_LABEL,
      owner.address,
      zeroAddress,
      resolver,
      V2_DEFAULT_OWNER_ROLE_BITMAP,
      expiry,
    ],
  });
  logStep("child", { child, hash });
  return child;
}

async function ensureTexts(
  publicClient: PublicClient,
  wallet: WalletClient,
  owner: Account & { address: `0x${string}` },
  resolver: `0x${string}`,
  name: string,
  values: ReturnType<typeof deskValues>,
): Promise<Hex | undefined> {
  const current = await readDeskTexts(publicClient, resolver, name);
  const needed = {
    [DESK_TEXT_KEYS.url]: values.endpoint,
    [DESK_TEXT_KEYS.agentEndpointWeb]: values.endpoint,
    [DESK_TEXT_KEYS.agentContext]: values.agentContext,
  };
  if (DESK_TEXT_KEY_LIST.every((key) => current[key] === needed[key])) {
    logStep("texts", { name, alreadySet: true });
    return undefined;
  }
  const node = namehash(name);
  const calls = [
    encodeFunctionData({
      abi: permissionedResolverWriteAbi,
      functionName: "setAddr",
      args: [node, owner.address],
    }),
    ...DESK_TEXT_KEY_LIST.map((key) =>
      encodeFunctionData({
        abi: permissionedResolverWriteAbi,
        functionName: "setText",
        args: [node, key, needed[key]],
      }),
    ),
  ];
  const hash = await send(publicClient, wallet, owner, {
    address: resolver,
    abi: permissionedResolverWriteAbi,
    functionName: "multicall",
    args: [calls],
  });
  logStep("texts", { name, hash });
  return hash;
}

async function ensureTextRoles(
  publicClient: PublicClient,
  wallet: WalletClient,
  owner: Account & { address: `0x${string}` },
  resolver: `0x${string}`,
  name: string,
  operator: `0x${string}`,
): Promise<Hex[]> {
  const dnsName = dnsEncodedName(name);
  const hashes: Hex[] = [];
  for (const key of DESK_TEXT_KEY_LIST) {
    const hash = await send(publicClient, wallet, owner, {
      address: resolver,
      abi: permissionedResolverWriteAbi,
      functionName: "authorizeTextRoles",
      args: [dnsName, key, operator, true],
    });
    logStep("eac-text", { name, key, hash });
    hashes.push(hash);
  }
  return hashes;
}

export async function runSepoliaLive(opts: {
  parentArg?: string;
  checkOnly?: boolean;
}): Promise<void> {
  const config = loadConfig();
  const { owner, operator } = loadSepoliaAccounts();
  const rpc = process.env.ETH_RPC_URL?.trim() || "https://ethereum-sepolia-rpc.publicnode.com";
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpc),
  });
  const wallet = createWalletClient({
    account: owner,
    chain: sepolia,
    transport: http(rpc),
  });

  const statuses = await Promise.all(
    (opts.parentArg ? [opts.parentArg] : [...PARENT_CANDIDATES]).map((name) =>
      parentStatus(publicClient, name, owner.address),
    ),
  );
  const parent = opts.parentArg ?? chooseParentName(statuses);
  const chosen = statuses.find((row) => row.name === parent) ?? statuses[0]!;
  logStep("accounts", {
    owner: owner.address,
    operator: operator.address,
    parent,
    available: chosen.available,
    ownedByUs: chosen.ownedByUs,
  });

  if (opts.checkOnly) {
    console.log(JSON.stringify({ candidates: statuses.map(({ state: _s, ...row }) => row) }, null, 2));
    return;
  }

  const values = deskValues(config);
  let state = loadState();
  if (state.parent && state.parent !== parent) {
    state = {};
  }

  const { resolver } = await ensureResolver(publicClient, wallet, owner);
  state = { ...state, parent, resolver };
  saveState(state);
  await ensureEoaReceiver(publicClient, wallet, owner);
  state = await ensureRegistered(publicClient, wallet, owner, parent, resolver, state);
  const sub = await ensureSubregistry(publicClient, wallet, owner, parent, state);
  state = { ...sub.state, child: await ensureChild(publicClient, wallet, owner, parent, resolver, sub.subregistry) };
  saveState(state);

  await ensureTexts(publicClient, wallet, owner, resolver, parent, values);
  await ensureTexts(publicClient, wallet, owner, resolver, state.child!, values);
  await ensureTextRoles(publicClient, wallet, owner, resolver, parent, operator.address);

  const texts = await readDeskTexts(publicClient, resolver, parent);
  console.log(
    JSON.stringify(
      {
        parent,
        child: state.child,
        owner: owner.address,
        operator: operator.address,
        resolver,
        subregistry: sub.subregistry,
        endpoint: values.endpoint,
        payTo: values.payTo,
        hcsTopic: values.hcsTopic,
        texts,
      },
      null,
      2,
    ),
  );
}

const invoked = process.argv[1]?.includes("sepolia-live");
if (invoked) {
  const checkOnly = process.argv.includes("--check");
  const parentArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  await runSepoliaLive({
    ...(parentArg ? { parentArg } : {}),
    checkOnly,
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
