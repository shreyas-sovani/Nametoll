# Common Subgraph Patterns

Reusable patterns for common blockchain data indexing scenarios.

## ERC20 Token Tracker

Track token metadata, transfers, and balances.

### Schema

```graphql
type Token @entity {
  id: Bytes!                    # Token address
  name: String!
  symbol: String!
  decimals: Int!
  totalSupply: BigInt!
  holderCount: BigInt!
  transferCount: BigInt!
  holders: [TokenBalance!]! @derivedFrom(field: "token")
  transfers: [Transfer!]! @derivedFrom(field: "token")
}

type TokenBalance @entity {
  id: Bytes!                    # token + holder address
  token: Token!
  holder: Bytes!
  amount: BigInt!
  lastUpdated: BigInt!
}

type Transfer @entity(immutable: true) {
  id: Bytes!
  token: Token!
  from: Bytes!
  to: Bytes!
  amount: BigInt!
  timestamp: BigInt!
  blockNumber: BigInt!
  transactionHash: Bytes!
}
```

### Mapping

```typescript
export function handleTransfer(event: TransferEvent): void {
  let token = getOrCreateToken(event.address)

  // Update transfer count
  token.transferCount = token.transferCount.plus(BigInt.fromI32(1))
  token.save()

  // Update balances
  if (event.params.from != Address.zero()) {
    updateBalance(event.address, event.params.from, event.params.value.neg())
  }
  if (event.params.to != Address.zero()) {
    updateBalance(event.address, event.params.to, event.params.value)
  }

  // Create transfer record
  let transfer = new Transfer(event.transaction.hash.concatI32(event.logIndex.toI32()))
  transfer.token = token.id
  transfer.from = event.params.from
  transfer.to = event.params.to
  transfer.amount = event.params.value
  transfer.timestamp = event.block.timestamp
  transfer.blockNumber = event.block.number
  transfer.transactionHash = event.transaction.hash
  transfer.save()
}

function updateBalance(tokenAddress: Bytes, holder: Bytes, delta: BigInt): void {
  let id = tokenAddress.concat(holder)
  let balance = TokenBalance.load(id)

  if (balance == null) {
    balance = new TokenBalance(id)
    balance.token = tokenAddress
    balance.holder = holder
    balance.amount = BigInt.zero()

    // Increment holder count
    let token = Token.load(tokenAddress)!
    token.holderCount = token.holderCount.plus(BigInt.fromI32(1))
    token.save()
  }

  balance.amount = balance.amount.plus(delta)
  balance.lastUpdated = /* event.block.timestamp */
  balance.save()
}
```

---

## DEX / AMM (Uniswap-style)

Track pools, swaps, liquidity, and volume.

### Schema

```graphql
type Factory @entity {
  id: Bytes!
  poolCount: BigInt!
  totalVolumeUSD: BigDecimal!
  totalLiquidityUSD: BigDecimal!
}

type Pool @entity {
  id: Bytes!                    # Pool address
  factory: Factory!
  token0: Token!
  token1: Token!
  reserve0: BigInt!
  reserve1: BigInt!
  totalSupply: BigInt!
  volumeToken0: BigDecimal!
  volumeToken1: BigDecimal!
  volumeUSD: BigDecimal!
  txCount: BigInt!
  createdAtTimestamp: BigInt!
  createdAtBlock: BigInt!
  swaps: [Swap!]! @derivedFrom(field: "pool")
}

type Swap @entity(immutable: true) {
  id: Bytes!
  pool: Pool!
  sender: Bytes!
  recipient: Bytes!
  amount0In: BigInt!
  amount1In: BigInt!
  amount0Out: BigInt!
  amount1Out: BigInt!
  amountUSD: BigDecimal!
  timestamp: BigInt!
  transaction: Bytes!
}
```

### Mapping

```typescript
export function handleSwap(event: SwapEvent): void {
  let pool = Pool.load(event.address)!

  // Create swap record
  let swap = new Swap(event.transaction.hash.concatI32(event.logIndex.toI32()))
  swap.pool = pool.id
  swap.sender = event.params.sender
  swap.recipient = event.params.to
  swap.amount0In = event.params.amount0In
  swap.amount1In = event.params.amount1In
  swap.amount0Out = event.params.amount0Out
  swap.amount1Out = event.params.amount1Out
  swap.amountUSD = calculateUSD(event)
  swap.timestamp = event.block.timestamp
  swap.transaction = event.transaction.hash
  swap.save()

  // Update pool stats
  pool.txCount = pool.txCount.plus(BigInt.fromI32(1))
  pool.volumeUSD = pool.volumeUSD.plus(swap.amountUSD)
  pool.save()
}

export function handleSync(event: SyncEvent): void {
  let pool = Pool.load(event.address)!
  pool.reserve0 = event.params.reserve0
  pool.reserve1 = event.params.reserve1
  pool.save()
}
```

---

## NFT Marketplace

Track collections, tokens, sales, and ownership.

### Schema

```graphql
type Collection @entity {
  id: Bytes!                    # Contract address
  name: String!
  symbol: String!
  totalSupply: BigInt!
  floorPrice: BigDecimal!
  totalVolume: BigDecimal!
  tokens: [Token!]! @derivedFrom(field: "collection")
}

type NFT @entity {
  id: Bytes!                    # collection + tokenId
  collection: Collection!
  tokenId: BigInt!
  tokenURI: String
  owner: Bytes!
  lastSalePrice: BigDecimal
  sales: [Sale!]! @derivedFrom(field: "nft")
}

type Sale @entity(immutable: true) {
  id: Bytes!
  nft: NFT!
  seller: Bytes!
  buyer: Bytes!
  price: BigInt!
  priceUSD: BigDecimal!
  marketplace: Bytes!
  timestamp: BigInt!
  transaction: Bytes!
}
```

### Mapping

```typescript
export function handleTransfer(event: TransferEvent): void {
  let id = event.address.concat(Bytes.fromBigInt(event.params.tokenId))
  let nft = NFT.load(id)

  if (nft == null) {
    nft = new NFT(id)
    nft.collection = event.address
    nft.tokenId = event.params.tokenId

    // Fetch tokenURI (use try_ to handle reverts)
    let contract = ERC721.bind(event.address)
    let uriResult = contract.try_tokenURI(event.params.tokenId)
    nft.tokenURI = uriResult.reverted ? null : uriResult.value
  }

  nft.owner = event.params.to
  nft.save()
}

export function handleSale(event: OrderFulfilled): void {
  let sale = new Sale(event.transaction.hash.concatI32(event.logIndex.toI32()))
  sale.nft = event.params.collection.concat(Bytes.fromBigInt(event.params.tokenId))
  sale.seller = event.params.offerer
  sale.buyer = event.params.recipient
  sale.price = event.params.price
  sale.priceUSD = calculateUSD(event.params.price)
  sale.marketplace = event.address
  sale.timestamp = event.block.timestamp
  sale.transaction = event.transaction.hash
  sale.save()

  // Update NFT last sale price
  let nft = NFT.load(sale.nft)
  if (nft != null) {
    nft.lastSalePrice = sale.priceUSD
    nft.save()
  }
}
```

---

## Lending Protocol (Aave/Compound-style)

Track markets, deposits, borrows, and liquidations.

### Schema

```graphql
type Market @entity {
  id: Bytes!                    # Market/cToken address
  asset: Token!
  totalDeposits: BigInt!
  totalBorrows: BigInt!
  depositRate: BigDecimal!
  borrowRate: BigDecimal!
  utilizationRate: BigDecimal!
  positions: [Position!]! @derivedFrom(field: "market")
}

type Position @entity {
  id: Bytes!                    # market + user
  market: Market!
  user: Bytes!
  depositBalance: BigInt!
  borrowBalance: BigInt!
  lastUpdated: BigInt!
}

type Deposit @entity(immutable: true) {
  id: Bytes!
  market: Market!
  user: Bytes!
  amount: BigInt!
  timestamp: BigInt!
}

type Borrow @entity(immutable: true) {
  id: Bytes!
  market: Market!
  user: Bytes!
  amount: BigInt!
  timestamp: BigInt!
}

type Liquidation @entity(immutable: true) {
  id: Bytes!
  market: Market!
  liquidator: Bytes!
  borrower: Bytes!
  debtRepaid: BigInt!
  collateralSeized: BigInt!
  timestamp: BigInt!
}
```

---

## Staking / Rewards

Track staking positions and reward distributions.

### Schema

```graphql
type StakingPool @entity {
  id: Bytes!
  stakingToken: Token!
  rewardToken: Token!
  totalStaked: BigInt!
  rewardRate: BigInt!
  periodFinish: BigInt!
  stakes: [Stake!]! @derivedFrom(field: "pool")
}

type Stake @entity {
  id: Bytes!                    # pool + user
  pool: StakingPool!
  user: Bytes!
  amount: BigInt!
  rewardDebt: BigInt!
  lastUpdated: BigInt!
}

type RewardClaim @entity(immutable: true) {
  id: Bytes!
  pool: StakingPool!
  user: Bytes!
  amount: BigInt!
  timestamp: BigInt!
}
```

---

## Governance / DAO

Track proposals and votes.

### Schema

```graphql
type Governor @entity {
  id: Bytes!
  proposalCount: BigInt!
  votingDelay: BigInt!
  votingPeriod: BigInt!
  quorum: BigInt!
  proposals: [Proposal!]! @derivedFrom(field: "governor")
}

type Proposal @entity {
  id: Bytes!                    # governor + proposalId
  governor: Governor!
  proposalId: BigInt!
  proposer: Bytes!
  description: String!
  targets: [Bytes!]!
  values: [BigInt!]!
  calldatas: [Bytes!]!
  startBlock: BigInt!
  endBlock: BigInt!
  forVotes: BigInt!
  againstVotes: BigInt!
  abstainVotes: BigInt!
  state: ProposalState!
  votes: [Vote!]! @derivedFrom(field: "proposal")
}

enum ProposalState {
  Pending
  Active
  Canceled
  Defeated
  Succeeded
  Queued
  Expired
  Executed
}

type Vote @entity(immutable: true) {
  id: Bytes!
  proposal: Proposal!
  voter: Bytes!
  support: Int!                 # 0=against, 1=for, 2=abstain
  weight: BigInt!
  reason: String
  timestamp: BigInt!
}
```

---

## Time-Series Aggregations

For analytics dashboards with hourly/daily stats.

### Schema

```graphql
type TokenHourData @entity(timeseries: true) {
  id: Int8!
  timestamp: Timestamp!
  token: Token!
  priceUSD: BigDecimal!
  volume: BigDecimal!
  txCount: Int!
}

type TokenDayData @aggregation(
  intervals: ["day"],
  source: "TokenHourData"
) {
  id: Int8!
  timestamp: Timestamp!
  token: Token!
  open: BigDecimal! @aggregate(fn: "first", arg: "priceUSD")
  high: BigDecimal! @aggregate(fn: "max", arg: "priceUSD")
  low: BigDecimal! @aggregate(fn: "min", arg: "priceUSD")
  close: BigDecimal! @aggregate(fn: "last", arg: "priceUSD")
  volume: BigDecimal! @aggregate(fn: "sum", arg: "volume")
  txCount: Int8! @aggregate(fn: "sum", arg: "txCount")
}
```

---

## Helper Patterns

### Get or Create Entity

```typescript
function getOrCreateToken(address: Bytes): Token {
  let token = Token.load(address)
  if (token == null) {
    token = new Token(address)
    let contract = ERC20.bind(Address.fromBytes(address))

    let nameResult = contract.try_name()
    token.name = nameResult.reverted ? "Unknown" : nameResult.value

    let symbolResult = contract.try_symbol()
    token.symbol = symbolResult.reverted ? "???" : symbolResult.value

    let decimalsResult = contract.try_decimals()
    token.decimals = decimalsResult.reverted ? 18 : decimalsResult.value

    token.totalSupply = BigInt.zero()
    token.save()
  }
  return token
}
```

### Safe BigDecimal Division

```typescript
function safeDiv(a: BigDecimal, b: BigDecimal): BigDecimal {
  if (b.equals(BigDecimal.zero())) {
    return BigDecimal.zero()
  }
  return a.div(b)
}
```

### USD Price Calculation

```typescript
const USDC = Address.fromString("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
const WETH = Address.fromString("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")

function getEthPriceUSD(): BigDecimal {
  let pool = Pool.load(WETH_USDC_POOL)
  if (pool == null) return BigDecimal.zero()
  // Calculate from reserves...
  return price
}

function getTokenPriceUSD(token: Bytes): BigDecimal {
  if (token == USDC) return BigDecimal.fromString("1")
  if (token == WETH) return getEthPriceUSD()
  // Find path through known pools...
  return price
}
```

### Bytes ID Generation

```typescript
// Transaction + log index (most common)
let id = event.transaction.hash.concatI32(event.logIndex.toI32())

// Composite key
let id = tokenAddress.concat(userAddress)

// With numeric component
let id = poolAddress.concatI32(positionIndex)
```
