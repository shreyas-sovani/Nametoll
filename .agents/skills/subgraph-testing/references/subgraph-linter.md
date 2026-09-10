# Subgraph Linter Reference

Subgraph Linter is a static analysis tool that detects common patterns leading to runtime crashes, corrupted entity state, silent data errors, or performance overhead—before deployment.

## Overview

Unlike runtime testing, Subgraph Linter performs static analysis on your mapping code to catch bugs that compile fine but crash or produce incorrect data at runtime.

## Installation

### CLI

```bash
cd subgraph-linter
npm install
npm run build
```

### VS Code Extension

Install from VS Code marketplace. The extension auto-discovers `subgraph.yaml` files and runs analysis on save.

## CLI Usage

```bash
# Basic usage
npm run check -- --manifest ../your-subgraph/subgraph.yaml

# With custom tsconfig
npm run check -- --manifest ../your-subgraph/subgraph.yaml --tsconfig ../your-subgraph/tsconfig.json

# With config file
npm run check -- --manifest ../your-subgraph/subgraph.yaml --config ./subgraph-linter.config.json
```

## Checks Reference

### entity-overwrite

**Problem:** Handler works with an entity that becomes stale after a helper loads and saves the same entity. Handler then saves stale instance, overwriting updates.

```typescript
// BAD - entity-overwrite
export function handleTransfer(event: Transfer): void {
  let token = Token.load(event.address)!

  // Helper loads and modifies the same token
  updateTokenMetrics(event.address)  // Saves token internally

  token.lastTransfer = event.block.timestamp
  token.save()  // Overwrites helper's changes!
}

// GOOD - reload after helper
export function handleTransfer(event: Transfer): void {
  updateTokenMetrics(event.address)

  // Reload to get fresh state
  let token = Token.load(event.address)!
  token.lastTransfer = event.block.timestamp
  token.save()
}
```

### unexpected-null

**Problem:** Entity saved with missing required fields, or assignment to @derivedFrom fields.

```typescript
// BAD - missing required field
let token = new Token(address)
token.name = "Test"
// token.symbol is required but not set!
token.save()

// GOOD - all required fields set
let token = new Token(address)
token.name = "Test"
token.symbol = "TST"
token.decimals = 18
token.totalSupply = BigInt.zero()
token.save()
```

### unchecked-load

**Problem:** Entity.load() treated as always present with `!` instead of handling null case.

```typescript
// BAD - unchecked load
let token = Token.load(address)!  // Crashes if token doesn't exist
token.totalSupply = token.totalSupply.plus(amount)

// GOOD - explicit null handling
let token = Token.load(address)
if (token == null) {
  token = new Token(address)
  token.totalSupply = BigInt.zero()
  // ... initialize other fields
}
token.totalSupply = token.totalSupply.plus(amount)
token.save()
```

### unchecked-nonnull

**Problem:** Non-null assertion on values that can be missing at runtime.

```typescript
// BAD - unchecked non-null
let metadata = token.metadata!  // Crashes if metadata is null
let uri = metadata.uri

// GOOD - explicit guard
let metadata = token.metadata
if (metadata != null) {
  let uri = metadata.uri
  // ...
}
```

### division-guard

**Problem:** Division where denominator may be zero on some execution paths.

```typescript
// BAD - division without guard
let price = amountOut.div(amountIn)  // Crashes if amountIn is 0

// GOOD - guard before division
if (amountIn.gt(BigInt.zero())) {
  let price = amountOut.div(amountIn)
  // ...
}
```

### derived-field-guard

**Problem:** Base fields updated but derived fields not recomputed before save.

```typescript
// BAD - derived field not updated
type Pool @entity {
  token0Balance: BigInt!
  token1Balance: BigInt!
  tvl: BigDecimal!  // Derived from balances
}

pool.token0Balance = newBalance
pool.save()  // tvl is now stale!

// GOOD - update derived field
pool.token0Balance = newBalance
pool.tvl = calculateTVL(pool)
pool.save()
```

### helper-return-contract

**Problem:** Helper returns entity without fully initializing required fields.

```typescript
// BAD - helper returns incomplete entity
function getOrCreateToken(address: Bytes): Token {
  let token = Token.load(address)
  if (token == null) {
    token = new Token(address)
    // Missing required fields!
  }
  return token
}

// GOOD - fully initialize in helper
function getOrCreateToken(address: Bytes): Token {
  let token = Token.load(address)
  if (token == null) {
    token = new Token(address)
    token.name = ""
    token.symbol = ""
    token.decimals = 0
    token.totalSupply = BigInt.zero()
  }
  return token
}
```

### undeclared-eth-call

**Problem:** Contract calls not declared in handler's `calls:` block in manifest.

```typescript
// Mapping makes eth_call
let contract = ERC20.bind(address)
let name = contract.name()  // This call should be declared

// Add to subgraph.yaml:
eventHandlers:
  - event: Transfer(indexed address,indexed address,uint256)
    handler: handleTransfer
    calls:
      name: ERC20[event.address].name()
```

## Configuration

Create `subgraph-linter.config.json`:

```json
{
  "severityOverrides": {
    "division-guard": "error",
    "undeclared-eth-call": "warning",
    "unchecked-load": "error"
  },
  "suppression": {
    "allowWarnings": true,
    "allowErrors": true
  }
}
```

### Severity Levels

- `error`: Causes non-zero exit code (blocks CI)
- `warning`: Reported but doesn't fail build

## Inline Suppression

When linter flags safe code due to domain knowledge limitations:

```typescript
// Suppress specific check
// [allow(derived-field-guard)]
graphNetwork.save()

// Suppress all checks on line
// [allow(all)]
riskyOperation()
```

## VS Code Extension

### Features

- Auto-discovers `subgraph.yaml` files (skips build/, dist/)
- Runs on save (configurable)
- Shows issues in Problems panel
- Quick fixes for adding call declarations
- Quick fixes for suppression comments

### Commands

| Command | Description |
|---------|-------------|
| `Subgraph Linter: Run Analysis` | Manually trigger analysis |
| `Subgraph Linter: Add Call Declaration` | Quick fix for undeclared-eth-call |

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `subgraphLinter.manifestPaths` | Override manifest auto-discovery | `[]` |
| `subgraphLinter.tsconfigPath` | Custom tsconfig.json path | `null` |
| `subgraphLinter.configPath` | Custom linter config path | `null` |
| `subgraphLinter.runOnSave` | Run analysis on file save | `true` |

## CI Integration

```yaml
# .github/workflows/lint.yml
name: Lint Subgraph

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Subgraph Linter
        run: |
          git clone https://github.com/graphprotocol/subgraph-linter.git
          cd subgraph-linter && npm install && npm run build

      - name: Run Linter
        run: |
          cd subgraph-linter
          npm run check -- --manifest ../subgraph.yaml
```

## Best Practice Workflow

1. **During development**: Use VS Code extension for real-time feedback
2. **Before commit**: Run CLI to verify no errors
3. **In CI**: Block merges on linter errors
4. **Suppress carefully**: Only suppress with domain knowledge, document why

## Common Patterns to Avoid

| Pattern | Issue | Fix |
|---------|-------|-----|
| `Entity.load(id)!` | Runtime crash if null | Null check |
| `value!` on optional | Runtime crash if null | Guard clause |
| `a.div(b)` | Crash if b=0 | Zero check |
| Stale entity after helper | Data overwrite | Reload entity |
| Partial initialization | Invalid state | Set all fields |
| Direct @derivedFrom mutation | Silent error | Update source |
