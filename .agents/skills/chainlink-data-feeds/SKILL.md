---
name: chainlink-data-feeds
description: >
  Chainlink Data Feeds on Hedera. Use when reading AggregatorV3 price feeds on Hedera
  (testnet 296 / mainnet 295), calling latestRoundData, checking round completeness and
  staleness, or normalizing feed decimals. Not for Chainlink CCIP (cross-chain tokens).
---

# Chainlink Data Feeds (Hedera)

**Push feed pattern:** a Chainlink aggregator is updated off-chain; on-chain readers call `latestRoundData()` and must reject incomplete, non-positive, or stale rounds.

```text
Chainlink DON → AggregatorV3Interface feed → consumer latestRoundData()
```

Consumers may wrap the feed behind a local interface; that is optional. Do not assume a project-specific adapter name.

## Quick Reference

| Piece | Role |
| ----- | ---- |
| `AggregatorV3Interface` | `latestRoundData()` + `decimals()` |
| Round completeness | `answeredInRound >= roundId` and `updatedAt != 0` |
| Price | `answer > 0` (feeds are typically signed `int256`) |
| Freshness | Compare `block.timestamp - updatedAt` to a max staleness |
| Scale | Normalize feed decimals to the consumer’s scale (often 18) |
| Pair identity | Prefer canonical uppercase symbols (`HBAR`, `USD`) if you hash pair keys |

**Hedera chain IDs:** testnet `296`, mainnet `295`.

See [references/hedera-feeds.md](references/hedera-feeds.md) for where to source Hedera feed addresses. See [references/examples.md](references/examples.md) for read and normalize sketches.

## Critical: Completeness Then Staleness

Never return a price from a missing or unfinished round. Revert when:

| Condition | Why |
| --------- | --- |
| `answeredInRound < roundId` | Aggregator has not finished this round |
| `updatedAt == 0` | No successful update |
| `answer <= 0` | Invalid / non-positive price |
| `block.timestamp - updatedAt > maxStaleness` | Stale for this consumer |

```solidity
(uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) =
    feed.latestRoundData();

if (answeredInRound < roundId || updatedAt == 0) revert IncompleteRound();
if (answer <= 0) revert InvalidPrice();
if (block.timestamp - updatedAt > maxStaleness) revert StalePrice(updatedAt, maxStaleness);
```

## Critical: Hedera Feeds, Not Ethereum Addresses

Do **not** copy Ethereum mainnet aggregator addresses onto Hedera. Look up Hedera-specific Data Feed addresses for chain `295` / `296` and re-check docs before mainnet.

Pair maps (if you use them) should be constructor-only unless the project explicitly supports post-deploy updates.

## Decimal Normalization

`feed.decimals()` is often 8. Convert to the scale your app uses before arithmetic:

```solidity
uint256 price = normalizeToScale(uint256(answer), feed.decimals(), /* target */ 18);
```

Keep conversion rounding explicit (usually round down). Do not mix raw aggregator units with 18-decimal amounts.

## Checklist

When implementing or reviewing Chainlink reads on Hedera:

- [ ] Feed address taken from Hedera Data Feeds docs (not Ethereum)
- [ ] `latestRoundData` completeness checks before using `answer`
- [ ] Non-positive prices revert
- [ ] Staleness bound is enforced
- [ ] Decimals normalized to the consumer scale
- [ ] Chain ID is `295` or `296` (or the project’s documented Hedera network)

## References

- [references/examples.md](references/examples.md) — `latestRoundData` and normalize sketches
- [references/hedera-feeds.md](references/hedera-feeds.md) — where to source Hedera aggregator addresses
- [Chainlink Data Feeds](https://docs.chain.link/data-feeds)
- [Hedera price feed addresses](https://docs.chain.link/data-feeds/price-feeds/addresses?network=hedera)
