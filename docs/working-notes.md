# Working notes (B0–B24 live)

Shipped index (code + explorers). Human remaining: 2–4 min video + stable `PUBLIC_DESK_URL`.

| Tickets | What landed |
| --- | --- |
| B0–B12 | Spine: 402 → pay → HCS → live Graph meter → ENSv2 → CRE TEE → `/app` + submission clocks |
| B13–B16 | Remainder refund, harness PR #59, live `join()`, Sunday stay (Hedera · ENS · Chainlink) |
| B17–B19 | `/desks` + `npm run agent`, sibling `agent-02.nametoll.eth`, TEE policy axes |
| B20 | TOLL `0.0.10483302` + two executed `wait_for_expiry` slots; snapshot 402 still `0.0.0` |
| B21–B24 | Guest session pay, `/register` (constrained records), claim + subscribe UI |

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

Parent = the 2LD we register. Child = a label under that parent's UserRegistry. Picked **`nametoll.eth`** (product name) because it was available; first child is **`desk.nametoll.eth`**. Sibling **`agent-02.nametoll.eth`** (B18) uses the same UserRegistry and a second Permissioned Resolver (salt index 1).

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
| Sibling `agent-02` | https://sepolia.etherscan.io/tx/0xd1f6f4faa9f11636fb64673ddfe6d458285e6cbf6ea79631c0d017c528c10454 |
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

Happy path still has no baked-in name. `/app` form / `GET /desk/resolve?name=` / `/desks` / buyer argv take whatever name you paste.

## Brain (B9) + Gate obeys Brain (B10)

Official template name from `cre templates list --json`: `hello-confidential-workflows-ts`. `cre init` on CLI v1.33.0 requires login, so the tree in `cre/` is that official template (cloned from `smartcontractkit/cre-templates`) then customized.

Nametoll workflow (`cre/nametoll-brain`):

- HTTP trigger (`HTTPCapability`) into `cre.handlerInTee` / `TeeRuntime`
- `runtime.getSecret({ id: "SPEND_CAP" })` — env `SPEND_CAP_TINYBARS_VAR` via `cre/secrets.yaml`. Optional `BUYER_ALLOWLIST` / `RATE_LIMIT` (B19). Empty extras stay cap-only. Desk spawn defaults those env names to `""` so `cre workflow simulate` still boots.
- Verdict-only JSON `{ allow, maxTinybars, reason }`. Public reasons: under/over cap, buyer not allowlisted, rate limited. No `ConfidentialHTTPClient`. No `usingTheDons()` (nothing confidential crosses out except the public verdict string)
- Cap used for scripted runs: `150000` tinybars. `100000` → allow. `200000` → over cap / deny

Desk:

- `createBrain` calls CRE HTTP trigger if `CRE_BRAIN_URL` is set, else `cre workflow simulate` if `CRE_PROJECT_DIR` is set, else fail closed (paid snapshot 403). Do not skip the TEE.
- `GET /desk/brain?tinybars=` and `npm run brain -- <tinybars>`
- Gate asks Brain on paid `GET /desk/snapshot` **before** verify/settle (exact settle is after-handler; a late abort would leak merchandise). Deny or skipped TEE → 403, merchandise not called, no HCS bill

`cre workflow simulate nametoll-brain --non-interactive --trigger-index 0 --http-payload … --target staging-settings` (11 Sep 2026, CLI v1.33.0):

- Allow `100000`: `docs/partners/chainlink/simulate-allow.log` — TEE Execution / AWS Nitro us-west-2, `TEE handler: verdict=allow reason=under cap`
- Deny `200000`: `docs/partners/chainlink/simulate-deny.log` — same TEE banner, `verdict=deny reason=over cap`
- Allowlist deny: `simulate-allowlist-deny.log` — `buyer not allowlisted`
- Rate deny: `simulate-rate-deny.log` — `rate limited`
- Secret cap from `getSecret("SPEND_CAP")` is `150000` (public as `maxTinybars` only). No secret env lines in the committed logs. Deploy access not enabled; simulation does not need it.

## Desk console (B11)

The desk console is `/app`. Product pages are `/` and `/landing`. Registry is `/desks`. Manual is `/docs`. It does not ship a name.

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
- `join()` unsigned calldata on the same CRE engine. Live broadcast: https://sepolia.etherscan.io/tx/0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086. Harness PR: https://github.com/hedera-dev/hedera-harness/pull/59 (open against `dev`, not merged). No harness demo video.

## Unused-remainder refund (B13)

Pinout shape, not a Pinout clone. One 402 still opens a credit pool. The snapshot burns delivered protocols. After settle, unused tinybars go back to the payer. One HCS topic — no HIP-991 dual ledger.

- Credit is the **settled** tinybars (`result.amount` if the facilitator sends it, else the 402 amount). Not a second price table.
- Burn is delivered `ok` protocols. A stub body burns every prepaid unit (no fake remainder).
- Owed = `burned * PRICE_TINYBARS`. Refund = `prepaid - owed`. HCS `units` / `tinybars` stay the owed line so `units * price = tinybars` still holds.
- Refund rail is a seller-signed HBAR `TransferTransaction` (`@hiero-ledger/sdk`). Not a Blocky402 refund route. Seller must hold enough HBAR to cover unused remainder.
- `/app` remainder station (`#station-remainder`) shows prepaid / burned / owed / refund / refundTx.
- Proved in `test/refund.test.ts` against a fake facilitator + in-memory refund rail (payer `0.0.1`, fail-soft 2 prepaid → 1 delivered → `100000` refunded).
- Live 11 Sep 2026, TEE cap still `150000` so 2-protocol settle stays denied. Remainder on the live desk is 1-protocol fail-soft (`npm run buyer -- http://127.0.0.1:8787 not-a-real-protocol`): prepaid `100000`, delivered `0`, refund `100000`. Settle https://hashscan.io/testnet/tx/0.0.7162784@1789114039.103448687. Refund CRYPTOTRANSFER https://hashscan.io/testnet/tx/0.0.10463755@1789114039.622724528 (seller `0.0.10463755` → buyer `0.0.10463842`, `100000` tinybars, SUCCESS). HCS `units` 0 / `tinybars` 0 / `prepaidTinybars` 100000 / `refundTinybars` 100000, recompute matches.

## Harness init-adopt (B14)

Nametoll never ran the harness during B0–B13. B14 required a DX bug **this** repo actually hit, so we ran `hedera-harness init` adopt against a Nametoll-shaped npm Express app (`package-lock.json`, scripts `start` / `test` / `typecheck`, no Next).

What broke: in-place adopt copies the Scaffold-HBAR skeleton. Baseline becomes `yarn install` + `yarn next:build`. `.harness/validators/yarn.json` forbids `npm install` / `npm run`. Next steps say `yarn harness:run`. Doctor/run would fail baseline before any agent work.

What we did not do: add `.harness/` to Nametoll. Invent a Yarn/Next bug we did not reproduce. Claim a harness demo video.

Fix (upstream, not this tree): https://github.com/hedera-dev/hedera-harness/pull/59 against `dev` (open, not merged). Newly written recipes pick install/build from the detected package manager and `package.json` scripts. Copilot review follow-up on that PR: non-Scaffold `static.json` no longer asserts `yarn@3.2.3` / `packages/nextjs` / README `yarn install`; `constraints.packageManager` is written so the loader does not forbid npm; adaptation is gated on the provisioner `writtenFiles` set; install fingerprint hashes `package-lock.json` and `pnpm-lock.yaml`. Existing `.harness/spec.yaml` is left untouched. Yarn / Scaffold-HBAR still get `yarn next:build` when that is the manager (or no better script exists). Test: `adopting an npm app does not plant a yarn next:build recipe`. Harness `npm test` was 201 passed after the follow-up.

## Liquidation challenge join (B15)

Same CRE engine as B9 (`cre/nametoll-brain`), not a second cloned `automated-liquidation-protection` workflow. `join()` ABI is `function join() external` from the official [ChallengeLending.sol](https://github.com/solangegueiros/cf-liquidation-protection-challenge/blob/main/contracts/ChallengeLending.sol).

- Live official address (challenge README + `frontend/addresses.ts`, 11 Sep 2026): `0x88574e7Cc0027afd04951daa09B64d4441931ba1`. `challengeOpen` = true, `numUsers` = 6 after Nametoll `join()`.
- ETHOnline prizes.txt scrape `0x59d5B29FbA5ca865a171076BE94EbEeC5BCA1E04` is an older ChallengeLending; `numUsers()` reverts. Not used.
- Same HTTP `handlerInTee`. Payload `{ "action": "join" }` still calls `getSecret`, then returns unsigned `{ to, data: 0xb688a363, chainId: 11155111, chain: ethereum-testnet-sepolia }`. Spend payloads unchanged.
- Not CRE `writeReport` (that is for report consumers, not this `join()`).
- Simulate: `docs/partners/chainlink/simulate-join.log`. `GET /desk/join` stays unsigned. `npm run join` broadcasts the same calldata with `ACC_1_PRIV_KEY` (owner). Live 11 Sep 2026: https://sepolia.etherscan.io/tx/0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086 from `0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3`. `isUser` true, `numUsers` 6. CRE handler still does not hold `CRE_ETH_PRIVATE_KEY`.

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

A third-party walk of B0–B16 against the **public** URL found the loop broken at Brain: `/desk/brain` and `/desk/inspect` returned `TEE unavailable` because the running process had neither `CRE_BRAIN_URL` nor `CRE_PROJECT_DIR`. The desk console also hid what was bought (only `ok`/`stub`/`units`), `/desk/ledger` did not attach HashScan or `units * price = tinybars` per bill, and `join()` was CLI-only.

Fixes (still fail-closed if CRE is missing):

- `server.ts` loads `cre/.env`, puts `~/.cre/bin` on `PATH`, and defaults `CRE_PROJECT_DIR` to `./cre` when `project.yaml` exists.
- `GET /health` reports `brain.source`, `merchandise` live/stub, `canPay`.
- Inspect includes a recompute preview. Paid payload includes merchandise protocol/TVL rows and an audited bill.
- `/desk/ledger` bills include `hashscanUrl` and `recompute.matches`.
- `/app` join station / `GET /desk/join` — unsigned calldata from the same CRE engine. Broadcast is `npm run join`, not this GET.
- GitHub Actions `.github/workflows/test.yml` (`npm test` + `tsc`).

Replayed on the public origin after restart:

| Check | Result |
| --- | --- |
| `/health` | `brain.source: simulate`, `merchandise: live`, `canPay: true` |
| 1 protocol inspect | TEE **allow**, HTTP 402 `100000` |
| 2 protocol inspect | TEE **deny** over cap, 402 still `200000`, Pay locked |
| `GET /desk/join` | `{ to: 0x88574e7C…, data: 0xb688a363, chainId: 11155111 }` unsigned |
| Live `join()` | https://sepolia.etherscan.io/tx/0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086 |
| Remainder fail-soft | settle `0.0.7162784@1789114039.103448687`, refund `0.0.10463755@1789114039.622724528` |
| `/app` `POST /desk/pay` 1 protocol | settle `0.0.7162784@1789111350.366520040` — https://hashscan.io/testnet/tx/0.0.7162784@1789111350.366520040 — live Aave TVL, HCS `lending-risk` `1 * 100000` matches |

Ngrok is still session-scoped. Remainder and `join()` now have live explorer evidence (above). Video recording and a stable `PUBLIC_DESK_URL` stay human tasks.

## Demo hardening (11 Sep 2026)

- **Brain cache:** only successful TEE verdicts are memoized, per tinybar amount, 60s TTL (`GET /health` → `brain.verdictTtlMs`). `TEE unavailable` and thrown simulate errors are not stored. `cre workflow simulate` is killed after 25s. Boot warms 1-unit and 2-unit amounts so the first inspect is not a cold 9s simulate.
- **Pay relay:** `POST /desk/pay` is rate-limited (8/min per IP, 24/min global). `DESK_PAY_SECRET` (optional) requires `x-desk-pay-secret` or the HttpOnly cookie set on `GET /`. When `PUBLIC_DESK_URL` is set, pay refuses names whose descriptor endpoint is a different origin. `GET /desk/inspect` stays open.
- **Bill attribution:** pay waits up to 5s for an HCS row whose `settleTx` matches. No `bills.at(-1)` fallback — topic HashScan is enough if Mirror lag has not indexed yet.
- **Copy:** loop tagline is metered units (protocol count), not bytes. `/app` meter uses pinned Messari ids. Remainder HashScan follows `config.network`.

## Discovery + TEE policy (12 Sep 2026)

Hedera extra-points directory and ENS “agents as namespaces,” without touching settle/refund math.

- **`/desks` + `GET /desk/catalog?parent=`** — Prefer Omnigraph `subdomains(first: 20)`. Hosted ENSNode TLS (`*.up.railway.app` on `api.v2-sepolia.ensnode.io`) made catalog return HTTP 404 `"fetch failed"` (12 Sep). Same transport-failure gate as resolve: walk `getSubregistry` + official `LabelRegistered` on the parent UserRegistry (`src/modules/directory/registry-children.ts`). Recent sibling `agent-02.nametoll.eth` is in the 3×8k window; older `desk.nametoll.eth` (block `11677191`) may not be. Catalog still resolves each child and probes `/desk/offer` or an unpaid 402.
- **`npm run agent -- <parent>`** — human hands only a parent namespace. Enumerate → pick by price/protocols → inspect → TEE → `payFromName` → receipt JSON.
- **`npm run ens:subname -- --label agent-02`** — sibling under the parent UserRegistry, Permissioned Resolver salt index 1, scoped `authorizeTextRoles` on the three desk keys. `--plan` is unsigned. Live 12 Sep 2026: `agent-02.nametoll.eth`, resolver `0xe41Fab44355C6169af965C7994743625198561Da`, register https://sepolia.etherscan.io/tx/0xd1f6f4faa9f11636fb64673ddfe6d458285e6cbf6ea79631c0d017c528c10454.
- **TEE policy** — `decidePolicy` in the CRE handler. Secrets: `SPEND_CAP`, optional `BUYER_ALLOWLIST`, optional `RATE_LIMIT`. Distinct reasons. Empty extra secrets keep the existing cap-only flip. HCS bills may include `verdictReason` + `verdictHash`; recompute is still units × price.
- Pay path (Blocky402 settle, remainder refund, settleTx-matched bill) is unchanged.

## Guest pay + self-serve register (12 Sep 2026)

Spectator → user without handing the operator buyer key.

- **`POST /desk/session`** — in-memory ECDSA buyer, cookie `nametoll_guest`. Seller `AccountCreate` then `TransferTransaction` 0.5 HBAR (`GUEST_FAUCET_TINYBARS`, same rail as `refund.ts`). Rate-limited with pay. Response is account id + HashScan only — no private key.
- **`/app` payer** — `operator key` (existing `HEDERA_BUYER_*`) or `my guest account`. `POST /desk/pay` `{ payer: "guest" }` signs with the session key and passes that account id to TEE inspect context.
- **`/register` + `POST /desk/register`** — label + endpoint (default `PUBLIC_DESK_URL`). `constrainedDeskRecords` forces this origin's `payTo`, `priceRule`, topic, asset `0.0.0`. Parent from `ENS_PARENT`. Write path is `issueDeskChild` (same Permissioned Resolver salt index 1 as B18).
- **Claim / subscribe** — `/app#subscribe` and `/desks` hit the existing `GET /desk/claim` / `GET /desk/subscribe` endpoints. Landing Subscribe band links those forms. Per-desk 402 pricing not shipped.

## P3 HTS + scheduled subscribe (12 Sep 2026)

Probed live `GET https://api.testnet.blocky402.com/supported`: Hedera `exact` + fee-payer `0.0.7162784`, **no advertised assets**. Official `@x402/hedera` and Hedera exact-scheme docs allow HTS, but this facilitator does not list a token. Snapshot 402 stays `0.0.0`. Do not switch the pay path.

- **TOLL** — `TokenCreate` plan with `CustomFixedFee` in HBAR (`PRICE_TINYBARS`) to the seller, collectors exempt so treasury airdrops do not self-charge. `GET /desk/hts`, `npm run hts -- plan|create|fund`.
- **Subscribe** — N `ScheduleCreateTransaction` wrappers around a transfer, `setWaitForExpiry(true)`, expiry ≤ 62 days (`5,356,800` s). Default interval is one week. `GET /desk/subscribe?slots=`, `npm run subscribe -- --plan`.
- **Claim** — `GET /desk/claim?schedule=` reads Mirror `executed_timestamp` / `deleted` / `wait_for_expiry`. One HCS bill per schedule id. TEE still gates the prepaid amount.
- ERC-8004 left out.

**Live 12 Sep 2026 (testnet)**

| | |
| --- | --- |
| TOLL | `0.0.10483302` — https://hashscan.io/testnet/token/0.0.10483302 — create `0.0.10463755@1789155985.567441938` |
| Custom fee | fixed `100000` tinybars HBAR → collector `0.0.10463755`, `all_collectors_are_exempt: true` (Mirror `custom_fees.fixed_fees`) |
| Buyer associate | `0.0.10463842@1789155993.345935080` |
| Treasury airdrop | `0.0.10463755@1789155996.194571771` (8 TOLL) |
| Slot 1 | schedule `0.0.10483309` — https://hashscan.io/testnet/schedule/0.0.10483309 — executed `1789156192.017736208`, scheduled transfer https://hashscan.io/testnet/tx/0.0.10463842@1789156008.769559934 |
| Slot 2 | schedule `0.0.10483311` — https://hashscan.io/testnet/schedule/0.0.10483311 — executed `1789156372.012777751`, scheduled transfer https://hashscan.io/testnet/tx/0.0.10463842@1789156009.185023222 |

Each executed slot: `scheduled: true`, 1 TOLL buyer `0.0.10463842` → seller `0.0.10463755`, plus protocol custom fee `100000` tinybars HBAR to the seller. Balances after both slots: seller 994 TOLL, buyer 6 TOLL.

`GET /desk/claim?schedule=` then delivered live Aave (1 unit) and appended HCS `subscribe` bills on topic `0.0.10464309` (`1 * 100000`, `scheduleId` set). Replay of slot 1 is `already claimed`. Unpaid `GET /desk/snapshot` is still HTTP 402 / asset `0.0.0`.

CRE simulate was failing after P2 because `secrets.yaml` lists `BUYER_ALLOWLIST` / `RATE_LIMIT` and the CLI requires those env names. Desk spawn now defaults the two optional vars to empty so cap-only still boots.

Policy-engine evidence (12 Sep 2026): `cre --env <patched> workflow simulate` with dummy `BUYER_ALLOWLIST_VAR=0.0.1` / payer `0.0.9` → `simulate-allowlist-deny.log` (`buyer not allowlisted`). `RATE_LIMIT_VAR=1` / `paysThisHour=2` → `simulate-rate-deny.log` (`rate limited`). Both Nitro `us-west-2`. Cap-only logs unchanged.

Expiring subname (12 Sep 2026): `gone.nametoll.eth` registered with `expiresIn=90` https://sepolia.etherscan.io/tx/0x44bbbd33adc88b3fb103eec45e2941ee4ad9eb14d8a0f446f738c7c2ac20d3ac. After expiry `getState.status` is `AVAILABLE`; catalog resolve marks it unresolved. `/register` optional `expiresIn` (60s–1y). Bazantic / ERC-8004 / A2A not built.

Blocky402 probe the same hour: `hederaExact: true`, `advertisedAssets: []`, `blocky402Hts: unadvertised`. Snapshot 402 unchanged.

