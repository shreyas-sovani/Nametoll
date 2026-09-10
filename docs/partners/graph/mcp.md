# The Graph official MCP + skills

Sources: https://thegraph.com/docs/en/ai-overview/ · https://thegraph.com/docs/en/subgraphs/tooling/subgraph-mcp/cursor/

## Subgraph MCP

- URL: `https://subgraphs.mcp.thegraph.com/sse`
- Auth: Gateway API key from https://thegraph.com/studio/ as `Authorization: Bearer <key>`
- Cursor uses `npx mcp-remote` (see `docs/partners/mcp.json.example`)

Tools the official docs advertise:

- Schema by deployment ID (`0x…`), Subgraph ID, or IPFS hash
- Query by deployment ID or Subgraph ID
- Discover top deployments for a contract + chain

Do not invent GraphQL schemas. Fetch the schema through MCP, then query.

## Official skills (vendored)

| Skill | Path |
| --- | --- |
| subgraph-dev | `vendor/subgraphs-skills/skills/subgraph-dev/SKILL.md` |
| subgraph-optimization | `vendor/subgraphs-skills/skills/subgraph-optimization/SKILL.md` |
| subgraph-testing | `vendor/subgraphs-skills/skills/subgraph-testing/SKILL.md` |
| substreams-dev | `vendor/substreams-skills/skills/substreams-dev/SKILL.md` |

Prize bar: Standardized Subgraphs / composing Graph products / Subgraph MCP as a load-bearing data plane. “We queried one subgraph” is not enough.
