# Pyth Price Feed Examples

Generic pull-oracle update/read patterns for Hedera. Prefer a concrete project template for full adapter copy-paste.

## Update then read

```solidity
function updatePrice(bytes[] calldata updateData) external payable {
    uint256 fee = PYTH.getUpdateFee(updateData);
    if (msg.value < fee) revert UpdateFeeTooLow(msg.value, fee);
    PYTH.updatePriceFeeds{ value: msg.value }(updateData);
}

PythStructs.Price memory price = PYTH.getPriceNoOlderThan(priceId, maxStaleness);
if (price.publishTime == 0) revert IncompleteRound();
if (price.price <= 0) revert InvalidPrice();
if (price.conf > uint64(price.price)) revert InvalidConfidence();
```

Fetch `updateData` from Hermes off-chain, then broadcast the payable update in the same flow as the read when the on-chain price is stale.

## Expo normalization (signed)

```solidity
function normalizePythToE18(int64 price, int32 expo) pure returns (uint256) {
    uint256 positive = uint64(price);
    if (expo >= 0) {
        return positive * (10 ** (18 + uint32(expo)));
    }
    uint256 mag = uint256(-int256(expo));
    if (mag <= 18) return positive * (10 ** (18 - mag));
    return positive / (10 ** (mag - 18));
}
```

Only call this after `price > 0`.

## Optional pair map

Constructor-only `pairKey → bytes32 priceId` plus an immutable Pyth contract is a common multi-pair shape:

```solidity
bytes32 key = keccak256(abi.encode("HBAR", "USD"));
```

Unsupported pairs should revert rather than returning zero.

## Optional local consumer interface

A consumer may depend on a project-local `latestPrice(pairKey)` (or similar) instead of calling Pyth directly. That wrapper is optional and project-specific. Pull updates still belong with the Pyth integration, not with a view-only consumer.
