# Supra Push Oracle Examples

Generic S-Value read patterns for Hedera. Prefer a concrete project template for full adapter copy-paste.

## getSvalue sketch

```solidity
ISupraSValueFeed.PriceFeed memory pf = SUPRA_ORACLE.getSvalue(pairId);
if (pf.time == 0) revert IncompleteRound();
if (pf.price == 0) revert InvalidPrice();

uint256 updatedAt = pf.time > 10_000_000_000 ? pf.time / 1_000 : pf.time;
if (block.timestamp - updatedAt > maxStaleness) {
    revert StalePrice(updatedAt, maxStaleness);
}

uint256 priceE18 = normalizeToE18(pf.price, uint8(pf.decimals));
```

## Decimal normalization

```solidity
function normalizeToE18(uint256 amount, uint8 decimals) pure returns (uint256) {
    if (decimals == 18) return amount;
    if (decimals < 18) return amount * (10 ** (18 - decimals));
    return amount / (10 ** (decimals - 18));
}
```

## Optional pair map

Constructor-only `pairKey → supraPairId` plus an immutable push-oracle address is a common multi-pair shape:

```solidity
bytes32 key = keccak256(abi.encode("HBAR", "USDT")); // USDT, not USD, on many Hedera feeds
```

Unsupported pairs should revert rather than returning zero.

## Optional local consumer interface

A consumer may depend on a project-local `latestPrice(pairKey)` (or similar) instead of calling Supra directly. That wrapper is optional and project-specific.
