export type BuyerTarget =
  | { kind: "name"; value: string }
  | { kind: "url"; value: string };

export function isDeskUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function buyerTargetFromArgv(argv: string[]): BuyerTarget | undefined {
  const raw = argv[2]?.trim();
  if (!raw) return undefined;
  if (isDeskUrl(raw)) return { kind: "url", value: raw };
  return { kind: "name", value: raw };
}
