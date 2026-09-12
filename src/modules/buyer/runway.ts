export const DEFAULT_GUEST_FAUCET_TINYBARS = "5000000";
export const DEFAULT_GUEST_FAUCET_FLOOR_TINYBARS = "500000000";
export const DEFAULT_GUEST_MAX_ACTIVE = 16;
export const FAUCET_CLOSED_MESSAGE =
  "faucet closed for this session — use operator pay";
export const GUEST_CAP_MESSAGE = "Guest faucet is at capacity. Use operator pay.";

export class FaucetClosedError extends Error {
  readonly status = 503;
  constructor(message = FAUCET_CLOSED_MESSAGE) {
    super(message);
    this.name = "FaucetClosedError";
  }
}

export type SellerBalanceReader = (accountId: string) => Promise<string | undefined>;

export function assertFaucetRunway(
  sellerTinybars: string,
  floorTinybars: string,
): void {
  if (BigInt(sellerTinybars) < BigInt(floorTinybars)) {
    throw new FaucetClosedError();
  }
}

export function assertGuestCapacity(active: number, maxActive: number): void {
  if (active >= maxActive) {
    throw new FaucetClosedError(GUEST_CAP_MESSAGE);
  }
}

export async function readSellerTinybars(
  mirrorNodeUrl: string,
  accountId: string,
): Promise<string | undefined> {
  const url = `${mirrorNodeUrl.replace(/\/+$/, "")}/api/v1/accounts/${accountId}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
  if (!res.ok) return undefined;
  const body = (await res.json()) as { balance?: { balance?: number | string } };
  const raw = body.balance?.balance;
  if (raw === undefined || raw === null) return undefined;
  return String(raw);
}

export type DeskRunway = {
  faucetTinybars: string;
  faucetFloorTinybars: string;
  faucetOpen: boolean;
  activeGuests: number;
  guestMaxActive: number;
  sellerAccountId?: string;
  sellerTinybars?: string;
};

export function deskRunway(input: {
  faucetTinybars: string;
  faucetFloorTinybars: string;
  guestMaxActive: number;
  activeGuests: number;
  sellerAccountId?: string;
  sellerTinybars?: string;
}): DeskRunway {
  const faucetOpen =
    input.sellerTinybars !== undefined &&
    BigInt(input.sellerTinybars) >= BigInt(input.faucetFloorTinybars) &&
    input.activeGuests < input.guestMaxActive;
  return {
    faucetTinybars: input.faucetTinybars,
    faucetFloorTinybars: input.faucetFloorTinybars,
    faucetOpen,
    activeGuests: input.activeGuests,
    guestMaxActive: input.guestMaxActive,
    ...(input.sellerAccountId ? { sellerAccountId: input.sellerAccountId } : {}),
    ...(input.sellerTinybars !== undefined ? { sellerTinybars: input.sellerTinybars } : {}),
  };
}
