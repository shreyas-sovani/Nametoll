# Matchstick API Reference

## Test Structure

```typescript
import {
  describe,
  test,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach
} from "matchstick-as"

describe("Group Name", () => {
  beforeAll(() => {
    // Runs once before all tests in group
  })

  beforeEach(() => {
    // Runs before each test
  })

  afterEach(() => {
    // Runs after each test
  })

  afterAll(() => {
    // Runs once after all tests in group
  })

  test("test name", () => {
    // Test code
  })

  test("another test", () => {
    // Test code
  })
})
```

## Assertions

### Entity Assertions

```typescript
import { assert } from "matchstick-as"

// Check entity count
assert.entityCount("EntityName", expectedCount)

// Check entity exists with field value
assert.fieldEquals("EntityName", "entityId", "fieldName", "expectedValue")

// Check entity not in store
assert.notInStore("EntityName", "entityId")
```

### Value Assertions

```typescript
// Boolean
assert.assertTrue(condition)
assert.assertFalse(condition)

// Null
assert.assertNull(value)
assert.assertNotNull(value)

// Equality
assert.equals(expected, actual)  // ethereum.Value types
assert.stringEquals(expected, actual)
assert.bigIntEquals(expected, actual)
assert.bytesEquals(expected, actual)
assert.addressEquals(expected, actual)
assert.i32Equals(expected, actual)

// Arrays
assert.equals(
  ethereum.Value.fromI32Array([1, 2, 3]),
  ethereum.Value.fromI32Array([1, 2, 3])
)
```

## Mock Events

```typescript
import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"

function createMockEvent(): ethereum.Event {
  let event = newMockEvent()

  // Set event address (contract that emitted)
  event.address = Address.fromString("0x...")

  // Set block data
  event.block.number = BigInt.fromI32(12345678)
  event.block.timestamp = BigInt.fromI32(1640000000)
  event.block.hash = Bytes.fromHexString("0x...")

  // Set transaction data
  event.transaction.hash = Bytes.fromHexString("0x...")
  event.transaction.from = Address.fromString("0x...")
  event.transaction.to = Address.fromString("0x...")
  event.transaction.value = BigInt.fromI32(0)
  event.transaction.gasPrice = BigInt.fromI32(20000000000)

  // Set log data
  event.logIndex = BigInt.fromI32(0)

  return event
}
```

### Typed Event Creation

```typescript
import { Transfer } from "../generated/Contract/Contract"

function createTransferEvent(
  from: Address,
  to: Address,
  value: BigInt
): Transfer {
  // Cast mock event to typed event
  let event = changetype<Transfer>(newMockEvent())

  // Set parameters array
  event.parameters = new Array()
  event.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  event.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  event.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  )

  return event
}
```

## Mock Contract Functions

```typescript
import { createMockedFunction } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"

// Basic mock (no arguments)
createMockedFunction(
  contractAddress,
  "name",
  "name():(string)"
).returns([ethereum.Value.fromString("Token Name")])

// Mock with arguments
createMockedFunction(
  contractAddress,
  "balanceOf",
  "balanceOf(address):(uint256)"
).withArgs([
  ethereum.Value.fromAddress(userAddress)
]).returns([
  ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1000))
])

// Mock to revert
createMockedFunction(
  contractAddress,
  "name",
  "name():(string)"
).reverts()

// Multiple return values
createMockedFunction(
  contractAddress,
  "getReserves",
  "getReserves():(uint112,uint112,uint32)"
).returns([
  ethereum.Value.fromUnsignedBigInt(reserve0),
  ethereum.Value.fromUnsignedBigInt(reserve1),
  ethereum.Value.fromUnsignedBigInt(blockTimestampLast)
])
```

## Store Operations

```typescript
import { clearStore } from "matchstick-as"
import { store } from "@graphprotocol/graph-ts"

// Clear all entities
clearStore()

// Direct store access (alternative to Entity.load/save)
store.set("EntityName", "id", entity)
store.get("EntityName", "id")
store.remove("EntityName", "id")
```

## Data Source Mocking

```typescript
import { dataSourceMock } from "matchstick-as"
import { DataSourceContext } from "@graphprotocol/graph-ts"

// Set data source address
dataSourceMock.setAddress("0x...")

// Set data source context
let context = new DataSourceContext()
context.setString("key", "value")
context.setBytes("factory", factoryAddress)
context.setBigInt("startBlock", BigInt.fromI32(12345678))
dataSourceMock.setContext(context)

// Reset
dataSourceMock.resetValues()
```

## Ethereum Value Types

```typescript
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"

// Creating ethereum.Value for parameters
ethereum.Value.fromAddress(Address.fromString("0x..."))
ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(100))
ethereum.Value.fromSignedBigInt(BigInt.fromI32(-100))
ethereum.Value.fromBoolean(true)
ethereum.Value.fromBytes(Bytes.fromHexString("0x..."))
ethereum.Value.fromString("text")
ethereum.Value.fromI32(42)
ethereum.Value.fromI32Array([1, 2, 3])
ethereum.Value.fromAddressArray([addr1, addr2])

// Tuple (for struct returns)
let tuple = new ethereum.Tuple()
tuple.push(ethereum.Value.fromAddress(address))
tuple.push(ethereum.Value.fromUnsignedBigInt(amount))
ethereum.Value.fromTuple(tuple)
```

## Logging in Tests

```typescript
import { log } from "matchstick-as"

log.info("Message: {}", [value.toString()])
log.warning("Warning: {}", [message])
log.error("Error: {}", [error])
log.debug("Debug info: {}", [debug])
```

## Test Execution

```bash
# Run all tests
graph test

# Run specific test file (without extension)
graph test transfer

# Run tests in Docker
graph test -d

# Run with coverage report
graph test -c

# Verbose output
graph test -v

# Recompile and run
graph test -r

# Set test timeout (default 180s)
graph test --timeout 300
```

## Common Function Signatures

```
# ERC20
"name():(string)"
"symbol():(string)"
"decimals():(uint8)"
"totalSupply():(uint256)"
"balanceOf(address):(uint256)"
"allowance(address,address):(uint256)"

# ERC721
"name():(string)"
"symbol():(string)"
"tokenURI(uint256):(string)"
"ownerOf(uint256):(address)"
"balanceOf(address):(uint256)"

# Uniswap V2 Pair
"token0():(address)"
"token1():(address)"
"getReserves():(uint112,uint112,uint32)"
"totalSupply():(uint256)"
"factory():(address)"

# Uniswap V3 Pool
"token0():(address)"
"token1():(address)"
"fee():(uint24)"
"liquidity():(uint128)"
"slot0():(uint160,int24,uint16,uint16,uint16,uint8,bool)"
```
