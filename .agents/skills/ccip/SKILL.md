---
name: ccip
description: >
  Chainlink CCIP Cross-Chain Tokens on Hedera. Use when bridging burn-and-mint CCT between
  Hedera and EVM, registering TokenAdminRegistry / pools, calling ccipSend with chain
  selectors, or wiring HTS-backed wrappers (HtsBurnMintERC20) vs vanilla BurnMintERC20.
  Not for Chainlink Data Feeds / price oracles.
---

# Chainlink CCIP (Hedera)

**CCT burn-and-mint pattern:** deploy a burn-mint token + token pool on each chain, register the token with CCIP, wire remote pools with **chain selectors**, then `ccipSend` paying native fees.

```text
BurnMint token + TokenPool (source)
        → Router.ccipSend(destSelector, message)
             → TokenPool lockOrBurn / releaseOrMint (dest)
```

On Hedera you can use a vanilla ERC-20 CCT **or** an HTS-backed wrapper. CCIP always registers the ERC-20 the pool sees — for HTS that is the **wrapper**, while users hold the native HTS token.

This skill is **cross-chain tokens/messages**, not Chainlink Data Feeds.

## Quick Reference

| Piece | Role |
| ----- | ---- |
| Router | `getFee` + `ccipSend{value}` |
| Chain selector | `uint64` CCIP id — **not** EVM chain ID |
| Token + pool | Burn-mint ERC-20 + `BurnMintTokenPool` (or Hedera HTS variants) |
| Admin registry | `RegistryModuleOwnerCustom` → `TokenAdminRegistry.acceptAdminRole` → `setPool` |
| Lane config | `TokenPool.applyChainUpdates` both directions |
| Fee | Native gas (`feeToken = address(0)`); attach `msg.value` |
| Receiver | `abi.encode(address)` in `EVM2AnyMessage.receiver` |

See [references/hedera-ccip.md](references/hedera-ccip.md) for where to source selectors and registry addresses. See [references/examples.md](references/examples.md) for register / wire / send sketches.

## Critical: Selectors, Not Chain IDs

`ccipSend` and pool `remoteChainSelector` take CCIP **chain selectors**. Hedera testnet (`296`) and Sepolia (`11155111`) have different selector values than their EVM chain IDs. Look them up in the CCIP directory; do not pass `296` as a selector.

Do not reuse Axelar GMP names or LayerZero EIDs here.

## Critical: Register Then Wire Both Lanes

Incomplete registry/pool config bricks the token. Per chain:

1. Deploy token + pool
2. Grant the pool mint/burn roles on the token
3. `registerAdminViaGetCCIPAdmin(token)` then `acceptAdminRole(token)`
4. `TokenAdminRegistry.setPool(token, pool)`
5. After **both** chains have token+pool addresses: `applyChainUpdates` on each pool (remote selector, remote pool, remote token)

Then send a small test amount and track it on CCIP Explorer.

## Critical: Hedera HTS-Backed CCT

Vanilla path: `BurnMintERC20` + `BurnMintTokenPool` on Hedera EVM, same as Sepolia.

HTS-backed path:

- Users hold a native HTS token created via precompile `0x167`
- CCIP registers the **wrapper** (`HtsBurnMintERC20`), not the HTS token id/address users see in wallets
- Pool (`HtsBurnMintTokenPool`) must associate itself with the native HTS token and approve the wrapper
- Hedera → remote send needs **two approvals**: HTS → wrapper, wrapper → Router
- Receiver accounts must **associate** the native HTS token before inbound mints
- Mint/burn/transfer amounts must fit HTS `int64`

Do not mix Axelar or LayerZero token addresses into CCIP env/config.

## Send Flow (native fee)

```solidity
Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
    receiver: abi.encode(receiver),
    data: "",
    tokenAmounts: tokenAmounts, // token is the CCIP-registered ERC-20 / wrapper
    feeToken: address(0),
    extraArgs: Client._argsToBytes(
        Client.EVMExtraArgsV2({ gasLimit: 0, allowOutOfOrderExecution: true })
    )
});

uint256 fee = IRouterClient(router).getFee(destinationChainSelector, message);
IERC20(tokenToSend).approve(router, amount);
IRouterClient(router).ccipSend{ value: fee }(destinationChainSelector, message);
```

## Checklist

- [ ] Chain selectors from the CCIP directory (not EVM chain IDs, Axelar names, or LZ EIDs)
- [ ] Token admin registered and pool set on **both** chains
- [ ] `applyChainUpdates` wired both directions before sending
- [ ] Native fee attached to `ccipSend` (`feeToken = address(0)`)
- [ ] HTS path: wrapper registered with CCIP; users hold native HTS; dual approve + associate
- [ ] Amounts fit `int64` when touching HTS mint/burn
- [ ] CCIP token/pool addresses not copied from Axelar/LayerZero configs

## References

- [references/examples.md](references/examples.md) — register, wire, send, HTS dual-approve sketches
- [references/hedera-ccip.md](references/hedera-ccip.md) — selectors vs chain IDs, where to source router/registry
- [CCIP directory](https://docs.chain.link/ccip/directory)
- [CCIP burn-and-mint CCT](https://docs.chain.link/ccip/tutorials/evm/cross-chain-tokens/register-from-eoa-burn-mint-hardhat)
- [CCIP Explorer](https://ccip.chain.link)
