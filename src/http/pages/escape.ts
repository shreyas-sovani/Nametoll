export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function tinybarsToHbar(tinybars: string): string {
  try {
    const value = Number(BigInt(tinybars)) / 100_000_000;
    return `${value} HBAR`;
  } catch {
    return "";
  }
}
