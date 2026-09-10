# Subgraph Composition

Subgraph composition enables combining multiple subgraphs' data sources into a single composed subgraph, allowing data reuse and aggregation across independent indexers.

## Overview

Instead of rebuilding indexing logic, you can reference existing subgraphs as data sources and use their entities as triggers for your composed subgraph.

### Benefits

- **Data Reusability**: Combine data from existing subgraphs
- **Development Efficiency**: No need to re-index the same data
- **Aggregation**: Build unified views from multiple sources
- **Performance**: Improved syncing and error handling

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Source Subgraph │     │ Source Subgraph │     │ Source Subgraph │
│   (Block Time)  │     │  (Block Cost)   │     │  (Block Size)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   Composed Subgraph    │
                    │    (Block Stats)       │
                    └────────────────────────┘
```

## Requirements

### Source Subgraphs

| Requirement | Details |
|-------------|---------|
| specVersion | 1.3.0 or later |
| Entities | Must use `@entity(immutable: true)` |
| Grafting | Cannot graft on existing entities |
| Pruning | Only allowed on immutable entities |

### Composed Subgraphs

| Requirement | Details |
|-------------|---------|
| Max sources | 5 source subgraphs |
| Chain | All sources must be same chain |
| Nesting | Cannot compose on composed subgraphs |
| Data sources | Cannot mix onchain + subgraph sources |

## Implementation

### Step 1: Prepare Source Subgraphs

Each source subgraph must have immutable entities:

```graphql
# source-subgraph/schema.graphql
type BlockTime @entity(immutable: true) {
  id: Bytes!
  blockNumber: BigInt!
  timestamp: BigInt!
  averageTime: BigInt!
}
```

```yaml
# source-subgraph/subgraph.yaml
specVersion: 1.3.0
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum/contract
    name: Blocks
    network: mainnet
    source:
      startBlock: 18000000
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.9
      language: wasm/assemblyscript
      entities:
        - BlockTime
      blockHandlers:
        - handler: handleBlock
      file: ./src/mapping.ts
```

### Step 2: Create Composed Subgraph Schema

Define entities that aggregate source data:

```graphql
# composed-subgraph/schema.graphql
type BlockStats @entity {
  id: Bytes!
  blockNumber: BigInt!
  timestamp: BigInt!
  averageTime: BigInt!      # From BlockTime source
  gasUsed: BigInt!          # From BlockCost source
  size: BigInt!             # From BlockSize source
}
```

### Step 3: Configure Composed Manifest

Reference source subgraphs as data sources:

```yaml
# composed-subgraph/subgraph.yaml
specVersion: 1.3.0
schema:
  file: ./schema.graphql
dataSources:
  - kind: subgraph
    name: BlockTimeSource
    network: mainnet
    source:
      address: "QmBlockTimeSubgraphId..."  # Deployment ID
      startBlock: 18000000
    mapping:
      kind: subgraph/triggers
      apiVersion: 0.0.9
      language: wasm/assemblyscript
      entities:
        - BlockStats
      triggers:
        - entity: BlockTime
          handler: handleBlockTime
      file: ./src/composition.ts

  - kind: subgraph
    name: BlockCostSource
    network: mainnet
    source:
      address: "QmBlockCostSubgraphId..."
      startBlock: 18000000
    mapping:
      kind: subgraph/triggers
      apiVersion: 0.0.9
      language: wasm/assemblyscript
      entities:
        - BlockStats
      triggers:
        - entity: BlockCost
          handler: handleBlockCost
      file: ./src/composition.ts

  - kind: subgraph
    name: BlockSizeSource
    network: mainnet
    source:
      address: "QmBlockSizeSubgraphId..."
      startBlock: 18000000
    mapping:
      kind: subgraph/triggers
      apiVersion: 0.0.9
      language: wasm/assemblyscript
      entities:
        - BlockStats
      triggers:
        - entity: BlockSize
          handler: handleBlockSize
      file: ./src/composition.ts
```

### Step 4: Write Composition Handlers

Handle entities from source subgraphs:

```typescript
// composed-subgraph/src/composition.ts
import { BlockTime, BlockCost, BlockSize } from "../generated/schema"
import { BlockStats } from "../generated/schema"

export function handleBlockTime(entity: BlockTime): void {
  let stats = getOrCreateBlockStats(entity.blockNumber)
  stats.timestamp = entity.timestamp
  stats.averageTime = entity.averageTime
  stats.save()
}

export function handleBlockCost(entity: BlockCost): void {
  let stats = getOrCreateBlockStats(entity.blockNumber)
  stats.gasUsed = entity.gasUsed
  stats.save()
}

export function handleBlockSize(entity: BlockSize): void {
  let stats = getOrCreateBlockStats(entity.blockNumber)
  stats.size = entity.size
  stats.save()
}

function getOrCreateBlockStats(blockNumber: BigInt): BlockStats {
  let id = Bytes.fromBigInt(blockNumber)
  let stats = BlockStats.load(id)

  if (stats == null) {
    stats = new BlockStats(id)
    stats.blockNumber = blockNumber
    stats.timestamp = BigInt.zero()
    stats.averageTime = BigInt.zero()
    stats.gasUsed = BigInt.zero()
    stats.size = BigInt.zero()
  }

  return stats
}
```

## Use Cases

### DeFi Aggregator

Combine data from multiple DEX subgraphs:

```yaml
dataSources:
  - kind: subgraph
    name: UniswapV3
    source:
      address: "QmUniswapV3..."
    mapping:
      triggers:
        - entity: Swap
          handler: handleUniswapSwap

  - kind: subgraph
    name: SushiSwap
    source:
      address: "QmSushiSwap..."
    mapping:
      triggers:
        - entity: Swap
          handler: handleSushiSwap
```

### Cross-Protocol Analytics

Aggregate lending protocol data:

```yaml
dataSources:
  - kind: subgraph
    name: Aave
    source:
      address: "QmAaveSubgraph..."
    mapping:
      triggers:
        - entity: Borrow
          handler: handleAaveBorrow
        - entity: Repay
          handler: handleAaveRepay

  - kind: subgraph
    name: Compound
    source:
      address: "QmCompoundSubgraph..."
    mapping:
      triggers:
        - entity: Borrow
          handler: handleCompoundBorrow
```

### NFT Marketplace Aggregator

Combine sales data across marketplaces:

```yaml
dataSources:
  - kind: subgraph
    name: OpenSea
    source:
      address: "QmOpenSeaSubgraph..."
    mapping:
      triggers:
        - entity: Sale
          handler: handleOpenSeaSale

  - kind: subgraph
    name: Blur
    source:
      address: "QmBlurSubgraph..."
    mapping:
      triggers:
        - entity: Sale
          handler: handleBlurSale
```

## Best Practices

### 1. Design Source Subgraphs for Composition

```graphql
# Use immutable entities with clear, composable data
type TokenTransfer @entity(immutable: true) {
  id: Bytes!
  token: Bytes!
  from: Bytes!
  to: Bytes!
  amount: BigInt!
  blockNumber: BigInt!
  timestamp: BigInt!
}
```

### 2. Handle Missing Data Gracefully

```typescript
export function handleSourceEntity(entity: SourceEntity): void {
  let aggregated = AggregatedStats.load(entity.id)

  if (aggregated == null) {
    aggregated = new AggregatedStats(entity.id)
    // Initialize with defaults
  }

  // Update only fields from this source
  aggregated.fieldFromThisSource = entity.value
  aggregated.lastUpdated = entity.timestamp
  aggregated.save()
}
```

### 3. Track Data Freshness

```graphql
type AggregatedStats @entity {
  id: Bytes!
  # Track which sources have contributed
  hasSource1Data: Boolean!
  hasSource2Data: Boolean!
  lastSource1Update: BigInt!
  lastSource2Update: BigInt!
}
```

### 4. Version Your Composed Subgraphs

When source subgraphs update, you may need to redeploy:

```yaml
# Track source versions in comments
dataSources:
  - kind: subgraph
    name: TokenSource
    source:
      # v2.1.0 - added new fields
      address: "QmNewDeploymentId..."
```

## Limitations

1. **Max 5 sources**: Cannot combine more than 5 subgraphs
2. **Same chain only**: All sources must index the same network
3. **No nesting**: Cannot use composed subgraph as a source
4. **No mixed sources**: Either all subgraph or all onchain sources
5. **Source changes**: Must redeploy when source subgraphs update schema

## References

- [Subgraph Composition Guide](https://thegraph.com/docs/en/subgraphs/guides/subgraph-composition/)
- [Immutable Entities](https://thegraph.com/docs/en/subgraphs/best-practices/immutable-entities-bytes-as-ids/)
