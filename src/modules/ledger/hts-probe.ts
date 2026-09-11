/** Circle USDC on Hedera testnet, from the official `@x402/hedera` README. */
export const CIRCLE_USDC_TESTNET = "0.0.429274";

export type FacilitatorKinds = {
  hederaExact: boolean;
  feePayer?: string;
  advertisedAssets: string[];
};

export type HtsProbeVerdict = {
  blocky402Hts: "unadvertised" | "accepted" | "rejected";
  keepHbarSnapshot: true;
};

export function readFacilitatorKinds(body: unknown): FacilitatorKinds {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const kinds = Array.isArray(record.kinds) ? record.kinds : [];
  const signers =
    record.signers && typeof record.signers === "object"
      ? (record.signers as Record<string, unknown>)
      : {};
  let hederaExact = false;
  let feePayer: string | undefined;
  const advertisedAssets: string[] = [];

  for (const kind of kinds) {
    if (!kind || typeof kind !== "object") continue;
    const row = kind as {
      scheme?: unknown;
      network?: unknown;
      extra?: { feePayer?: unknown; asset?: unknown; assets?: unknown };
      asset?: unknown;
    };
    if (row.scheme !== "exact" || typeof row.network !== "string") continue;
    if (!row.network.startsWith("hedera:")) continue;
    hederaExact = true;
    const extra = row.extra;
    if (typeof extra?.feePayer === "string") feePayer = extra.feePayer;
    pushAsset(advertisedAssets, row.asset);
    pushAsset(advertisedAssets, extra?.asset);
    if (Array.isArray(extra?.assets)) {
      for (const asset of extra.assets) pushAsset(advertisedAssets, asset);
    }
  }

  if (!feePayer) {
    const listed = signers["hedera:*"];
    if (Array.isArray(listed) && typeof listed[0] === "string") {
      feePayer = listed[0];
    }
  }

  return {
    hederaExact,
    advertisedAssets,
    ...(feePayer ? { feePayer } : {}),
  };
}

export function classifyHtsProbe(input: {
  advertisedAssets: string[];
  verifyError?: string;
  verifyOk?: boolean;
}): HtsProbeVerdict {
  if (input.verifyOk) {
    return { blocky402Hts: "accepted", keepHbarSnapshot: true };
  }
  if (input.verifyError) {
    return { blocky402Hts: "rejected", keepHbarSnapshot: true };
  }
  const advertisedHts = input.advertisedAssets.some((asset) => asset !== "0.0.0");
  return {
    blocky402Hts: advertisedHts ? "accepted" : "unadvertised",
    keepHbarSnapshot: true,
  };
}

export async function probeFacilitator(
  facilitatorUrl: string,
): Promise<FacilitatorKinds & HtsProbeVerdict> {
  const url = `${facilitatorUrl.replace(/\/+$/, "")}/supported`;
  const res = await fetch(url);
  if (!res.ok) {
    return {
      hederaExact: false,
      advertisedAssets: [],
      ...classifyHtsProbe({ advertisedAssets: [] }),
    };
  }
  const kinds = readFacilitatorKinds(await res.json());
  return { ...kinds, ...classifyHtsProbe({ advertisedAssets: kinds.advertisedAssets }) };
}

function pushAsset(into: string[], value: unknown): void {
  if (typeof value === "string" && /^0\.0\.\d+$/.test(value) && !into.includes(value)) {
    into.push(value);
  }
}
