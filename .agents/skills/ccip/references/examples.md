# CCIP Examples

Generic burn-and-mint CCT sketches for Hedera↔EVM. Prefer a concrete project template for full deploy-script copy-paste.

## Register token + pool (per chain)

```solidity
// 1–2. Deploy BurnMintERC20 + BurnMintTokenPool (router + rmnProxy from CCIP directory)
token.grantMintAndBurnRoles(pool);

RegistryModuleOwnerCustom(registryModuleOwnerCustom).registerAdminViaGetCCIPAdmin(token);
TokenAdminRegistry(tokenAdminRegistry).acceptAdminRole(token);
TokenAdminRegistry(tokenAdminRegistry).setPool(token, pool);
```

On Hedera HTS-backed deploys, `token` is the **wrapper**. After pool deploy, associate the pool with the native HTS token and approve the wrapper (pool `initializeHtsPool` or equivalent).

## Wire a remote lane

```solidity
bytes[] memory remotePoolAddresses = new bytes[](1);
remotePoolAddresses[0] = abi.encode(remotePool);

TokenPool.ChainUpdate[] memory updates = new TokenPool.ChainUpdate[](1);
updates[0] = TokenPool.ChainUpdate({
    remoteChainSelector: remoteChainSelector,
    remotePoolAddresses: remotePoolAddresses,
    remoteTokenAddress: abi.encode(remoteToken),
    outboundRateLimiterConfig: RateLimiter.Config({ isEnabled: false, capacity: 0, rate: 0 }),
    inboundRateLimiterConfig: RateLimiter.Config({ isEnabled: false, capacity: 0, rate: 0 })
});

TokenPool(localPool).applyChainUpdates(new uint64[](0), updates);
```

Run this on **both** chains with the other side’s selector / pool / token.

## ccipSend (native fee)

```solidity
Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
tokenAmounts[0] = Client.EVMTokenAmount({ token: tokenToSend, amount: amountToSend });

Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
    receiver: abi.encode(receiver),
    data: "",
    tokenAmounts: tokenAmounts,
    feeToken: address(0),
    extraArgs: Client._argsToBytes(
        Client.EVMExtraArgsV2({ gasLimit: 0, allowOutOfOrderExecution: true })
    )
});

uint256 fee = IRouterClient(router).getFee(destinationChainSelector, message);
IERC20(tokenToSend).approve(router, amountToSend);
bytes32 messageId = IRouterClient(router).ccipSend{ value: fee }(destinationChainSelector, message);
```

`tokenToSend` is the CCIP-registered ERC-20 (wrapper on HTS-backed Hedera).

## Hedera HTS dual approve (Hedera → remote)

```solidity
// 1. Native HTS → wrapper
IERC20(htsNativeToken).approve(wrapper, amount);
// 2. Wrapper → CCIP Router
IERC20(wrapper).approve(router, amount);
```

Associate the recipient with the native HTS token before the first inbound mint.

## Deploy order (generic)

```text
1. Deploy token + pool on chain A; grant mint/burn; register admin; setPool
2. Deploy token + pool on chain B; same registry steps
   (Hedera HTS: create wrapper with native value for HTS create; init pool associate/approve)
3. applyChainUpdates A → B and B → A
4. Associate Hedera accounts with native HTS if using the HTS path
5. Send a small amount; track messageId on CCIP Explorer
```
