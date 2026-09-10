# Hedera Pyth Feed Sources

Concrete Pyth contract addresses and `bytes32` price IDs are **project-specific**. Prefer the consuming repo’s `HelperConfig` / `AGENTS.md` (or equivalent) over hardcoding values from this skill.

Always re-check provider docs before mainnet use — addresses and IDs can change.

## Chain IDs

| Network | Chain ID |
| ------- | -------- |
| Hedera mainnet | `295` |
| Hedera testnet | `296` |

## Where To Look

| What you need | Docs |
| ------------- | ---- |
| Pyth contract address | [EVM contract addresses](https://docs.pyth.network/price-feeds/core/contract-addresses/evm) |
| `bytes32` price IDs | [Hermes price feeds](https://hermes.pyth.network/v2/price_feeds) |
| Update payloads | Hermes `/v2/updates/price/latest` (or the project’s documented Hermes client) |

## Hedera-Specific Notes

- Do **not** reuse Ethereum-only assumptions for the Hedera Pyth contract — confirm the Hedera row in Pyth’s EVM address list.
- Pyth is pull-based: fetch Hermes payloads and pay `getUpdateFee` before treating a price as fresh.
- Hedera `msg.value` is tinybars; size the update payment for that unit, not Ethereum-mainnet gas intuition.
