# Hedera Supra Feed Sources

Concrete push-oracle addresses and numeric pair IDs are **project-specific**. Prefer the consuming repo’s `HelperConfig` / `AGENTS.md` (or equivalent) over hardcoding values from this skill.

Always re-check provider docs before mainnet use — addresses and IDs can change.

## Chain IDs

| Network | Chain ID |
| ------- | -------- |
| Hedera mainnet | `295` |
| Hedera testnet | `296` |

## Where To Look

| What you need | Docs |
| ------------- | ---- |
| Push-oracle contract address | [Push oracle networks](https://docs.supra.com/oracles/data-feeds/push-oracle/networks) |
| Numeric pair IDs | [Data feeds index](https://docs.supra.com/oracles/data-feeds/data-feeds-index) |

## Hedera-Specific Notes

- Do **not** reuse Ethereum mainnet oracle addresses or pair IDs blindly — confirm the Hedera network row.
- Hedera listings currently expose **USDT** pairs more often than USD. Hash or store pair keys with `USDT` when that is what the feed quotes.
- Timestamps may be milliseconds; convert to unix seconds before comparing to `block.timestamp`.
