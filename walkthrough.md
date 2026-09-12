# Nametoll — operator walkthrough

This is what you see, what it means, and what happens when you press things.

Nametoll is a **named pay desk**. The product is one loop:

```text
name (ENSv2) → TEE allow (CRE) → pay (Blocky402) → metered units → HCS bill
```

Everything else is a side rail. If a click is not on that loop, this file says so.

**Form picks:** Hedera · ENS · Chainlink. Graph is the merchandise (what you buy), not a prize slot.

---

## Before you sit down

### Which URL

| Origin | When to use it |
| --- | --- |
| `http://127.0.0.1:8787` | Local desk. Fast. A remote judge cannot hit it. |
| `https://nonwaxing-xeromorphic-dagmar.ngrok-free.dev` | Current public tunnel (session-scoped). Dies when the laptop process stops. |

Localhost is not the demo target. If the tunnel is dead, host `npm start` and set `PUBLIC_DESK_URL`.

Ngrok free often shows a browser interstitial (“Visit Site”). Click through once. API clients must send `ngrok-skip-browser-warning: 1`. If you open `/desk/snapshot` in a tab without that header, you may see HTML instead of HTTP 402.

### What you will paste

The happy path **does not ship a name**. The box is empty on purpose. Tests forbid `.eth` on the landing page.

Live names you may type (they are not defaults):

| Name | What it is |
| --- | --- |
| `nametoll.eth` | Parent. Resolves to the same desk records as the child. |
| `desk.nametoll.eth` | First child under the parent UserRegistry. |
| `agent-02.nametoll.eth` | Sibling with its own Permissioned Resolver. Omnigraph can lag; if `/desks` omits it, paste it on `/app` anyway. |

### Numbers you should already know

| Fact | Value | Why it matters on camera |
| --- | --- | --- |
| Price | `100000` tinybars per requested protocol (`0.001` HBAR) | 1 vs 2 is visibly different |
| Spend cap | `150000` tinybars (secret in the TEE) | 1 protocol allows, 2 denies |
| Asset | `0.0.0` = HBAR | Snapshot 402 never switches to TOLL |
| Seller / payTo | `0.0.10463755` | Who receives the HBAR |
| Buyer (server Pay) | `0.0.10463842` | Who `/app` Pay spends in **operator key** mode. **my guest account** spends the session faucet account. |
| Fee-payer | `0.0.7162784` (Blocky402 `/supported`) | Shows up as the settle tx account |
| HCS topic | `0.0.10464309` | The public bill book |
| TEE cache | 60s, per amount + payer + hour-count | First open of a new amount can take ~9s |

### What you should not do

- Do not bake a name into the take. Type or paste it.
- Do not treat TOLL / subscribe as the pay path. Snapshot 402 stays HBAR.
- Do not click **Pay** ten times to “make sure.” Each success is a real settle. Rate limit is 8/min per IP, 24/min global.
- Do not expect `/` to be the console. The drive UI is `/app`.

---

## The chrome (every page)

Top bar, left to right:

| Control | What you see | What happens |
| --- | --- | --- |
| **Nametoll** (mark + word) | Brand | Goes to `/` (product page, same as `/landing`) |
| **Product** | Nav | `/landing`. `aria-current` when you are on `/` or `/landing` |
| **Desks** | Nav | `/desks` registry |
| **Desk** | Nav | `/app` console |
| **Docs** | Nav | `/docs` manual |
| **Open desk** | Solid CTA | `/app`. Hidden when you are already on `/app` |

Footer, every page:

- Left: `Nametoll · named pay desk · HTTP 402`
- Right: `/health` · Desks · Manual · “resource server holds no facilitator key”

`/health` is JSON, not a pretty page. Expected when the public desk is honest:

```json
{
  "ok": true,
  "service": "nametoll",
  "brain": { "source": "simulate", "configured": true, "verdictTtlMs": 60000 },
  "merchandise": "live",
  "canPay": true
}
```

| Field | If it is wrong |
| --- | --- |
| `brain.source: "unavailable"` | Inspect will fail-closed. Restart with `./cre` + `cre/.env`. Do not skip the TEE. |
| `merchandise: "stub"` | Graph key missing. Pay still works; snapshot is labeled stub, not live Aave. |
| `canPay: false` | **Pay** on `/app` stays locked even after TEE allow. Use `npm run buyer -- <name>`. |

---

## Act 0 — Product page (`/` or `/landing`)

### What you see

A light SaaS page (bone white, terracotta accent), not a ticket blotter.

Left: eyebrow `Named toll · HTTP 402` with a small lamp, headline **Pay any desk by its name.**, lede about agents / 402 / HBAR / public bill. Three buttons:

- **Open desk** → `/app`
- **Browse desks** → `/desks`
- **Read the manual** → `/docs`

Right: a card stamped **402**, titled **One request, five gates**: Name → Cap → 402 → Meter → Bill.

Below that, a static facts strip (HTTP 402, x402 v2, asset 0.0.0, TEE, remainder, HCS…). Then **The loop** (five lanes), **What the desk sells** (Aave v3 Ethereum + Compound III), **This origin** (live config grid), **For operators** (Directory / Spend cap / Public bill / Subscribe).

### What it means

This page is the pitch. It does **not** resolve a name and it does **not** spend HBAR. Status rows are live config from this process: network, price, payTo (HashScan link), HCS topic, facilitator URL, and whether this origin has a buyer signer.

### What happens if you press something

| You press | Expected |
| --- | --- |
| **Open desk** / nav **Desk** / CTA | Console. Empty name box. Seven empty stations. |
| **Browse desks** | Registry. Empty parent box. |
| **Read the manual** | In-app docs. Left TOC jumps to sections. |
| payTo / HCS topic links in **This origin** | New tab on HashScan. Does not pay. |
| `/desk/ledger` in that grid | Raw JSON of recent bills. |
| Scroll | Sections fade in (`.reveal`). Reduced-motion users see them immediately. |

There is no name field here. If you came to type `nametoll.eth`, you are on the wrong page — go to **Desks** or **Desk**.

---

## Act 1 — Registry (`/desks`)

This is Hedera extra-points “directory”: another agent finds a service by namespace, not by a pasted URL.

### What you see

Left rail:

- Eyebrow **Directory**, title **Findable desks**
- **This origin:** `GET /desk/catalog?parent=`, `/desk/offer`, price, network

Right console:

- Title **Desks under a name.**
- Form: **Parent namespace** (empty, placeholder “Paste a parent name”) + **List desks**
- Banner: *Paste a parent name. Children with desk records appear here.*

### What to do

1. Paste `nametoll.eth` (parent, not the child).
2. Press **List desks**.

The form writes `?parent=nametoll.eth` into the URL (reload-safe). Then it calls `GET /desk/catalog?parent=nametoll.eth`.

That request: Omnigraph `subdomains(first: 20)` when ENSNode answers; if that `fetch` fails (hosted cert is `*.up.railway.app`), walk `getSubregistry` + official `LabelRegistered` on the parent UserRegistry (recent ~24k Sepolia blocks). Then resolve each child → probe `/desk/offer` (or unpaid `/desk/snapshot`) with a 4s timeout.

First load can take several seconds. There is no spinner copy; the banner just disappears until cards land.

### What you should see after a good list

One card per child. Typical:

| Field on the card | Meaning |
| --- | --- |
| Lamp + **live** | Resolver texts exist **and** the endpoint answered |
| **name** | e.g. `desk.nametoll.eth` |
| **price** | Price rule from `agent-context` |
| **protocols** | From `/desk/offer` if the probe got it |
| **endpoint** | Origin the name currently points at |
| **payTo** | Hedera account id |
| **Open on desk** | Only if status is `live` → `/app?name=desk.nametoll.eth` |

Other statuses:

| Status | Lamp | Meaning | Open on desk? |
| --- | --- | --- | --- |
| `live` | green / allow | Resolved + reachable | Yes |
| `unresolved` | idle | Child exists in the list but desk texts failed | No |
| `unreachable` | error | Resolved, but offer/snapshot probe failed (dead ngrok, TLS, timeout) | No |

`desk.nametoll.eth` may be missing from the list: the on-chain fallback only reads recent `LabelRegistered` windows, and that child registered at block `11677191`. `agent-02.nametoll.eth` is usually in the window. Paste either child on `/app` if you need it on camera. That is a log-window limit, not a failed mint.

### What happens if you…

| You do | Expected |
| --- | --- |
| Press **List desks** with an empty box | Banner stays: paste a parent. URL drops `?parent=`. |
| Paste a name with no children | *No children under that parent.* |
| Paste a garbage string | Red banner: catalog / resolve error. |
| Reload `?parent=nametoll.eth` | Auto-lists. You do not press again. |
| Click **Open on desk** | Console opens with the **child** name prefilled. Stations still empty until **Open desk**. |
| Open `/desk/offer` in another tab | JSON price + protocol ids for **this** origin. Not a pay. Not a 402. |

### Insight

The registry never pays. It answers “what desks exist under this parent, and is that shop taking money?” The consuming agent (`npm run agent -- nametoll.eth`) does the same list, then picks the cheapest live desk that covers the protocols, then pays. You are looking at that directory with a human face.

Below the list: **Have a schedule?** → `GET /desk/claim?schedule=`. Same claim as `/app#subscribe`. Replay of a billed slot is refused.

---

## Act 1b — Register (`/register`)

Form: **Child label** + **Endpoint** (defaults to this origin) + optional **Expires in (seconds)** → `POST /desk/register`. Bound is 60s–1 year. Empty expiry is one year. After expiry the child is unresolved on `/desks` (live proof: `gone.nametoll.eth`, https://sepolia.etherscan.io/tx/0x44bbbd33adc88b3fb103eec45e2941ee4ad9eb14d8a0f446f738c7c2ac20d3ac).

The operator write path issues the child. Price, pay-to, topic, and asset stay this desk's. A body that sends a different `payTo` / `priceRule` is ignored. Set `ENS_PARENT` or the POST returns 400.

After a good issue, list the parent on `/desks` again. The new label should appear once Sepolia + the catalog fallback see `LabelRegistered`.

---

## Act 2 — Desk console (`/app`), empty

This is the page you drive for the 2–4 min video.

### Layout

**Left rail — “This desk”** (config, not the name you pasted):

- Lane lamp (idle / busy / allow / deny / error / settled)
- snapshot path, asset `0.0.0 HBAR`, network, price, payTo, HCS topic
- Links: `/desk/ledger`, `/desk/brain?tinybars=`, inspect, pay, subscribe, HTS
- TEE cache note, merchandise note, facilitator URL
- **Meter catalog:** Aave v3 Ethereum (`aave-v3-ethereum`) and Compound III (`compound-v3-ethereum`)

Click a HashScan link in the rail anytime. It does not inspect or pay.

**Right — the drive form**

| Control | Default | What it is |
| --- | --- | --- |
| **Name** | empty, “paste a name” | The only input that picks a desk |
| **Meter** | `1 protocol · 1 × price` | Which protocol ids go on inspect/pay |
| **Payer** | `operator key` | Or `my guest account` after **Create guest account** |
| **Open desk** | enabled | `GET /desk/inspect` — no money |
| **Pay** | **disabled** | `POST /desk/pay` — operator key or guest session |
| **TEE join()** | enabled | `GET /desk/join` — unsigned calldata, no broadcast |
| **Create guest account** | enabled | `POST /desk/session` — faucet 0.5 HBAR, cookie only |

Banners under the form (only one shows at a time):

| Id | Color | Default / when |
| --- | --- | --- |
| empty | neutral | *Paste a name to open the desk. Empty on purpose — the happy path does not ship a name.* |
| error | red | Resolve failed, inspect failed, pay refused, no buyer keys |
| deny | deny | TEE `allow: false` |
| ok | green | TEE allowed, or settled, or unsigned join ready |

**Seven stations**, empty until you act:

1. **01 Descriptor** — what the name resolved to
2. **02 TEE** — allow/deny, public reason, cap vs requested
3. **03 402** — unpaid challenge (tinybars, asset, payTo)
4. **04 Snapshot** — filled only after a successful Pay
5. **05 HashScan + HCS** — settle + topic + recompute
6. **06 Remainder** — prepaid / burned / owed / refund
7. **07 TEE join()** — filled only after **TEE join()**

Click any station value (not a link) to copy it. Title is “Copy”.

Below the stations: **Subscribe + claim** (`#subscribe`). Plan unsigned slots (`GET /desk/subscribe?slots=`) or claim a schedule id. This is not the 402 rail.

If you arrived from `/app?name=desk.nametoll.eth` or `#name=…`, the box is prefilled. **Open desk is not auto-clicked.** You still press it.

---

## Act 3 — Over-cap deny (meter = 2)

This is the Chainlink beat: the TEE changes whether money can move.

### What to do

1. Paste `nametoll.eth` or `desk.nametoll.eth`.
2. Set **Meter** to `2 protocols · 2 × price`.
3. Press **Open desk**.

### What happens under the button

- Submit is intercepted (no full page navigation).
- Stations wipe. **Pay** locks. Lamp → `busy`. Button reads **Opening…**
- Request: `GET /desk/inspect?name=…&protocols=aave-v3-ethereum,compound-v3-ethereum`
- Server: resolve name → ask Brain for `200000` tinybars → GET the resolved endpoint’s unpaid snapshot (402 body)

Cold Brain (`cre workflow simulate`) can take ~9 seconds the first time that amount is seen. Repeats of the same amount + payer + hour-count reuse a 60s cache. Failures are not cached.

### What you should see

Banner (deny):

> TEE denied: over cap. No settle, no snapshot.

Lamp: `deny`. **Pay** stays disabled.

| Station | Expected |
| --- | --- |
| 01 Descriptor | `name`, `endpoint` (public origin), `payTo` `0.0.10463755`, price rule, `hcsTopic` `0.0.10464309`, `asset` `0.0.0` |
| 02 TEE | `allow` **false**, `reason` **over cap**, `maxTinybars` `150000`, `requested` `200000` |
| 03 402 | `status` `402`, `amount` `200000`, `HBAR` `0.002 HBAR`, `asset` `0.0.0`, `payTo`, `scheme` exact, recompute preview `2 * 100000 = 200000` |
| 04–06 | still empty |
| 07 | still empty unless you already clicked join |

### What it means

The name is real. The shop is real. The 402 is real (two units cost twice one). The enclave still said **no**. The desk will not settle, will not fetch Aave/Compound, will not write an HCS bill.

If you smash **Pay** anyway: it is disabled. The click does nothing.

### Insight

Station 03 showing 402 during a deny is correct. 402 is “this is the price.” The TEE is “you may not pay it.” Those are different gates. A judge who only looks at 402 will miss the product.

---

## Act 4 — Under-cap open (meter = 1)

### What to do

1. Keep the same name.
2. Set **Meter** to `1 protocol · 1 × price`.
3. Press **Open desk** again.

**Open desk always re-inspects.** Stations 04–06 clear. A previous settle is no longer on screen. That is not a refund; you just wiped the view.

Meter `1` sends only `aave-v3-ethereum` (first pinned id). It does not send Compound.

### What you should see

Banner (ok):

> TEE allowed. Unpaid GET is HTTP 402. Pay to settle.

Lamp: `allow`. **Pay** unlocks if `canPay` is true.

| Station | Expected |
| --- | --- |
| 01 | Same descriptor (same name) |
| 02 | `allow` **true**, `reason` **under cap**, `maxTinybars` `150000`, `requested` `100000` |
| 03 | `status` `402`, `amount` `100000`, `HBAR` `0.001 HBAR` |

Still no snapshot. You have not paid.

### If Pay stays locked after allow

Banner flips to error:

> Desk has no buyer signer. Set buyer keys and restart, or use the buyer CLI.

That is `canPay: false`. Inspect still worked. Spend from a terminal:

```bash
npm run buyer -- nametoll.eth
```

### Dangerous combo (read this)

**Pay uses the meter dropdown at click time, not the meter you last inspected.**

If you inspect at 1 protocol (Pay unlocked), then flip the dropdown to 2, then press **Pay**, the server re-inspects at `200000` and returns 403 / over cap. The UI shows the deny stations. That is correct. Re-open at 1 before you pay on camera.

---

## Act 5 — Pay

This is the Hedera beat. Real HBAR. Real HashScan.

### What to do

Meter still **1**. Banner still allow. Press **Pay**.

### What happens

- Button: **Paying…**, lamp `busy`, Pay disabled for the request
- `POST /desk/pay` with `{ "name": "<what is in the box>", "protocols": ["aave-v3-ethereum"], "payer": "operator" }` (or `"guest"`)
- Cookies included (`credentials: "same-origin"`). If `DESK_PAY_SECRET` is set, the page already received HttpOnly cookie `nametoll_pay` when you loaded `/`, `/landing`, `/app`, `/desks`, `/docs`, or `/register`. You do not type it. Guest pay also sends `nametoll_guest`.
- Server: rate limit → optional secret → re-inspect → TEE must still allow → `PUBLIC_DESK_URL` pin (if set, the name’s endpoint must be this origin) → Blocky402 settle → merchandise → wait up to ~5s for an HCS row whose `settleTx` matches

First settle after a cold Brain can still feel slow. Give it 15–20s before assuming death.

### What you should see (happy path)

Banner:

> Settled. Open HashScan and recompute the HCS topic.

Lamp: `settled`. **Pay** re-enables (you *can* pay again — do not, unless you mean to).

**04 Snapshot**

| Row | Expected |
| --- | --- |
| status | `200` |
| units | `1` |
| stub | `false` |
| ok | count of protocols that answered |
| Aave v3 Ethereum | `tvl $…` (live) |

If `stub` is `true`, the Graph key is missing or rejected. Say so; do not pretend it is live.

**05 HashScan + HCS**

| Row | Expected |
| --- | --- |
| settleTx | `0.0.7162784@…` — Blocky402 fee-payer, not the buyer id |
| HashScan | clickable `https://hashscan.io/testnet/tx/…` |
| HCS topic | `0.0.10464309` |
| tinybars | `100000` |
| consensus | Mirror consensus time |
| recompute | `units * priceTinybarsPerUnit = tinybars` |
| matches | `true` |

If Mirror is slow, **04 can fill and 05 can omit the bill block**. HashScan of the settle still counts. Do not invent a bill from “the last row on the topic.” The desk refuses that fallback on purpose.

**06 Remainder** (full delivery)

| Row | Expected |
| --- | --- |
| prepaid | `100000` |
| burned units | `1` |
| owed | `100000` |
| refund | `0` or empty |
| refundTx | empty |

Prepaid = 402 amount. Owed = delivered units × price. You asked for 1, Aave delivered 1, nothing to return.

### What Pay is *not*

- It is not your wallet. It is the **operator buyer key** on the server (`HEDERA_BUYER_*`). Demo convenience so a judge clicks once.
- It is not a facilitator key. The resource server must not hold Blocky402’s key.
- It does not broadcast `join()`. Different button.

### Errors you might see

| Banner / status | Meaning | What to do |
| --- | --- | --- |
| `Pay rate limit. Retry shortly.` | 8/min IP or 24/min global | Wait. Do not hammer. |
| `Pay requires x-desk-pay-secret` | Cookie missing (wrong origin, blocked cookies) | Load `/app` on the same origin again, or send the header from curl |
| `Pay is pinned to this desk's public URL.` | Name points at localhost / old ngrok while `PUBLIC_DESK_URL` is set | Operator must `setText` the endpoint, or pay without the pin locally |
| `Pay refused.` / 502 | Settle or drive failed | Check `/health`, Blocky402, buyer HBAR |
| Deny banner after Pay | Meter was 2, or cap/allowlist/rate flipped | Re-open at 1 protocol |

---

## Act 6 — Prove the bill (HashScan + ledger)

### On `/app`

1. Click **HashScan** in station 05. New tab. Expect `SUCCESS` `CRYPTOTRANSFER`: buyer `0.0.10463842` −100000, seller `0.0.10463755` +100000. The tx id is under the **fee-payer** account `0.0.7162784`.
2. Click **HCS topic** `0.0.10464309`. Messages are base64. You do not decode on camera if you do not want to — the desk already did.

### `/desk/ledger` (footer or rail)

JSON. Each bill has `hashscanUrl` and `recompute.matches`. Recipe:

> `units * priceTinybarsPerUnit = tinybars`  
> If `prepaidTinybars` is present: `prepaidTinybars - tinybars = refundTinybars`

Latest TEE-gated Aave pay (already on the topic if you have not paid again):  
https://hashscan.io/testnet/tx/0.0.7162784@1789111350.366520040

A new Pay creates a **new** settle id. Use the one on screen.

### Insight

HashScan of the transfer is the **pay**. The topic is the **audit**. Hedera’s rubric wants both. Showing only HashScan looks like a wallet demo.

---

## Act 7 — Remainder (when unused prepaid comes back)

On a clean 1-protocol live Aave pay, remainder is **zero**. That is success, not a missing feature.

To *show* a refund you must prepay for a unit the desk cannot deliver.

**On `/app` you cannot type a fake protocol id.** The dropdown only sends pinned ids. Use the CLI:

```bash
npm run buyer -- http://127.0.0.1:8787 not-a-real-protocol
```

or against the public origin. TEE still sees `100000` (1 unit) so it **allows**. Graph has no such pin → 0 delivered → seller `TransferTransaction` refunds `100000` tinybars.

Live evidence already on HashScan:

| | |
| --- | --- |
| Settle | https://hashscan.io/testnet/tx/0.0.7162784@1789114039.103448687 |
| Refund | https://hashscan.io/testnet/tx/0.0.10463755@1789114039.622724528 (seller → buyer) |

HCS: `units` 0, `tinybars` 0, `prepaidTinybars` 100000, `refundTinybars` 100000. Recompute still holds: `0 * 100000 = 0`, and `100000 - 0 = 100000`.

If you ever get a remainder on `/app` after Pay, station 06 fills `refundTx` as a HashScan link and the banner becomes:

> Settled. Unused remainder refunded. Recompute prepaid − owed on the HCS topic.

That happens if an indexer is down (fail-soft): you prepaid 1, delivered 0, refund 1. Rare on a healthy Graph key.

---

## Act 8 — TEE join() (Chainlink challenge, unsigned)

### What to do

Press **TEE join()**. You do **not** need a name in the box. This is not a pay.

### What happens

- Button: **Asking TEE…**
- `GET /desk/join`
- Same CRE HTTP `handlerInTee`, payload `{ "action": "join" }`
- Returns unsigned `{ to, data, chainId }` — **this origin does not broadcast**

### What you should see

Station 07:

| Row | Expected |
| --- | --- |
| action | `join` |
| to | `0x88574e7Cc0027afd04951daa09B64d4441931ba1` (ChallengeLending on Sepolia) |
| data | `0xb688a363` (`join()` selector) |
| chainId | `11155111` |
| chain | `ethereum-testnet-sepolia` |
| broadcast | `no — npm run join sends it` |

Banner:

> Unsigned join() from the same CRE TEE. Broadcast with npm run join — this button does not send a tx.

Lamp: `allow` (meaning the TEE answered, not that a spend was allowed).

### What it does *not* do

It does not spend HBAR. It does not call `writeReport`. It does not clone the liquidation template. A second press only re-fetches calldata.

Already broadcast (do not re-broadcast unless you mean to):  
https://sepolia.etherscan.io/tx/0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086

---

## Act 9 — Manual (`/docs`)

Left TOC: Overview, The loop, Directory, Open a desk, HTTP 402, Spend cap, Metering, Remainder, Ledger, HTTP API, Subscribe, Agent CLI, Operators.

This is the same facts as this file, shorter, inside the product chrome. Use it if a judge wants to read; do not scroll it on camera instead of paying.

Clicking a TOC link jumps to a card. No network calls.

---

## Act 10 — Raw routes a judge will poke

Open these in extra tabs. None of them are the console.

| URL | Expected | If you “press” it |
| --- | --- | --- |
| `GET /desk/snapshot` (no payment header) | HTTP **402**, `PAYMENT-REQUIRED`, x402 v2, asset `0.0.0`, amount `200000` (default = both protocols) | Browser may show JSON or ngrok HTML. `curl -sD - -H 'Accept: application/json'` is cleaner. |
| `GET /desk/snapshot?protocols=aave-v3-ethereum` | 402 for `100000` | Still unpaid. |
| `GET /desk/resolve?name=nametoll.eth` | Descriptor only. No TEE. No 402. | Safe. |
| `GET /desk/inspect?name=nametoll.eth&protocols=aave-v3-ethereum` | Same payload as **Open desk** | Safe. No settle. |
| `GET /desk/brain?tinybars=100000` | `{ allow: true, reason: "under cap", … }` | Safe. |
| `GET /desk/brain?tinybars=200000` | HTTP **403**, `over cap` | Safe. Proves the flip without the UI. |
| `GET /desk/catalog?parent=nametoll.eth` | `{ ok, parent, desks[] }` | Same as **List desks**. |
| `GET /desk/offer` | Price + protocol ids + subscribe hint | Not a pay path. |
| `GET /desk/ledger` | Topic + audited bills | Read-only. |
| `GET /desk/hts` | TOLL plan + `blocky402Hts: unadvertised` + `keepHbarSnapshot: true` | Does not create a token. |
| `GET /desk/subscribe` (no `slots`) | 400 `slots query is required` | |
| `GET /desk/subscribe?slots=2` | Unsigned schedule plan | Does not create schedules. |
| `GET /desk/claim?schedule=0.0.10483309` | `already claimed` (slot 1 was claimed live) | Do not expect a new snapshot. |
| `POST /desk/session` | Guest account id + 0.5 HBAR faucet tx | Cookie `nametoll_guest`. No private key in JSON. |
| `POST /desk/register` `{ "label": "…", "expiresIn": 90 }` | Child that resells this desk | Price/payTo stay this origin. Optional bounded expiry. |

`POST /desk/pay` from a random tab without the cookie will 401 if a secret is set.

---

## Act 11 — CLI (same product, no browser)

| Command | What you are doing |
| --- | --- |
| `npm run directory -- nametoll.eth` | Resolve only. Like station 01. |
| `npm run buyer -- nametoll.eth` | Real consuming agent: resolve → 402 → sign → snapshot. Prints HashScan. |
| `npm run buyer -- nametoll.eth aave-v3-ethereum` | Same as meter = 1. |
| `npm run buyer -- http://127.0.0.1:8787 not-a-real-protocol` | Remainder demo. |
| `npm run agent -- nametoll.eth` | Handed **only a parent**. Lists children, picks a live desk, TEE, pays, prints receipt. This is discover-then-pay. |
| `npm run brain -- 100000` | Public verdict. |
| `npm run join -- --check` | Fetch unsigned join. |
| `npm run join` | **Broadcasts** Sepolia `join()`. Do not do this casually. |

`npm run agent` will spend. Same as Pay, without the UI.

---

## Act 12 — Subscribe / TOLL (extra points, not the loop)

There is **no Subscribe button** on `/app`. That is deliberate. The 402 rail stayed HBAR because Blocky402 `/supported` advertises Hedera `exact` and **no assets**. Switching snapshot 402 to TOLL would be invented.

Already live (show HashScan, do not recreate):

| Thing | Id / link |
| --- | --- |
| TOLL token | `0.0.10483302` — https://hashscan.io/testnet/token/0.0.10483302 |
| Custom fee | `100000` tinybars HBAR to seller `0.0.10463755`, collectors exempt |
| Slot 1 executed | https://hashscan.io/testnet/tx/0.0.10463842@1789156008.769559934 |
| Slot 2 executed | https://hashscan.io/testnet/tx/0.0.10463842@1789156009.185023222 |

`GET /desk/claim?schedule=` after `executed_timestamp` delivers one snapshot and writes an HCS `subscribe` bill with `scheduleId`. Replay → `already claimed`.

If a few seconds remain after the pay-path clocks, flash the token and one scheduled tx. Do not cut the 402 demo for it.

---

## Control cheat sheet (`/app`)

| Control | Needs a name? | Spends HBAR? | Writes HCS? | Typical first click |
| --- | --- | --- | --- | --- |
| **Open desk** | yes | no | no | Always start here |
| **Meter** | — | no | no | Flip 2 → deny, 1 → allow |
| **Pay** | yes + prior allow | **yes** | yes (after settle) | Once, meter = 1 |
| **TEE join()** | no | no | no | After the bill, or anytime |
| Click a `<dd>` | — | no | no | Copies the value |
| Click HashScan / topic | — | no | no | New tab |
| Nav / brand | — | no | no | Leaves the console (stations die) |

Leaving `/app` and coming back **clears the stations**. The chain is in the browser, not in a session store. HashScan and the topic keep the truth.

---

## Names, endpoints, and why Pay can refuse a “good” name

Resolve reads live ENSv2 texts (`url`, `agent-context`, `agent-endpoint[web]`). The operator can point the name at a new origin without a buyer code change.

If `PUBLIC_DESK_URL` is set, **Pay** only settles names whose descriptor endpoint is that origin. Inspect still works for a name that points at localhost — you will see a descriptor and a 402, then Pay errors *Pay is pinned to this desk's public URL.*

That is a safety pin so a public desk cannot be used as a free relay to settle someone else’s shop.

---

## If something looks wrong

| You see | Usually means |
| --- | --- |
| Ngrok warning page | Click through, or add the skip header |
| Empty stations after paste, before Open | Expected. Prefill ≠ inspect. |
| **Opening…** for a long time | Cold `cre workflow simulate`. Wait. Second open of the same amount is faster. |
| `TEE unavailable` / 502 on inspect | Public process missing `CRE_PROJECT_DIR` / `cre/.env`. `/health` will say `brain.source: "unavailable"`. |
| Deny on 1 protocol | Cap changed, allowlist/rate set, or you are not who the enclave thinks. Reasons: `over cap`, `buyer not allowlisted`, `rate limited`, `missing spend cap`. |
| Allow on 2 protocols | Cap is no longer `150000`, or cache from a different secret. Do not film that as the deny beat. |
| `stub: true` after Pay | Graph key. Still a real settle. Say “labeled stub.” |
| Station 05 missing bill | Mirror lag. Open HashScan. Refresh `/desk/ledger` later. |
| `agent-02` missing on `/desks` | Omnigraph lag. Paste on `/app`. |
| Pay 401 | Secret cookie. Stay on the same origin. |
| Landing showing a hardcoded `.eth` | You are not on this build. Tests forbid it. |

---

## Suggested camera order (matches README clocks)

Do this once, slowly, on `/app` (and 15 seconds on `/desks`).

| Clock | On screen | You do / say |
| --- | --- | --- |
| 0:00 | Landing loop or `/app` lede | “Name → TEE → pay → meter → HCS.” |
| 0:15 | `/desks`, paste `nametoll.eth`, **List desks**, then **Open on desk** | “The name is the directory. No hardcoded URL.” |
| 0:35 | Station 01 | “Permissioned Resolver + EAC. Operator can edit three text keys, cannot steal the name.” |
| 0:50 | Meter **2**, **Open desk**, deny banner, Pay locked | “Secret cap is 150000. Two units are 200000. TEE says no. Money does not move.” |
| 1:10 | Meter **1**, **Open desk**, allow + 402 `100000` | “One unit is under cap. Unpaid GET is HTTP 402, HBAR, tinybars, asset 0.0.0.” |
| 1:30 | **Pay**, station 04–05, click HashScan | “Blocky402 settled. Fee-payer from live `/supported`.” |
| 2:00 | Snapshot TVL + say 1 vs 2 pricing. Optional remainder HashScan | “Meter is protocol count. Unused prepaid refunds.” |
| 2:25 | Topic `0.0.10464309`, `matches: true` | “Anyone can recompute from Mirror Node.” |
| 2:50 | `docs/partners/chainlink/simulate-allow.log` | “`handlerInTee`, Nitro us-west-2, `getSecret`.” |
| 3:05 | **TEE join()**, then Etherscan join tx | “Same enclave. This button does not broadcast.” |
| 3:20 | End | Optional: flash TOLL `0.0.10483302` if seconds remain. |

Keep the file under 4:00. Human voice. ≥720p. No TTS, no music-over-text.

---

## The one paragraph you can say out loud

“I paste a name. ENS on Sepolia tells me the shop URL, the Hedera pay-to, the price, and the receipt topic. A Chainlink TEE reads a secret spend cap I cannot see and says allow or deny. Deny means no money moves. Allow means an unpaid click is still HTTP 402. I pay in HBAR. Blocky402 settles it. I get a live Aave snapshot. Two protocols would have cost twice as much and the TEE would have refused. The bill is on HCS. Anyone can recompute it.”
