import type { Network } from "@x402/core/types";

export const HEDERA_TESTNET = "hedera:testnet" satisfies Network;
export const HBAR_ASSET = "0.0.0";
export const DEFAULT_FACILITATOR_URL = "https://api.testnet.blocky402.com";
export const DEFAULT_PRICE_TINYBARS = "100000";

export type SecretsPaths = {
  buyerKeyPath?: string;
  creSecretsPath?: string;
};

export type AppConfig = {
  port: number;
  network: Network;
  facilitatorUrl: string;
  sellerAccountId?: string;
  publicDeskUrl?: string;
  secretsPaths: SecretsPaths;
  priceTinybars: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (env.FACILITATOR_PRIVATE_KEY) {
    throw new Error(
      "Resource server must not hold a facilitator private key. Unset FACILITATOR_PRIVATE_KEY.",
    );
  }

  return {
    port: Number.parseInt(env.PORT ?? "8787", 10),
    network: (env.X402_NETWORK as Network | undefined) ?? HEDERA_TESTNET,
    facilitatorUrl: env.FACILITATOR_URL ?? DEFAULT_FACILITATOR_URL,
    ...(env.HEDERA_SELLER_ACCOUNT_ID
      ? { sellerAccountId: env.HEDERA_SELLER_ACCOUNT_ID }
      : {}),
    ...(env.PUBLIC_DESK_URL ? { publicDeskUrl: env.PUBLIC_DESK_URL } : {}),
    secretsPaths: {
      ...(env.HEDERA_BUYER_KEY_PATH
        ? { buyerKeyPath: env.HEDERA_BUYER_KEY_PATH }
        : {}),
      ...(env.CRE_SECRETS_PATH ? { creSecretsPath: env.CRE_SECRETS_PATH } : {}),
    },
    priceTinybars: env.PRICE_TINYBARS ?? DEFAULT_PRICE_TINYBARS,
  };
}
