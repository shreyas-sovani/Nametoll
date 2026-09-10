# 1inch official MCP + skills (outside the top 5)

Not one of the five integrable/winnable partners. Vendored so an agent does not invent 1inch APIs if someone later chooses Aqua/SwapVM.

Sources: https://business.1inch.com/portal/documentation/ai-integration/mcp-server · `vendor/1inch-ai`

## MCP

- URL: `https://api.1inch.com/mcp/protocol`
- Public (no key): `search`, `list_examples`, `get_example`, `aqua` reads
- Auth required: `swap`, `orderbook`, `product_api`, `walletconnect`, `debug` via `Authorization: Bearer <1inch Business Portal key>` or OAuth

## Official skills

Hub: `vendor/1inch-ai/skills/1inch-mcp-server/SKILL.md`

Prize-relevant: `1inch-aqua` — this is **Aqua strategy analytics** (`maker_stats`, `list_opened`, optional `build_ship` / `build_dock` / `build_swap` when enabled). It is **not** SwapVM opcode work.

## Prize vs MCP gap (do not confuse)

ETHOnline Aqua prize scores **SwapVM custom position types** higher. Official agent skills do **not** teach SwapVM bytecode. If this partner is picked, read https://github.com/1inch/aqua and the SwapVM whitepaper on the prize page. Do not claim the MCP `aqua` tool is a SwapVM compiler.
