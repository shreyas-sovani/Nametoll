export type MerchandiseSnapshot = {
  ok: true;
  stub: true;
  units: number;
};

export type Merchandise = {
  snapshot(protocolCount: number): Promise<MerchandiseSnapshot>;
};

export function createMerchandise(): Merchandise {
  return {
    async snapshot(protocolCount) {
      return { ok: true, stub: true, units: protocolCount };
    },
  };
}
