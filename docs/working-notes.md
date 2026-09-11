# Working notes (B0–B16 live)

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

## Directory (B7) + buyer-by-name (B8) — live on Sepolia

Parent = the 2LD we register. Child = a label under that parent's UserRegistry. Picked **`nametoll.eth`** (product name) because it was available; child is **`desk.nametoll.eth`**.

Record keys from live ENSIP-5 / ENSIP-26 only:

- `url`
- `agent-context` (JSON desk descriptor: `payTo`, `priceRule`, `hcsTopic`, `asset: "0.0.0"`)
- `agent-endpoint[web]`

| | |
| --- | --- |
| Owner (acc 1) | `0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3` |
| Operator (acc 3) | `0xFeAf5C921996FC53f4DEf35e181E766e6D74690A` |
| Permissioned Resolver | `0x558283D5F8E36316B60be7e24F4e58C7133752D2` |
| Parent UserRegistry | `0x0531cdfAa619d1Ce33B37e87AAcD685bEcd976B9` |
| Resolver deploy | https://sepolia.etherscan.io/tx/0x4d04f08a4cff2271c1a8e485cf397210db97c32530fbd0ace9ca11146ed06c49 |
| Commit | https://sepolia.etherscan.io/tx/0x0646c91dd5488452309246817cc85e903903fdb118b4c2fee1970d8a94e0e268 |
| Register | https://sepolia.etherscan.io/tx/0x28ab9c164cca6f967413f944a3ef1f81ca3ef86f7e1620fdc5b7a57d8d7a8a96 |
| Subregistry deploy | https://sepolia.etherscan.io/tx/0x8a4c0bad2e2bd68d2331c21f2bca2a33d2d4265a047ddfcad5db772529a94c13 |
| Subregistry set | https://sepolia.etherscan.io/tx/0xf46812dfcaef67de3a6bcea3eb44a07d35f16c20f0417a7707f633e9772041f8 |
| Child `desk` | https://sepolia.etherscan.io/tx/0x52534da2069e2ac9aae5cf48a22a485f9b23dacab210360e62527a6f25fa54f3 |
| Texts (parent) | https://sepolia.etherscan.io/tx/0x435eefab224179f0655616235a0866fccaaa3defe0a167555ef20e847c2fc5bb |
| EAC `url` | https://sepolia.etherscan.io/tx/0x05549a859deb42517f633230d8872f2437a2500d6185ce1c1643ace5cebc0d26 |
| EAC `agent-context` | https://sepolia.etherscan.io/tx/0x2720e3b5837fef7eb722f20b47ffc307b1f40df784cbb83f8626d21b14a17a87 |
| EAC `agent-endpoint[web]` | https://sepolia.etherscan.io/tx/0xc95c9d7dbcb64eac7b58a94cfe12bcf340ec0e4613497c5f14cd2d8b4d5a7ae2 |

The owner EOA had an EIP-7702 delegation (`0xef0100…`). ENSv2 mints an ERC-1155 to the owner, so that delegation was revoked first (`0x0b903c239ac28505de7b548804d0bebfdd5477597d1b19006ce923a5f044885a`) or register reverts `ERC1155InvalidReceiver`.

Hosted Omnigraph still presents a `*.up.railway.app` cert. Resolve falls through official Universal Resolver `findResolver` + Permissioned Resolver `text()`. `pkg.pr.new` ens-cli is 404; do not disable TLS.

Operator EAC (account 3, `ROLE_SET_TEXT` on those three keys only):

- Set `agent-endpoint[web]` to `http://127.0.0.1:8787` — https://sepolia.etherscan.io/tx/0xe50628e553c6590766a8345623b812b65348f58718ac9e51bc65591c598625c5
- Next `npm run directory -- nametoll.eth` returned that localhost origin
- Restored public origin — https://sepolia.etherscan.io/tx/0xda64ff1de7d17d5720aab300699e0c104cdbb2f215259ab1472be3451ed98502

Buyer-by-name (11 Sep 2026): `npm run buyer -- nametoll.eth` → resolved public desk → Blocky402 settle `0.0.7162784@1789071522.046063925` — https://hashscan.io/testnet/tx/0.0.7162784@1789071522.046063925 — live Graph body, `units: 2`.

Happy path still has no baked-in name. Homepage form / `GET /desk/resolve?name=` / buyer argv take whatever name you paste.

## Brain (B9) + Gate obeys Brain (B10)

Official template name from `cre templates list --json`: `hello-confidential-workflows-ts`. `cre init` on CLI v1.33.0 requires login, so the tree in `cre/` is that official template (cloned from `smartcontractkit/cre-templates`) then customized.

Nametoll workflow (`cre/nametoll-brain`):

- HTTP trigger (`HTTPCapability`) into `cre.handlerInTee` / `TeeRuntime`
- `runtime.getSecret({ id: "SPEND_CAP" })` — env `SPEND_CAP_TINYBARS_VAR` via `cre/secrets.yaml`
- Verdict-only JSON `{ allow, maxTinybars, reason }`. No `ConfidentialHTTPClient`. No `usingTheDons()` (nothing confidential crosses out except the public verdict string)
- Cap used for scripted runs: `150000` tinybars. `100000` → allow. `200000` → over cap / deny

Desk:

- `createBrain` calls CRE HTTP trigger if `CRE_BRAIN_URL` is set, else `cre workflow simulate` if `CRE_PROJECT_DIR` is set, else fail closed (paid snapshot 403). Do not skip the TEE.
- `GET /desk/brain?tinybars=` and `npm run brain -- <tinybars>`
- Gate asks Brain on paid `GET /desk/snapshot` **before** verify/settle (exact settle is after-handler; a late abort would leak merchandise). Deny or skipped TEE → 403, merchandise not called, no HCS bill

`cre workflow simulate nametoll-brain --non-interactive --trigger-index 0 --http-payload … --target staging-settings` (11 Sep 2026, CLI v1.33.0):

- Allow `100000`: `docs/partners/chainlink/simulate-allow.log` — TEE Execution / AWS Nitro us-west-2, `TEE handler: verdict=allow reason=under cap`
- Deny `200000`: `docs/partners/chainlink/simulate-deny.log` — same TEE banner, `verdict=deny reason=over cap`
- Secret cap from `getSecret("SPEND_CAP")` is `150000` (public as `maxTinybars` only). No secret env lines in the committed logs. Deploy access not enabled; simulation does not need it.

## Judge blotter (B11)

The homepage is the 2–4 min video desk. It does not ship a name.

Stations, in order: paste name → descriptor → TEE reason → unpaid 402 → snapshot → HashScan settle + HCS topic.

- Empty: “Paste a name to open the desk.”
- Error: unknown / missing name (`GET /desk/inspect` 400/404).
- Deny: TEE `allow: false` → Pay stays locked, `POST /desk/pay` 403, no merchandise, no HCS bill.
- Pay uses the server-side buyer signer (`HEDERA_BUYER_*`). If those keys are unset, Pay is disabled and the desk says so (CLI `npm run buyer -- <name>` still works).
- Meter control: 1 protocol (`100000` tinybars) vs 2 (`200000`). With the B9 cap `150000`, that is the on-camera allow vs deny flip.
- Inspect/pay hit the **resolved** endpoint (B8), not a baked-in URL.

```bash
curl -sS "http://127.0.0.1:8787/desk/inspect?name=<paste-a-name>&protocols=aave-v3-ethereum"
curl -sS -X POST http://127.0.0.1:8787/desk/pay \
  -H 'content-type: application/json' \
  -d '{"name":"<paste-a-name>","protocols":["aave-v3-ethereum"]}'
```

Live inspect (11 Sep 2026, pasted `nametoll.eth`, 1 protocol): descriptor endpoint `https://nonwaxing-xeromorphic-dagmar.ngrok-free.dev`, HCS `0.0.10464309`, unpaid 402 amount `100000` / asset `0.0.0` / payTo `0.0.10463755`. An earlier process without `CRE_BRAIN_URL` / `CRE_PROJECT_DIR` fail-closed (`TEE unavailable`). That is no longer the public desk — see Judge pass below.

## Submission pack (B12)

Form stays Hedera + ENS + Chainlink. World and Graph are not on the form.

- Timestamp table lives at the top of `README.md` (2–4 min, 720p, human voice).
- Filled `docs/analysis.md` §9 rows: `docs/submission.md`.
- Public repo: https://github.com/shreyas-sovani/Nametoll
- AI attributed in the README. Human still records the video.
- `join()` unsigned calldata on the same CRE engine. No join tx. Harness PR: https://github.com/hedera-dev/hedera-harness/pull/59 (open against `dev`, not merged). No harness demo video.

## Unused-remainder refund (B13)

Pinout shape, not a Pinout clone. One 402 still opens a credit pool. The snapshot burns delivered protocols. After settle, unused tinybars go back to the payer. One HCS topic — no HIP-991 dual ledger.

- Credit is the **settled** tinybars (`result.amount` if the facilitator sends it, else the 402 amount). Not a second price table.
- Burn is delivered `ok` protocols. A stub body burns every prepaid unit (no fake remainder).
- Owed = `burned * PRICE_TINYBARS`. Refund = `prepaid - owed`. HCS `units` / `tinybars` stay the owed line so `units * price = tinybars` still holds.
- Refund rail is a seller-signed HBAR `TransferTransaction` (`@hiero-ledger/sdk`). Not a Blocky402 refund route. Seller must hold enough HBAR to cover unused remainder.
- Blotter station 06 (`#station-remainder`) shows prepaid / burned / owed / refund / refundTx.
- Proved in `test/refund.test.ts` against a fake facilitator + in-memory refund rail (payer `0.0.1`, fail-soft 2 prepaid → 1 delivered → `100000` refunded).
- No live refund HashScan in this note. Do not invent one. A public-desk fail-soft pay (or an allow that covers 2 protocols when one indexer is down) is what would produce it. The live CRE cap `150000` still denies a 2-protocol settle, so a live remainder on camera is 1-protocol fail-soft (0 delivered → full refund) unless the cap is raised.

## Harness init-adopt (B14)

Nametoll never ran the harness during B0–B13. B14 required a DX bug **this** repo actually hit, so we ran `hedera-harness init` adopt against a Nametoll-shaped npm Express app (`package-lock.json`, scripts `start` / `test` / `typecheck`, no Next).

What broke: in-place adopt copies the Scaffold-HBAR skeleton. Baseline becomes `yarn install` + `yarn next:build`. `.harness/validators/yarn.json` forbids `npm install` / `npm run`. Next steps say `yarn harness:run`. Doctor/run would fail baseline before any agent work.

What we did not do: add `.harness/` to Nametoll. Invent a Yarn/Next bug we did not reproduce. Claim a harness demo video.

Fix (upstream, not this tree): https://github.com/hedera-dev/hedera-harness/pull/59 against `dev` (open, not merged). Newly written recipes pick install/build from the detected package manager and `package.json` scripts. Copilot review follow-up on that PR: non-Scaffold `static.json` no longer asserts `yarn@3.2.3` / `packages/nextjs` / README `yarn install`; `constraints.packageManager` is written so the loader does not forbid npm; adaptation is gated on the provisioner `writtenFiles` set; install fingerprint hashes `package-lock.json` and `pnpm-lock.yaml`. Existing `.harness/spec.yaml` is left untouched. Yarn / Scaffold-HBAR still get `yarn next:build` when that is the manager (or no better script exists). Test: `adopting an npm app does not plant a yarn next:build recipe`. Harness `npm test` was 201 passed after the follow-up.

## Liquidation challenge join (B15)

Same CRE engine as B9 (`cre/nametoll-brain`), not a second cloned `automated-liquidation-protection` workflow. `join()` ABI is `function join() external` from the official [ChallengeLending.sol](https://github.com/solangegueiros/cf-liquidation-protection-challenge/blob/main/contracts/ChallengeLending.sol).

- Live official address (challenge README + `frontend/addresses.ts`, 11 Sep 2026): `0x88574e7Cc0027afd04951daa09B64d4441931ba1`. `challengeOpen` = true, `numUsers` = 5.
- ETHOnline prizes.txt scrape `0x59d5B29FbA5ca865a171076BE94EbEeC5BCA1E04` is an older ChallengeLending; `numUsers()` reverts. Not used.
- Same HTTP `handlerInTee`. Payload `{ "action": "join" }` still calls `getSecret`, then returns unsigned `{ to, data: 0xb688a363, chainId: 11155111, chain: ethereum-testnet-sepolia }`. Spend payloads unchanged.
- Not CRE `writeReport` (that is for report consumers, not this `join()`).
- Simulate: `docs/partners/chainlink/simulate-join.log`. No join tx broadcast. A Sepolia wallet still has to send the calldata. Do not invent a HashScan.

## Sunday form swap (B16)

Evaluated 11 Sep 2026 after B0–B15 were green (Nametoll vitest 100, CRE bun 8, `tsc --noEmit`, Blocky402 `/health` + `/supported` fee-payer `0.0.7162784`, public desk `/health` 200).

PRD window: stay Chainlink if simulate logs exist; Graph only if composition **and** a reusable SKILL are real; World only if the Selfie flag is already on. Kill if picking a partner that did not land.

| Slot rule | What is true | Call |
| --- | --- | --- |
| Chainlink simulate logs | `simulate-allow.log`, `simulate-deny.log`, `simulate-join.log` all show TEE Execution. Gate 403s when Brain denies. | **Keep** third slot |
| Graph composition | One Messari lending query, two pinned subgraphs, MCP schema fetch, fail-soft. Live probe notes above. | Merchandise only |
| Graph reusable SKILL | No Nametoll `SKILL.md` for the desk/query. `.agents/skills/subgraph-dev` is the upstream pack. | **Do not** form-pick |
| World Selfie flag | No `@worldcoin/idkit` in `package.json`. No `selfieCheckLegacy` in `src/`. `.env.example` has no World portal names. Flag not confirmed on. | **Do not** form-pick |

README swap record was written first. Form line was not changed. Submission pack still Hedera · ENS · Chainlink.

## Judge pass (11 Sep 2026)

A third-party walk of B0–B16 against the **public** URL found the loop broken at Brain: `/desk/brain` and `/desk/inspect` returned `TEE unavailable` because the running process had neither `CRE_BRAIN_URL` nor `CRE_PROJECT_DIR`. The blotter also hid what was bought (only `ok`/`stub`/`units`), `/desk/ledger` did not attach HashScan or `units * price = tinybars` per bill, and `join()` was CLI-only.

Fixes (still fail-closed if CRE is missing):

- `server.ts` loads `cre/.env`, puts `~/.cre/bin` on `PATH`, and defaults `CRE_PROJECT_DIR` to `./cre` when `project.yaml` exists.
- `GET /health` reports `brain.source`, `merchandise` live/stub, `canPay`.
- Inspect includes a recompute preview. Paid payload includes merchandise protocol/TVL rows and an audited bill.
- `/desk/ledger` bills include `hashscanUrl` and `recompute.matches`.
- Blotter station 07 / `GET /desk/join` — unsigned calldata from the same CRE engine. No broadcast.
- GitHub Actions `.github/workflows/test.yml` (`npm test` + `tsc`).

Replayed on the public origin after restart:

| Check | Result |
| --- | --- |
| `/health` | `brain.source: simulate`, `merchandise: live`, `canPay: true` |
| 1 protocol inspect | TEE **allow**, HTTP 402 `100000` |
| 2 protocol inspect | TEE **deny** over cap, 402 still `200000`, Pay locked |
| `GET /desk/join` | `{ to: 0x88574e7C…, data: 0xb688a363, chainId: 11155111 }` no tx |
| Blotter `POST /desk/pay` 1 protocol | settle `0.0.7162784@1789111350.366520040` — https://hashscan.io/testnet/tx/0.0.7162784@1789111350.366520040 — live Aave TVL, HCS `lending-risk` `1 * 100000` matches |

Ngrok is still session-scoped. Remainder still has no live fail-soft HashScan (2-protocol pay is over cap). Do not invent one.
