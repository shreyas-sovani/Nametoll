# Hedera CCIP Conventions

Concrete router / RMN / TokenAdminRegistry addresses and selector tables are **project-specific**. Prefer the consuming repo’s `HelperConfig` / `AGENTS.md` (or equivalent). Re-check the [CCIP directory](https://docs.chain.link/ccip/directory) before mainnet.

## Chain IDs vs CCIP selectors

| Network (example) | EVM chain ID | CCIP chain selector |
| ----------------- | ------------ | ------------------- |
| Hedera testnet | `296` | directory / project `HelperConfig` |
| Ethereum Sepolia | `11155111` | directory / project `HelperConfig` |

Use **selectors** in `ccipSend`, `getFee`, and `applyChainUpdates` — not EVM chain IDs, Axelar name strings, or LayerZero EIDs.

Hedera testnet has used selector `222782988166878823` in educational templates; still re-check the directory before relying on it.

## What To Look Up Per Chain

| Role | Used for |
| ---- | -------- |
| Router | `getFee` / `ccipSend` |
| RMN proxy | Token pool constructor |
| TokenAdminRegistry | `acceptAdminRole` / `setPool` |
| RegistryModuleOwnerCustom | `registerAdminViaGetCCIPAdmin` |
| Chain selector | Lane config + send |

Hedera testnet directory: [hedera-testnet](https://docs.chain.link/ccip/directory/testnet/chain/hedera-testnet).

## Hedera-specific knobs

| Item | Note |
| ---- | ---- |
| HTS precompile | `0x167` |
| HTS create deploy value | Native value on wrapper deploy |
| Registered token | Wrapper address for HTS-backed CCT |
| User token | Native HTS (`htsTokenAddress`) |
| Amounts | Must fit `int64` for HTS mint/burn/transfer |
| Associate | Pool + user accounts before HTS transfers |

## Packages

```text
@chainlink/contracts-ccip
```

Common imports:

- `ccip/interfaces/IRouterClient.sol`
- `ccip/libraries/Client.sol`
- `ccip/pools/BurnMintTokenPool.sol`
- `ccip/tokenAdminRegistry/TokenAdminRegistry.sol`
- `ccip/tokenAdminRegistry/RegistryModuleOwnerCustom.sol`
- `shared/token/ERC20/BurnMintERC20.sol`

## Ops

- Track messages on [CCIP Explorer](https://ccip.chain.link)
- Do not reuse Axelar or LayerZero token/pool addresses in CCIP config
- Rate limiters may be disabled for educational lanes; enable them for production
