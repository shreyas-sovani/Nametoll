import { decodePaymentRequiredHeader } from "@x402/core/http";
import { SNAPSHOT_PATH } from "../gate/index.ts";

export type SnapshotChallenge = {
  status: number;
  amount?: string;
  asset?: string;
  payTo?: string;
  scheme?: string;
  network?: string;
};

export async function fetchSnapshotChallenge(
  deskUrl: string,
  protocols?: string[],
): Promise<SnapshotChallenge> {
  const url = new URL(SNAPSHOT_PATH, `${deskUrl.replace(/\/+$/, "")}/`);
  if (protocols?.length) {
    url.searchParams.set("protocols", protocols.join(","));
  }
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "ngrok-skip-browser-warning": "1",
    },
  });
  const header = response.headers.get("payment-required");
  if (response.status !== 402 || !header) {
    return { status: response.status };
  }
  const offer = firstOffer(decodePaymentRequiredHeader(header));
  return {
    status: 402,
    ...(typeof offer?.amount === "string" ? { amount: offer.amount } : {}),
    ...(typeof offer?.asset === "string" ? { asset: offer.asset } : {}),
    ...(typeof offer?.payTo === "string" ? { payTo: offer.payTo } : {}),
    ...(typeof offer?.scheme === "string" ? { scheme: offer.scheme } : {}),
    ...(typeof offer?.network === "string" ? { network: offer.network } : {}),
  };
}

function firstOffer(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as Record<string, unknown>;
  const accepts = record.accepts ?? record.accepted;
  if (Array.isArray(accepts)) {
    const row = accepts.find((item) => item && typeof item === "object");
    return row as Record<string, unknown> | undefined;
  }
  if (accepts && typeof accepts === "object") {
    return accepts as Record<string, unknown>;
  }
  return undefined;
}
