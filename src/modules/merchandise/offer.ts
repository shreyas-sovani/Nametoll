import { HBAR_ASSET, type AppConfig } from "../../config.ts";
import { MAX_SCHEDULE_SECONDS } from "../ledger/subscribe.ts";
import { PINNED_PROTOCOLS } from "./deployments.ts";

export const OFFER_PATH = "/desk/offer";

export type DeskOffer = {
  asset: typeof HBAR_ASSET;
  priceTinybars: string;
  priceRule: string;
  protocols: string[];
  subscription: {
    waitForExpiry: true;
    maxExpirySeconds: number;
  };
  htsTokenId?: string;
};

export function deskOffer(config: AppConfig): DeskOffer {
  return {
    asset: HBAR_ASSET,
    priceTinybars: config.priceTinybars,
    priceRule: `${config.priceTinybars} tinybars per protocol`,
    protocols: PINNED_PROTOCOLS.map((protocol) => protocol.id),
    subscription: {
      waitForExpiry: true,
      maxExpirySeconds: MAX_SCHEDULE_SECONDS,
    },
    ...(config.htsTokenId ? { htsTokenId: config.htsTokenId } : {}),
  };
}
