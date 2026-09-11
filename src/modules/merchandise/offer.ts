import { HBAR_ASSET, type AppConfig } from "../../config.ts";
import { PINNED_PROTOCOLS } from "./deployments.ts";

export const OFFER_PATH = "/desk/offer";

export type DeskOffer = {
  asset: typeof HBAR_ASSET;
  priceTinybars: string;
  priceRule: string;
  protocols: string[];
};

export function deskOffer(config: AppConfig): DeskOffer {
  return {
    asset: HBAR_ASSET,
    priceTinybars: config.priceTinybars,
    priceRule: `${config.priceTinybars} tinybars per protocol`,
    protocols: PINNED_PROTOCOLS.map((protocol) => protocol.id),
  };
}
