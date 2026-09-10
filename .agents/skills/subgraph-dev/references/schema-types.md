# Schema Types Reference

## Scalar Types

### Bytes
- Used for addresses, transaction hashes, and binary data
- More efficient than String for hex data
- Example: `id: Bytes!`, `from: Bytes!`

### String
- UTF-8 encoded text
- Use for names, symbols, URIs
- Example: `name: String!`, `uri: String`

### Int
- Signed 32-bit integer
- Range: -2,147,483,648 to 2,147,483,647
- Example: `decimals: Int!`

### Int8
- Signed 64-bit integer
- Used for auto-incrementing IDs in timeseries
- Example: `id: Int8!`

### BigInt
- Arbitrary precision integer
- Use for token amounts, block numbers, timestamps
- Example: `totalSupply: BigInt!`, `blockNumber: BigInt!`

### BigDecimal
- Arbitrary precision decimal
- Use for prices, percentages, ratios
- Example: `price: BigDecimal!`, `rate: BigDecimal!`

### Boolean
- True or false
- Example: `active: Boolean!`

### Timestamp
- Unix timestamp in seconds
- Used with timeseries entities
- Example: `timestamp: Timestamp!`

## Entity Annotations

### @entity
Basic entity definition:
```graphql
type Token @entity {
  id: Bytes!
}
```

### @entity(immutable: true)
Entity that never changes after creation:
```graphql
type Transfer @entity(immutable: true) {
  id: Bytes!
  from: Bytes!
  to: Bytes!
  value: BigInt!
}
```

### @entity(timeseries: true)
Time-series data points:
```graphql
type PricePoint @entity(timeseries: true) {
  id: Int8!
  timestamp: Timestamp!
  price: BigDecimal!
}
```

## Field Annotations

### @derivedFrom
Reverse lookup for one-to-many relationships:
```graphql
type Pool @entity {
  id: Bytes!
  swaps: [Swap!]! @derivedFrom(field: "pool")
}

type Swap @entity {
  id: Bytes!
  pool: Pool!
}
```

### @aggregate
Aggregation function for aggregation entities:
```graphql
type DailyVolume @aggregation(intervals: ["day"], source: "Swap") {
  id: Int8!
  timestamp: Timestamp!
  totalVolume: BigDecimal! @aggregate(fn: "sum", arg: "amountUSD")
  swapCount: Int8! @aggregate(fn: "count")
}
```

Supported functions: `sum`, `count`, `min`, `max`, `first`, `last`, `avg`

## Nullability

- `!` means required (non-null)
- Without `!` means optional (nullable)

```graphql
type Token @entity {
  id: Bytes!           # Required
  name: String!        # Required
  description: String  # Optional
}
```

## Arrays

```graphql
type Protocol @entity {
  id: Bytes!
  supportedTokens: [Bytes!]!  # Required array of required Bytes
  tags: [String!]             # Optional array of required Strings
}
```

Note: Avoid large arrays - use `@derivedFrom` instead for relationships.
