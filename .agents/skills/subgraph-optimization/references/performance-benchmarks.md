# Performance Benchmarks

## Immutable Entities + Bytes IDs

Based on The Graph's testing:

| Metric | Improvement |
|--------|-------------|
| Query Performance | ~28% faster |
| Indexing Speed | ~48% faster |

### Why These Gains?

**Immutable Entities:**
- Skip validity range tracking
- No database updates needed
- Simplified query filtering

**Bytes IDs:**
- 50% less storage than hex strings
- Faster byte comparisons vs UTF-8
- More efficient indexing

## Pruning Impact

| Scenario | Query Time | Storage |
|----------|------------|---------|
| No pruning | Baseline | 100% |
| Auto pruning | 30-50% faster | 10-30% |
| Aggressive pruning | 50-70% faster | 5-15% |

*Results vary based on subgraph data patterns*

## @derivedFrom vs Direct Arrays

| Array Size | Query Time (Direct) | Query Time (Derived) |
|------------|---------------------|----------------------|
| 100 items | ~50ms | ~20ms |
| 1,000 items | ~200ms | ~25ms |
| 10,000 items | ~2,000ms | ~30ms |
| 100,000 items | Timeout | ~50ms |

### Why Derived is Faster

- Direct arrays load all data with parent entity
- Derived fields are loaded on-demand
- Pagination works efficiently with derived

## eth_calls Impact

| Calls per Event | Indexing Slowdown |
|-----------------|-------------------|
| 0 | Baseline |
| 1 | 2-5x slower |
| 2-3 | 5-10x slower |
| 5+ | 10-50x slower |

### Mitigation Results

| Approach | Improvement |
|----------|-------------|
| Declared calls (parallel) | 2-3x faster than inline |
| Cached contract data | 5-10x faster after first call |
| Data in events | No RPC overhead |

## Timeseries Aggregations

| Aggregation Method | Query Time |
|-------------------|------------|
| Mapping-computed | 500ms - 5s |
| Database aggregation | 10ms - 100ms |

Improvement: **10-50x faster queries**

## Indexing Speed by Pattern

| Pattern | Events/Second |
|---------|---------------|
| Simple event logging | 1,000-5,000 |
| With entity updates | 500-2,000 |
| With 1 eth_call | 100-500 |
| With multiple eth_calls | 20-100 |
| With contract creation | 50-200 |

## Recommended Benchmarking

1. **Measure baseline**: Deploy without optimizations
2. **Add optimizations incrementally**: One at a time
3. **Compare metrics**:
   - Indexing time (blocks per second)
   - Query latency (p50, p95, p99)
   - Storage size
   - Memory usage

### Tools

- Subgraph Studio dashboard for metrics
- GraphQL playground for query timing
- graph-node logs for indexing performance
