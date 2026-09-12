import type { Network } from "@x402/core/types";

export const HEDERA_TESTNET = "hedera:testnet" satisfies Network;
export const HBAR_ASSET = "0.0.0";
export const DEFAULT_FACILITATOR_URL = "https://api.testnet.blocky402.com";
export const DEFAULT_PRICE_TINYBARS = "100000";
export const DEFAULT_MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";
export const DEFAULT_GRAPH_GATEWAY_URL = "https://gateway.thegraph.com/api";
export const DEFAULT_ENSNODE_URL = "https://api.v2-sepolia.ensnode.io";

export type SecretsPaths = {
  buyerKeyPath?: string;
  creSecretsPath?: string;
};

export type AppConfig = {
  port: number;
  network: Network;
  facilitatorUrl: string;
  sellerAccountId?: string;
  sellerPrivateKey?: string;
  publicDeskUrl?: string;
  hcsTopicId?: string;
  mirrorNodeUrl: string;
  graphGatewayUrl: string;
  graphGatewayKey?: string;
  ensnodeUrl: string;
  secretsPaths: SecretsPaths;
  priceTinybars: string;
  creBrainUrl?: string;
  creProjectDir?: string;
  creWorkflowName?: string;
  creTarget: string;
  buyerAccountId?: string;
  deskPaySecret?: string;
  deskPayRateMax?: number;
  deskPayRateWindowMs?: number;
  deskPayGlobalMax?: number;
  billMatchTimeoutMs?: number;
  htsTokenId?: string;
  ensParent?: string;
};

function readEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const raw = env[name];
  if (raw == null || raw === "") return undefined;
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value || undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (readEnv(env, "FACILITATOR_PRIVATE_KEY")) {
    throw new Error(
      "Resource server must not hold a facilitator private key. Unset FACILITATOR_PRIVATE_KEY.",
    );
  }

  const topicId = readEnv(env, "HCS_TOPIC_ID");
  const sellerPrivateKey = readEnv(env, "HEDERA_SELLER_PRIVATE_KEY");
  if (topicId && !sellerPrivateKey) {
    throw new Error(
      "HCS_TOPIC_ID requires a seller private key so the desk can submit bills. Set HEDERA_SELLER_PRIVATE_KEY. This is the seller key, not a facilitator key.",
    );
  }

  const graphGatewayKey = readEnv(env, "GRAPH_GATEWAY_KEY");
  const sellerAccountId = readEnv(env, "HEDERA_SELLER_ACCOUNT_ID");
  const publicDeskUrl = readEnv(env, "PUBLIC_DESK_URL");
  const buyerKeyPath = readEnv(env, "HEDERA_BUYER_KEY_PATH");
  const creSecretsPath = readEnv(env, "CRE_SECRETS_PATH");
  const creBrainUrl = readEnv(env, "CRE_BRAIN_URL");
  const creProjectDir = readEnv(env, "CRE_PROJECT_DIR");
  const creWorkflowName = readEnv(env, "CRE_WORKFLOW_NAME");
  const buyerAccountId = readEnv(env, "HEDERA_BUYER_ACCOUNT_ID");
  const deskPaySecret = readEnv(env, "DESK_PAY_SECRET");
  const deskPayRateMax = readEnv(env, "DESK_PAY_RATE_MAX");
  const deskPayRateWindowMs = readEnv(env, "DESK_PAY_RATE_WINDOW_MS");
  const deskPayGlobalMax = readEnv(env, "DESK_PAY_GLOBAL_MAX");
  const htsTokenId = readEnv(env, "HTS_TOKEN_ID");
  const ensParent = readEnv(env, "ENS_PARENT");

  return {
    port: Number.parseInt(readEnv(env, "PORT") ?? "8787", 10),
    network: (readEnv(env, "X402_NETWORK") as Network | undefined) ?? HEDERA_TESTNET,
    facilitatorUrl: readEnv(env, "FACILITATOR_URL") ?? DEFAULT_FACILITATOR_URL,
    ...(sellerAccountId ? { sellerAccountId } : {}),
    ...(sellerPrivateKey ? { sellerPrivateKey } : {}),
    ...(publicDeskUrl ? { publicDeskUrl } : {}),
    ...(topicId ? { hcsTopicId: topicId } : {}),
    secretsPaths: {
      ...(buyerKeyPath ? { buyerKeyPath } : {}),
      ...(creSecretsPath ? { creSecretsPath } : {}),
    },
    priceTinybars: readEnv(env, "PRICE_TINYBARS") ?? DEFAULT_PRICE_TINYBARS,
    mirrorNodeUrl: readEnv(env, "MIRROR_NODE_URL") ?? DEFAULT_MIRROR_NODE_URL,
    graphGatewayUrl: readEnv(env, "GRAPH_GATEWAY_URL") ?? DEFAULT_GRAPH_GATEWAY_URL,
    ensnodeUrl: readEnv(env, "ENSNODE_URL") ?? DEFAULT_ENSNODE_URL,
    ...(graphGatewayKey ? { graphGatewayKey } : {}),
    ...(creBrainUrl ? { creBrainUrl } : {}),
    ...(creProjectDir ? { creProjectDir } : {}),
    ...(creWorkflowName ? { creWorkflowName } : {}),
    creTarget: readEnv(env, "CRE_TARGET") ?? "staging-settings",
    ...(buyerAccountId ? { buyerAccountId } : {}),
    ...(deskPaySecret ? { deskPaySecret } : {}),
    ...(deskPayRateMax ? { deskPayRateMax: Number.parseInt(deskPayRateMax, 10) } : {}),
    ...(deskPayRateWindowMs
      ? { deskPayRateWindowMs: Number.parseInt(deskPayRateWindowMs, 10) }
      : {}),
    ...(deskPayGlobalMax ? { deskPayGlobalMax: Number.parseInt(deskPayGlobalMax, 10) } : {}),
    ...(htsTokenId ? { htsTokenId } : {}),
    ...(ensParent ? { ensParent } : {}),
  };
}
