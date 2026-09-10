export function hashscanTransactionUrl(
  transactionId: string,
  network: "testnet" | "mainnet" = "testnet",
): string {
  if (!transactionId.includes("@")) {
    throw new Error(`Not a Hedera transaction id: ${transactionId}`);
  }
  return `https://hashscan.io/${network}/tx/${transactionId}`;
}
