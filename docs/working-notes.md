# Working notes (B0–B8 code)

## Blocky402 probe (10 Sep 2026)

- `GET https://api.testnet.blocky402.com/health` → `{"status":"ok"}`
- Hedera fee-payer from `GET /supported`: `hedera:testnet` `extra.feePayer` = `0.0.7162784` (also `signers["hedera:*"][0]`)

## Public desk (B3)

- Origin: https://nonwaxing-xeromorphic-dagmar.ngrok-free.dev
- `GET /health` 200
- `GET /desk/snapshot` 402, `resource.url` https, `payTo` `0.0.10463755`, `extra.feePayer` `0.0.7162784`

## Live settle / HashScan (B2)

Buyer CLI paid the desk through Blocky402. Resource server held no facilitator key.

- Seller (payTo): `0.0.10463755`
- Buyer: `0.0.10463842`
- Amount: `100000` tinybars (0.001 HBAR), asset `0.0.0`
- Settle tx: `0.0.7162784@1789065380.080315812`
- HashScan: https://hashscan.io/testnet/tx/0.0.7162784@1789065380.080315812
- Public-URL settle: https://hashscan.io/testnet/tx/0.0.7162784@1789065412.888366457
- Mirror Node: `SUCCESS` `CRYPTOTRANSFER` — buyer `-100000`, seller `+100000`

```text
HASHSCAN_SETTLE=https://hashscan.io/testnet/tx/0.0.7162784@1789065380.080315812
HASHSCAN_SETTLE_PUBLIC=https://hashscan.io/testnet/tx/0.0.7162784@1789065412.888366457
```

## HCS bill (B4)

One topic for all bills. Submit key is the seller. HashScan of the HBAR transfer is not a substitute for the topic.

- Topic: `0.0.10464309`
- HashScan topic: https://hashscan.io/testnet/topic/0.0.10464309
- Mirror: https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10464309/messages
- Public ledger: `GET https://nonwaxing-xeromorphic-dagmar.ngrok-free.dev/desk/ledger`

First paid bill (11 Sep 2026):

- `requestId` `86abd05c-22dd-4eb4-a230-66b513096338`
- `name` `stub`
- `units` `1`
- `tinybars` `100000`
- `settleTx` `0.0.7162784@1789066412.788007178`
- `consensusTime` `1789066421.827643104` (matches Mirror Node)
- Recompute: `1 * 100000 = 100000`

```text
HCS_TOPIC_ID=0.0.10464309
HASHSCAN_TOPIC=https://hashscan.io/testnet/topic/0.0.10464309
HASHSCAN_SETTLE_B4=https://hashscan.io/testnet/tx/0.0.7162784@1789066412.788007178
MIRROR_TOPIC=https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10464309/messages
```

## Graph merchandise (B5, live)

Pinned Standardized lending (Messari schema 3.1.0). One query, two subgraphs. Fields confirmed via Subgraph MCP `get_schema_by_subgraph_id` (`subgraph_id` from the live tool schema) and Studio gateway introspection. Query fields are a subset of live `LendingProtocol` / `Market` — none invented.

- Aave v3 Ethereum `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk`
- Compound v3 Ethereum `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9`

`npm run graph:probe` (11 Sep 2026 19:34 UTC): `stub: false`, `units: 2`, both `ok: true`. Aave v3 TVL ≈ `$24.3B`, Compound III TVL ≈ `$1.86B`. Schema 3.1.0 on both.

`npm run graph:mcp`: same pins; required query fields present on both schemas; live names `Aave v3` and `Compound III`.

Reports (no secrets): `docs/partners/graph/gateway-live-check.json`, `docs/partners/graph/mcp-live-check.json`.

Earlier probes with a rejected key returned `auth error: API key not found`. The desk only uses the gateway key after `checkGatewayKey` succeeds; otherwise it serves a labeled stub.

Live paid snapshots (not stub), Blocky402 + HCS name `lending-risk`:

| Request | units | tinybars | settle | HashScan | HCS consensusTime |
| --- | --- | --- | --- | --- | --- |
| `?protocols=aave-v3-ethereum` | 1 | 100000 | `0.0.7162784@1789069065.269989092` | https://hashscan.io/testnet/tx/0.0.7162784@1789069065.269989092 | `1789069075.242351104` |
| both pins | 2 | 200000 | `0.0.7162784@1789069077.598478098` | https://hashscan.io/testnet/tx/0.0.7162784@1789069077.598478098 | `1789069087.478404974` |

Recompute: `1 * 100000 = 100000`, `2 * 100000 = 200000`. Topic `0.0.10464309`.

## Meter (B6)

`PRICE_TINYBARS` (default `100000`) is per requested protocol. Default `/desk/snapshot` asks for both pins → `200000` tinybars. `?protocols=aave-v3-ethereum` → `100000`. Bill `units` is the requested count, not how many indexers succeeded.

First live Blocky402 + HCS (11 Sep 2026) used a labeled stub body while the Graph key was still rejected:

| Request | units | tinybars | settle | HashScan | HCS consensusTime |
| --- | --- | --- | --- | --- | --- |
| `?protocols=aave-v3-ethereum` | 1 | 100000 | `0.0.7162784@1789067889.160198687` | https://hashscan.io/testnet/tx/0.0.7162784@1789067889.160198687 | `1789067899.536005104` |
| `?protocols=aave-v3-ethereum,compound-v3-ethereum` | 2 | 200000 | `0.0.7162784@1789067903.008348967` | https://hashscan.io/testnet/tx/0.0.7162784@1789067903.008348967 | `1789067911.095384209` |

Recompute: `1 * 100000 = 100000`, `2 * 100000 = 200000`. Mirror messages seq 2 and 3 on topic `0.0.10464309`.

## Directory (B7) + buyer-by-name (B8) — code, waiting on Sepolia

Record keys from live ENSIP-5 / ENSIP-26 only (not an invented ENSIP):

- `url`
- `agent-context` (JSON desk descriptor: `payTo`, `priceRule`, `hcsTopic`, `asset: "0.0.0"`)
- `agent-endpoint[web]`

Omnigraph query is the ensskills `domain-records` shape; fields confirmed offline with `enscli ensnode omnigraph schema` (`ResolvedRecords.texts`, `ResolvedRawTextRecord.key|value`, `Domain.resolver.effective`). Default reader: `POST https://api.v2-sepolia.ensnode.io/api/omnigraph`.

11 Sep 2026 probe: that hostname presents a `*.up.railway.app` cert (`ERR_TLS_CERT_ALTNAME_INVALID`). Directory then falls back to official `ens get text --chain sepolia --json` for the three keys. Set `ENSNODE_URL` to a reachable instance to prefer Omnigraph. Do not disable TLS.

Observable locally (no baked-in name):

- Homepage form → `GET /desk/resolve?name=`
- `npm run directory -- <name>`
- `npm run buyer -- <name>` pays `descriptor.endpoint`

Unsigned writes: `npm run ens:writes -- --owner 0x… --operator 0x… --parent <name-you-chose> --child desk`. Order matches `vendor/ens-cli/README.md`: Permissioned Resolver deploy **before** register, then UserRegistry + child, then `set batch`. EAC uses official `authorizeTextRoles` on those three keys only (ens-cli has no grant command). `--reverse-record` is not used.

**Still needed from a human:** funded Sepolia owner + operator addresses, pick a parent name, broadcast the unsigned txs, then a live `npm run directory -- <that-name>` that returns the public desk URL / `0.0.10463755` / `0.0.10464309`. Until then B7/B8 stay unchecked.
