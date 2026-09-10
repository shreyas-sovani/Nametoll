# Common Subgraph Errors & Troubleshooting

Guide to diagnosing and fixing common subgraph issues.

## Build Errors

### "Cannot find module" / Import Errors

**Error:**
```
ERROR TS2307: Cannot find module '../generated/schema'
```

**Cause:** Types not generated or outdated.

**Fix:**
```bash
graph codegen
```

---

### "Type mismatch" in Schema

**Error:**
```
ERROR TS2322: Type 'string' is not assignable to type 'Bytes'
```

**Cause:** Wrong type assignment in mapping.

**Fix:**
```typescript
// BAD
entity.address = "0x1234..."

// GOOD
entity.address = Bytes.fromHexString("0x1234...")
// Or from event
entity.address = event.params.user
```

---

### "Entity field not found"

**Error:**
```
ERROR TS2339: Property 'newField' does not exist on type 'Token'
```

**Cause:** Schema changed but types not regenerated.

**Fix:**
```bash
graph codegen
```

---

## Deployment Errors

### "Network not supported"

**Error:**
```
✖ Failed to deploy: Network 'xyz' is not supported
```

**Fix:** Check [supported networks](https://thegraph.com/docs/en/supported-networks/) and verify network name in manifest matches exactly.

---

### "Start block is in the future"

**Error:**
```
✖ Start block 99999999 is after the current block
```

**Fix:** Use a valid historical block number. Check block explorers for contract deployment block.

---

### "ABI mismatch"

**Error:**
```
✖ Event signature not found in ABI
```

**Cause:** Event signature in manifest doesn't match ABI.

**Fix:** Verify event signature matches ABI exactly:
```yaml
# Check indexed parameters
event: Transfer(indexed address,indexed address,uint256)  # Correct
event: Transfer(address,address,uint256)                   # Wrong - missing indexed
```

---

## Indexing Errors

### "Subgraph failed with error"

**Error in logs:**
```
ERRO Failed to process block, error: ...
```

**Common causes:**

1. **Null pointer:** Accessing `.load()` result without null check
2. **Division by zero:** Dividing without checking denominator
3. **Integer overflow:** BigInt operations exceeding bounds
4. **Contract call revert:** eth_call failed

---

### "Entity was not found" / Null Reference

**Error:**
```
wasm trap: unreachable
```

**Cause:** Accessing entity that doesn't exist.

**Bad:**
```typescript
let token = Token.load(address)!  // Crashes if null
token.name = "Test"
```

**Good:**
```typescript
let token = Token.load(address)
if (token == null) {
  token = new Token(address)
  // Initialize ALL required fields
  token.name = ""
  token.symbol = ""
  token.decimals = 0
  token.totalSupply = BigInt.zero()
}
token.name = "Test"
token.save()
```

---

### "Store error: conflicting entities"

**Error:**
```
Store error: Conflicting key for entity Token
```

**Cause:** Same entity ID used for different entity types, or race condition.

**Fix:** Ensure unique IDs across entity types:
```typescript
// BAD - same ID format for different entities
let tokenId = address
let balanceId = address  // Conflict!

// GOOD - include type prefix or use composite keys
let tokenId = address
let balanceId = address.concat(holder)
```

---

### "Mapping aborted" / Determinism Error

**Error:**
```
Mapping aborted: Mapping raised a non-deterministic error
```

**Causes:**
- Using `block.timestamp` in ways that vary by indexer
- Contract calls that can return different results
- Random/non-deterministic operations

**Fix:** Ensure all operations are deterministic. Use values from events, not contract state when possible.

---

## Contract Call Errors

### "eth_call failed"

**Error:**
```
eth_call failed: execution reverted
```

**Cause:** Contract call reverted (function doesn't exist, invalid state, etc.)

**Fix:** Use `try_` methods:
```typescript
// BAD - crashes on revert
let name = contract.name()

// GOOD - handles revert
let nameResult = contract.try_name()
if (nameResult.reverted) {
  entity.name = "Unknown"
} else {
  entity.name = nameResult.value
}
```

---

### "Contract call timeout"

**Cause:** Too many eth_calls, slow RPC.

**Fixes:**
1. Declare eth_calls in manifest for parallel execution
2. Cache contract data on first interaction
3. Emit needed data in events instead

```yaml
# Declare calls for parallel execution
eventHandlers:
  - event: Transfer(indexed address,indexed address,uint256)
    handler: handleTransfer
    calls:
      name: ERC20[event.address].name()
      symbol: ERC20[event.address].symbol()
```

---

## Data Issues

### Missing Events

**Symptom:** Some transfers/events not indexed.

**Causes:**
1. Wrong start block (too late)
2. Event signature mismatch
3. Contract proxy pattern not handled

**Fixes:**
```yaml
# Use deployment block
source:
  address: "0x..."
  startBlock: 12345678  # Contract deployment block

# Handle proxies with templates
templates:
  - kind: ethereum/contract
    name: TokenProxy
```

---

### Stale/Overwritten Data

**Symptom:** Entity updates disappearing.

**Cause:** Loading entity, calling helper that modifies same entity, then saving stale version.

**Bad:**
```typescript
let token = Token.load(address)!
updateMetrics(address)  // This saves token
token.lastUpdate = timestamp
token.save()  // Overwrites helper's changes!
```

**Good:**
```typescript
updateMetrics(address)
let token = Token.load(address)!  // Reload after helper
token.lastUpdate = timestamp
token.save()
```

---

### Incorrect Decimal Handling

**Symptom:** Amounts showing wrong (too large/small).

**Cause:** Not accounting for token decimals.

**Fix:**
```typescript
function toDecimal(amount: BigInt, decimals: i32): BigDecimal {
  let divisor = BigInt.fromI32(10).pow(decimals as u8).toBigDecimal()
  return amount.toBigDecimal().div(divisor)
}

// Usage
let decimals = token.decimals
let amountDecimal = toDecimal(event.params.amount, decimals)
```

---

## Performance Issues

### Slow Indexing

**Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| Too many eth_calls | Declare in manifest, cache data |
| Large arrays on entities | Use @derivedFrom |
| String IDs | Use Bytes IDs |
| Complex calculations in handlers | Pre-compute, use aggregations |
| No pruning | Enable `indexerHints.prune: auto` |

---

### Query Timeout

**Causes:**
- Querying large arrays
- Complex nested queries
- No pagination

**Fixes:**
```graphql
# BAD - loads all swaps
{
  pool(id: "0x...") {
    swaps {  # Could be millions!
      id
    }
  }
}

# GOOD - paginated
{
  swaps(
    where: { pool: "0x..." }
    first: 100
    skip: 0
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
  }
}
```

---

## Grafting Errors

### "Cannot graft: block pruned"

**Cause:** Trying to graft from a block that was pruned.

**Fix:** Use a more recent block, or set `prune: never` on source subgraph.

---

### "Schema mismatch after graft"

**Cause:** Changed existing entity fields (not just adding new ones).

**Fix:** Grafting only supports additive changes. For breaking changes, re-index from genesis.

---

## Debugging Tips

### Enable Logging

```typescript
import { log } from "@graphprotocol/graph-ts"

export function handleTransfer(event: Transfer): void {
  log.info("Transfer from {} to {} amount {}", [
    event.params.from.toHexString(),
    event.params.to.toHexString(),
    event.params.value.toString()
  ])

  // For debugging (shows in indexer logs)
  log.warning("Potential issue: {}", [message])
  log.error("Error occurred: {}", [error])
}
```

### Check Indexing Status

```graphql
{
  _meta {
    block {
      number
      hash
    }
    deployment
    hasIndexingErrors
  }
}
```

### View Indexing Errors

```graphql
{
  indexingStatuses(subgraphs: ["QmYourSubgraphId"]) {
    subgraph
    synced
    health
    fatalError {
      message
      block {
        number
        hash
      }
      handler
    }
    nonFatalErrors {
      message
      block {
        number
      }
    }
  }
}
```

---

## Quick Reference

| Error Type | First Check |
|------------|-------------|
| Build fails | Run `graph codegen` |
| Deploy fails | Verify network, start block, ABI |
| Indexing crashes | Check for null loads, division by zero |
| Missing data | Verify start block, event signatures |
| Slow indexing | Reduce eth_calls, use @derivedFrom |
| Query timeout | Add pagination, avoid large arrays |
