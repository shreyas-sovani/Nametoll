export type PayWindow = {
  count(now?: number): number;
  record(now?: number): void;
};

export function createPayWindow(windowMs = 3_600_000): PayWindow {
  const stamps: number[] = [];

  function prune(now: number): void {
    const cutoff = now - windowMs;
    while (stamps.length && stamps[0]! <= cutoff) stamps.shift();
  }

  return {
    count(now = Date.now()) {
      prune(now);
      return stamps.length;
    },
    record(now = Date.now()) {
      prune(now);
      stamps.push(now);
    },
  };
}
