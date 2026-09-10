# Subgraph Uncrashable

Subgraph Uncrashable is a code generation tool that creates safe helper functions from your GraphQL schema, ensuring all entity interactions are safe and consistent.

## Overview

Common subgraph crashes come from:
- Loading undefined entities
- Missing field initialization
- Race conditions on entity load/save
- Forgetting to save entities

Subgraph Uncrashable generates helper functions that make these bugs impossible.

## Why Use It

| Problem | Without Uncrashable | With Uncrashable |
|---------|---------------------|------------------|
| Undefined entity | Runtime crash | Safe default returned |
| Missing field | Invalid state | Auto-initialized |
| Stale entity | Data overwrite | Atomic operations |
| Forgot to save | Silent data loss | Auto-save helpers |

## Installation & Usage

Subgraph Uncrashable integrates with Graph CLI codegen:

```bash
# Run with codegen
graph codegen --uncrashable

# Or standalone
npx subgraph-uncrashable generate
```

## Configuration

Create `uncrashable.config.json` to customize defaults and behavior:

```json
{
  "entities": {
    "Token": {
      "defaults": {
        "name": "Unknown",
        "symbol": "???",
        "decimals": 18,
        "totalSupply": "0"
      }
    },
    "Pool": {
      "defaults": {
        "reserve0": "0",
        "reserve1": "0",
        "totalSupply": "0"
      }
    }
  },
  "logging": {
    "warnOnDefault": true,
    "warnOnMissingField": true
  }
}
```

## Generated Helpers

### Safe Loaders

```typescript
// Generated: Safe loader with default creation
export function getOrCreateToken(id: Bytes): Token {
  let entity = Token.load(id)
  if (entity == null) {
    entity = new Token(id)
    entity.name = "Unknown"      // From config
    entity.symbol = "???"        // From config
    entity.decimals = 18         // From config
    entity.totalSupply = BigInt.zero()
    // Warning log recorded
  }
  return entity
}

// Usage in mapping
export function handleTransfer(event: Transfer): void {
  let token = getOrCreateToken(event.address)
  // Guaranteed non-null, all fields initialized
  token.save()
}
```

### Safe Setters

```typescript
// Generated: Atomic update helper
export function updateTokenSupply(
  id: Bytes,
  newSupply: BigInt
): Token {
  let token = getOrCreateToken(id)
  token.totalSupply = newSupply
  token.save()  // Auto-save included
  return token
}

// Usage - impossible to forget save
export function handleMint(event: Mint): void {
  updateTokenSupply(
    event.address,
    event.params.totalSupply
  )
}
```

### Grouped Setters

Define custom setter functions for related fields:

```json
{
  "entities": {
    "Pool": {
      "setters": {
        "updateReserves": ["reserve0", "reserve1", "reserveUSD"],
        "updateVolume": ["volumeToken0", "volumeToken1", "volumeUSD"]
      }
    }
  }
}
```

Generates:

```typescript
export function updatePoolReserves(
  id: Bytes,
  reserve0: BigInt,
  reserve1: BigInt,
  reserveUSD: BigDecimal
): Pool {
  let pool = getOrCreatePool(id)
  pool.reserve0 = reserve0
  pool.reserve1 = reserve1
  pool.reserveUSD = reserveUSD
  pool.save()
  return pool
}
```

## Warning Logs

When defaults are used or potential issues detected, warning logs are recorded:

```typescript
// Generated code includes logging
if (entity == null) {
  log.warning("Token {} not found, creating with defaults", [id.toHexString()])
  entity = new Token(id)
  // ... defaults
}
```

Access logs in graph-node output to identify issues:
```
WARN Token 0x1234... not found, creating with defaults
```

## Entity Types Support

Supports all GraphQL schema types:

```graphql
type Token @entity {
  id: Bytes!
  name: String!
  symbol: String!
  decimals: Int!
  totalSupply: BigInt!
  priceUSD: BigDecimal    # Optional - nullable default
  metadata: TokenMetadata # Reference - null default
}
```

Default handling by type:
| Type | Default |
|------|---------|
| `String!` | `""` or config value |
| `Int!` | `0` or config value |
| `BigInt!` | `BigInt.zero()` or config |
| `BigDecimal!` | `BigDecimal.zero()` or config |
| `Bytes!` | `Bytes.empty()` or config |
| `Boolean!` | `false` or config |
| `Optional` | `null` |
| `Reference` | `null` (must be set) |

## Best Practices

### 1. Configure Meaningful Defaults

```json
{
  "entities": {
    "Token": {
      "defaults": {
        "name": "Unknown Token",
        "symbol": "???",
        "decimals": 18
      }
    }
  }
}
```

### 2. Use Grouped Setters for Related Fields

```json
{
  "setters": {
    "updatePricing": ["priceToken0", "priceToken1", "priceUSD"]
  }
}
```

### 3. Enable Warning Logs in Development

```json
{
  "logging": {
    "warnOnDefault": true
  }
}
```

### 4. Review Warnings Before Production

Check logs for unexpected default usage that might indicate bugs.

## Integration with Other Tools

### With Subgraph Linter

Subgraph Uncrashable prevents runtime issues through safe patterns.
Subgraph Linter catches issues at compile time.

Use both for maximum safety:

1. Generate safe helpers with Uncrashable
2. Validate with Linter before deploy
3. Test with Matchstick

### With Matchstick

Test generated helpers:

```typescript
test("getOrCreateToken returns existing token", () => {
  let existing = new Token(tokenAddress)
  existing.name = "Real Token"
  existing.save()

  let loaded = getOrCreateToken(tokenAddress)
  assert.stringEquals(loaded.name, "Real Token")
})

test("getOrCreateToken creates with defaults", () => {
  let created = getOrCreateToken(newAddress)
  assert.stringEquals(created.name, "Unknown Token")
})
```

## References

- [Subgraph Uncrashable Docs](https://thegraph.com/docs/en/subgraphs/developing/subgraph-uncrashable/)
- [Graph CLI Codegen](https://thegraph.com/docs/en/subgraphs/developing/creating/creating-a-subgraph/#code-generation)
