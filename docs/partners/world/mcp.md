# World official MCP

Sources: https://docs.world.org/model-context-protocol/ · https://docs.world.org/llms.txt

## Docs MCP (no auth)

- URL: `https://docs.world.org/mcp`
- Tool: `search_world_documentation`

## Developer Portal MCP (mutates apps)

- URL: `https://developer.world.org/api/mcp`
- Auth: `Authorization: Bearer api_...` (team API key, shown once)
- Tools that exist: `get_team_context`, `get_app_config`, `create_app`, `configure_world_id`, `create_world_id_action`, `get_world_id_registration_status`, `get_world_id_signing_key`, `rotate_world_id_signing_key`, `configure_mini_app`, `upload_app_image`, `submit_app_for_review`

Do not invent other portal tools. Never ask the user to paste `signing_key.private_key` or the portal API key into chat. Persist signing keys server-side only; they are returned once.

## Prize primitives (do not invent)

- IDKit `^4.x` only. Do not use `^2` / `^3` samples.
- Selfie Check preset is `selfieCheckLegacy`. Confirm the Developer Portal flag before implementing.
- AgentKit: `@worldcoin/agentkit`, AgentBook on World Chain `eip155:480`, `agentkit.fetch`, modes `free` / `free-trial` / `discount`.
- Verify proofs by POSTing the IDKit result unchanged to `https://developer.world.org/api/v4/verify/{rp_id}`.
