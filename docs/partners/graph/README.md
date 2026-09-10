# Graph merchandise sources (B5)

**Live.** Subgraph MCP (`https://subgraphs.mcp.thegraph.com/sse`) listed official tools, then `get_schema_by_subgraph_id` / `execute_query_by_subgraph_id` (`subgraph_id` from the live tool schema) returned Messari lending schema 3.1.0 for both pins. Studio gateway introspection matches. Do not invent entities.

| What | Where |
| --- | --- |
| Standardized Subgraphs (Lending / CDP 3.1.0) | https://thegraph.com/docs/en/subgraphs/existing-subgraphs/standard-subgraphs/ |
| Messari lending schema 3.1.0 | `schema-lending.graphql` (from https://github.com/messari/subgraphs/blob/master/schema-lending.graphql) |
| Prod deployments | `deployments.json` (from https://github.com/messari/subgraphs/blob/master/deployment/deployment.json) |
| Live gateway check | `gateway-live-check.json` (`npm run graph:probe`) |
| Live MCP check | `mcp-live-check.json` (`npm run graph:mcp`) |

Pinned pair (same schema, so one query shape):

- Aave v3 Ethereum — subgraph id `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk`
- Compound v3 Ethereum — subgraph id `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9`

If a later MCP schema disagrees with `schema-lending.graphql`, trust MCP and update `LENDING_RISK_QUERY`.
