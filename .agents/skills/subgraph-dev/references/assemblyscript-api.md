# AssemblyScript API Reference

## Imports

```typescript
import {
  BigInt,
  BigDecimal,
  Bytes,
  Address,
  ethereum,
  log,
  store,
  crypto,
  json,
  ipfs
} from "@graphprotocol/graph-ts"
```

## BigInt Operations

```typescript
// Creation
let zero = BigInt.zero()
let one = BigInt.fromI32(1)
let large = BigInt.fromString("1000000000000000000")
let fromBytes = BigInt.fromByteArray(bytes)

// Arithmetic
let sum = a.plus(b)
let diff = a.minus(b)
let product = a.times(b)
let quotient = a.div(b)
let remainder = a.mod(b)
let power = a.pow(3)
let negated = a.neg()
let absolute = a.abs()

// Comparison
let isEqual = a.equals(b)
let isGreater = a.gt(b)
let isLess = a.lt(b)
let isGreaterOrEqual = a.ge(b)
let isLessOrEqual = a.le(b)

// Conversion
let asI32 = bigInt.toI32()
let asString = bigInt.toString()
let asHex = bigInt.toHexString()
let asBigDecimal = bigInt.toBigDecimal()
```

## BigDecimal Operations

```typescript
// Creation
let zero = BigDecimal.zero()
let fromBigInt = bigInt.toBigDecimal()
let fromString = BigDecimal.fromString("1.5")

// Arithmetic
let sum = a.plus(b)
let diff = a.minus(b)
let product = a.times(b)
let quotient = a.div(b)
let negated = a.neg()

// Conversion
let asString = bigDecimal.toString()
```

## Bytes Operations

```typescript
// Creation
let empty = new Bytes(0)
let fromHex = Bytes.fromHexString("0x1234")
let fromUTF8 = Bytes.fromUTF8("hello")

// Concatenation
let combined = bytes1.concat(bytes2)
let withIndex = txHash.concatI32(logIndex.toI32())

// Conversion
let asHex = bytes.toHexString()
let asString = bytes.toString()
let asBigInt = BigInt.fromByteArray(bytes)

// Comparison
let isEqual = bytes1.equals(bytes2)
```

## Address Operations

```typescript
// Address is a subclass of Bytes
let address = Address.fromString("0x...")
let fromBytes = Address.fromBytes(bytes)

// Zero address
let zero = Address.zero()
```

## Event Properties

```typescript
export function handleTransfer(event: Transfer): void {
  // Event parameters (specific to event)
  let from = event.params.from
  let to = event.params.to
  let value = event.params.value

  // Transaction info
  let txHash = event.transaction.hash
  let txFrom = event.transaction.from
  let txTo = event.transaction.to
  let txValue = event.transaction.value
  let gasPrice = event.transaction.gasPrice
  let gasUsed = event.receipt!.gasUsed

  // Block info
  let blockNumber = event.block.number
  let blockTimestamp = event.block.timestamp
  let blockHash = event.block.hash

  // Log info
  let logIndex = event.logIndex
  let address = event.address  // Contract address
}
```

## Entity Operations

```typescript
import { Token } from "../generated/schema"

// Load entity (returns null if not found)
let token = Token.load(id)

// Create new entity
let newToken = new Token(id)

// Set fields
newToken.name = "Token Name"
newToken.symbol = "TKN"
newToken.decimals = 18

// Save entity
newToken.save()

// Load or create pattern
let entity = Entity.load(id)
if (entity == null) {
  entity = new Entity(id)
}
entity.save()
```

## Store Operations

```typescript
import { store } from "@graphprotocol/graph-ts"

// Remove entity
store.remove("Token", id.toHexString())

// Get entity (alternative to Entity.load)
let entity = store.get("Token", id.toHexString())
```

## Logging

```typescript
import { log } from "@graphprotocol/graph-ts"

log.info("Message: {}", [value.toString()])
log.warning("Warning: {}", [message])
log.error("Error: {}", [error])
log.debug("Debug: {}", [debug])
log.critical("Critical error - stops indexing: {}", [critical])
```

## Crypto Functions

```typescript
import { crypto } from "@graphprotocol/graph-ts"

// Keccak256 hash
let hash = crypto.keccak256(bytes)
```

## JSON Parsing

```typescript
import { json, JSONValue } from "@graphprotocol/graph-ts"

let data = json.fromBytes(bytes)
let obj = data.toObject()
let value = obj.get("key")

if (value != null) {
  let str = value.toString()
  let num = value.toBigInt()
  let arr = value.toArray()
}
```

## IPFS

```typescript
import { ipfs } from "@graphprotocol/graph-ts"

let data = ipfs.cat("QmHash...")
if (data != null) {
  // Process data
}
```

## Contract Binding

```typescript
import { ERC20 } from "../generated/ERC20/ERC20"

// Bind to contract
let contract = ERC20.bind(address)

// Call view function (may revert)
let name = contract.name()

// Safe call with try_
let result = contract.try_name()
if (result.reverted) {
  // Handle revert
} else {
  let name = result.value
}
```

## Data Source Templates

```typescript
import { Pool as PoolTemplate } from "../generated/templates"

// Create new data source instance
PoolTemplate.create(poolAddress)

// With context
import { DataSourceContext } from "@graphprotocol/graph-ts"
let context = new DataSourceContext()
context.setBytes("factory", factoryAddress)
PoolTemplate.createWithContext(poolAddress, context)

// Access context in handler
import { dataSource } from "@graphprotocol/graph-ts"
let context = dataSource.context()
let factory = context.getBytes("factory")
```
