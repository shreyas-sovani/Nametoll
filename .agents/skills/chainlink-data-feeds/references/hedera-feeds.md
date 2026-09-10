# Hedera Chainlink Feed Sources

Concrete aggregator addresses are **project-specific**. Prefer the consuming repo’s `HelperConfig` / `AGENTS.md` (or equivalent) over hardcoding values from this skill.

Always re-check provider docs before mainnet use — addresses can change.

## Chain IDs

| Network | Chain ID |
| ------- | -------- |
| Hedera mainnet | `295` |
| Hedera testnet | `296` |

## Where To Look

| What you need | Docs |
| ------------- | ---- |
| AggregatorV3 feed addresses per pair | [Hedera price feeds](https://docs.chain.link/data-feeds/price-feeds/addresses?network=hedera) |
| Data Feeds overview | [Chainlink Data Feeds](https://docs.chain.link/data-feeds) |

## Hedera-Specific Notes

- Do **not** reuse Ethereum mainnet feed addresses on Hedera.
- Confirm the quote asset (`USD` vs others) matches the pair key you hash or store.
- This skill is **Data Feeds only**. For cross-chain tokens/messages see Chainlink CCIP (a separate cross-chain skill), not this feed reader.
