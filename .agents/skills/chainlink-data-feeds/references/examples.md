# Chainlink Data Feed Examples

Generic AggregatorV3 read patterns for Hedera. Prefer a concrete project template for full adapter copy-paste.

## latestRoundData sketch

```solidity
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

(uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) =
    feed.latestRoundData();

if (answeredInRound < roundId || updatedAt == 0) revert IncompleteRound();
if (answer <= 0) revert InvalidPrice();
if (block.timestamp - updatedAt > maxStaleness) {
    revert StalePrice(updatedAt, maxStaleness);
}
```

## Decimal normalization

```solidity
function normalizeToE18(uint256 amount, uint8 decimals) pure returns (uint256) {
    if (decimals == 18) return amount;
    if (decimals < 18) return amount * (10 ** (18 - decimals));
    return amount / (10 ** (decimals - 18));
}

uint256 priceE18 = normalizeToE18(uint256(answer), feed.decimals());
```

## Optional pair map

Constructor-only `pairKey → feed` is a common multi-pair shape. Casing is significant if you hash symbols:

```solidity
bytes32 key = keccak256(abi.encode("HBAR", "USD"));
```

Unsupported pairs should revert rather than returning zero.

## Optional local consumer interface

A consumer may depend on a project-local `latestPrice(pairKey)` (or similar) instead of calling AggregatorV3 directly. That wrapper is optional and project-specific.
