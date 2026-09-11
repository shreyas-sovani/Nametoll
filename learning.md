# Nametoll, explained like you are 16

This is the “what is this thing?” file. Another agent may still be wiring details. The **idea** of the product does not change.

Nametoll is a **named pay desk**.

Think of a newsstand that sells one live report. You do not memorize the shop’s street address. You look up its **name**, walk up, get told the price, pay only if a hidden rule says you may, take the report, and leave a public receipt anyone can check.

That shop is this app. The report is live lending data. The money is **HBAR** (Hedera’s coin — like dollars, but for Hedera). The name is an **ENS** name (Ethereum Name Service — a human name that points at a machine address, like a contact in your phone).

```text
name → secret allow/deny → pay → metered data → public bill
```

If a feature is not on that path, it is extra, not the product.

---

## The problem (why this exists)

Today, if a computer program wants to **buy data**, a human usually does this:

1. Sign up on a website.
2. Get an **API key** (a secret password for that website).
3. Hardcode a URL (glue a specific web address into the program).
4. Pay a monthly subscription even if the program only needed one snapshot.

That is bad for **agents** (programs that act on their own, not just websites you click).

Three things are missing:

| Missing piece | Everyday version | Why it hurts |
| --- | --- | --- |
| A portable name for the shop | You only have a street number that can change | The agent’s code breaks when the URL moves |
| A spend rule the agent cannot read or cheat | Mom hid the debit-card limit in a locked box | A buggy agent can overspend |
| A public bill a stranger can recompute | A receipt anyone can check, not “trust our screenshot” | Judges and other people cannot verify the charge |

Nametoll is built for those three gaps. It is also a hackathon project for **ETHOnline 2026**. The sponsors they picked on the form are **Hedera**, **ENS**, and **Chainlink**. Those are not stickers. Each one *is* a step of the loop.

---

## What it tries to solve

**Give an agent a name. Let it pay per request. Refuse the spend if a secret cap says no. Charge by how much data you asked for. Publish a bill anyone can recompute.**

Two people matter:

- **Buyer agent** — a program that needs a live **lending-risk snapshot** (a short report of how big and how risky two big crypto lending apps are right now). It can pay per request. It should never embed an API key or a hardcoded shop URL.
- **Desk operator** — the human who owns the parent name, sets the price and the shop URL, and does **not** want to hand the whole name to a hot wallet (a key that lives on a computer that is online — easy to use, easier to steal).

A third person shows up at the hackathon:

- **Judge** — they paste a name, watch a deny, watch a pay, open a public explorer, and recompute the bill. They should not have to take the README on faith.

---

## How it solves it (the one loop)

Here is the whole product as a story. Terms are explained the first time they appear.

### 1. Someone gives the agent a name

On the happy path the name is **typed or pasted**. It is never baked into the demo as a default.

The live names (as of 12 Sep 2026) are:

- `nametoll.eth` — the **parent** (the family name you registered)
- `desk.nametoll.eth` — a **child** (a sub-name under that parent)
- `agent-02.nametoll.eth` — a **sibling** under the same parent, with its own Permissioned Resolver

**ENSv2** is the new ENS on **Sepolia** (a test Ethereum network — fake money, real software). Old ENS is “one name, one owner.” ENSv2 can have a **hierarchy** (parent / child, like a folder and a file).

The name is not a sticker. It is the **directory** (the phone book). Resolving it returns a **desk descriptor**:

| Field | Meaning |
| --- | --- |
| `endpoint` | The shop’s current web URL |
| `payTo` | Which Hedera account gets paid (`0.0.…`, not an Ethereum `0x…` address) |
| `priceRule` | How the price is computed |
| `hcsTopic` | Which public receipt book to write on |
| `asset` | Always `0.0.0` here, which means **HBAR** |

Those facts live in a **Permissioned Resolver** (a small on-chain program that is allowed to answer “what does this name point to?”). An **EAC** grant (**Enhanced Access Control** — a permission that is narrower than “I own the name”) lets an **operator** account edit only those text records. The operator cannot transfer the name away.

**User story:** *As a desk operator, I want a helper account that can change the shop URL and the price, so a stolen helper key cannot steal the name itself.*

**User story:** *As a buyer agent, I want to pay a desk I found by name, so I never embed an API key or a URL.*

If the operator changes the endpoint record, the next resolve hits the new URL. The buyer’s code does not change.

### 2. The Brain says allow, deny, or “this much max”

Before money moves, the desk asks the **Brain**.

The Brain is a **CRE** workflow (**Chainlink Runtime Environment** — Chainlink’s place to run small programs). The important part is `handlerInTee`.

A **TEE** is a **Trusted Execution Environment**: a locked room inside a cloud computer. Code in the room can read a secret. Code *outside* the room cannot peek. Even the desk operator is not supposed to see the secret at runtime.

The required secret is a **spend cap** (the maximum tinybars this request may cost). Optional secrets can also name an allowlist of buyers and a rate limit. Empty extras keep cap-only. **Tinybars** are Hedera’s small unit. `100_000_000` tinybars = `1` HBAR. This desk prices at `100000` tinybars per protocol, which is `0.001` HBAR.

The Brain returns a **verdict**:

```text
{ allow, maxTinybars, reason }
```

- `allow` — yes or no
- `maxTinybars` — the ceiling
- `reason` — a public sentence (“under cap”, “over cap”, “buyer not allowlisted”, “rate limited”). The secret number itself is not printed.

If the Brain says **deny**, or if the Brain is skipped, the Gate refuses. No pay. No data. No bill.

**User story:** *As a desk operator, I want the TEE to refuse an over-cap agent, so the desk never settles that request.*

**User story:** *As a judge, I want a `cre workflow simulate` log, so I can see that the locked room and the secret were really on the pay path.*

Those logs live under `docs/partners/chainlink/` (`simulate-allow.log`, `simulate-deny.log`). Secrets are redacted (blacked out).

### 3. Unpaid GET is HTTP 402

The agent then **GET**s the desk (asks for the snapshot over the web).

If it did not pay, the desk answers **HTTP 402**.

Normal websites use:

- `200` = ok
- `404` = not found
- `403` = forbidden

**402** means **Payment Required**. The body is a **challenge**: “to get this resource, pay this much, to this account, in this asset.”

The payment standard is **x402 v2** `exact`. x402 is “pay for an HTTP request the way you already speak HTTP.” `exact` means “this exact amount,” not “up to this amount.”

The **facilitator** is **Blocky402** (`https://api.testnet.blocky402.com`). A facilitator is a helper that **verifies** the signature and **settles** the transfer. The desk is a **resource server**. It must **not** hold the facilitator’s private key. The **fee-payer** (who pays Hedera network fees for the settle) comes from Blocky402’s live `GET /supported` answer, not from a number we invented.

**User story:** *As a buyer agent, I want a 402 and then a settle, so I only retry after a real challenge. I do not send money “just in case.”*

### 4. The agent signs. Blocky402 settles. The desk sells data.

The **Buyer** signs the x402 payment with the **buyer** Hedera key. Never the seller key.

After settle, the desk runs **Merchandise**: a live **multi-protocol lending snapshot**.

**Merchandise** here means “the thing you actually bought,” not the payment rail.

**Protocol** here means a live lending system on Ethereum. The desk queries two, using **The Graph** (a live index of blockchain data — like a search engine for on-chain facts):

- **Aave v3**
- **Compound III**

Same question shape, two pinned **deployment IDs** (exact published subgraphs, so nobody invents fake tables). If one indexer is down, the desk **fail-softs**: it returns what it has, and does not invent fake rows.

Price is **metered**. Metered means “you pay for how much you used,” not a flat cover charge.

Default price: `100000` tinybars × **how many protocols you asked for**.

| You ask for | Prepaid | Typical bill |
| --- | --- | --- |
| 1 protocol (Aave only) | `100000` tinybars | `100000` |
| 2 protocols (Aave + Compound) | `200000` tinybars | `200000` |

**User story:** *As a buyer agent, I want a larger multi-protocol request to cost more, so the meter is visible — not a fake flat `$0.001` every time.*

If you prepaid for two and only one protocol actually delivered, the unused part is **refunded** (Pinout shape: credit = what you already paid, burn = what was delivered, remainder goes back). The seller sends leftover HBAR home. The bill records prepaid, owed, and refund.

### 5. The Ledger writes a public bill

Pay is the HBAR transfer. The **audit** is a message on **HCS**.

**HCS** is the **Hedera Consensus Service**: a public, time-ordered log. Think of a numbered receipt book that anyone can read. It is not the payment rail. It does not move the coins. It records the bill.

Each bill looks like:

| Field | Meaning |
| --- | --- |
| `requestId` | This one purchase |
| `name` | What was sold (`lending-risk`, or a stub name in older tests) |
| `units` | How many protocols were **burned** (actually delivered) |
| `tinybars` | How much was **owed** after the meter |
| `settleTx` | The pay transaction id |
| `consensusTime` | When HCS agreed the message happened |
| `prepaidTinybars` / `refundTinybars` / `refundTx` | Present when a remainder refund ran |

A judge **recomputes** like this:

1. Open the **Mirror Node** (Hedera’s public read API — a copy of network history you can query).
2. Decode the topic messages.
3. Check `units × 100000 = tinybars`.
4. If prepaid is present, check `prepaid − tinybars = refund`.

**HashScan** is the website explorer (like Etherscan, but for Hedera). A HashScan link of the transfer proves money moved. The topic proves the *bill* matches the meter.

**User story:** *As a judge, I want a HashScan settle and an HCS topic I can recompute, so I do not take the README on faith.*

Live topic (as of this writing): `0.0.10464309`.

---

## The six rooms (modules)

The app is one process with six **modules** (rooms with a locked door between them). Internals can change. These doors should stay.

```text
Buyer ──resolve──► Directory (ENS name → shop card)
  │
  ├──ask──► Brain (CRE TEE: allow / deny / max)
  │
  └──402──► Gate ──settle──► Blocky402
              │
              ├──allow?──► Merchandise (live Graph snapshot + units)
              └──bill──► Ledger (HCS)
```

| Module | Job | Does not |
| --- | --- | --- |
| **Directory** | Name → descriptor | Hold money or secrets |
| **Gate** | 402, settle, refuse if Brain said no or meter unpaid | Hold facilitator keys |
| **Brain** | Secret cap → verdict | Leak the secret; fetch data with the wrong HTTP client |
| **Merchandise** | Live snapshot + billable units | Be “the product” if Graph is not on the prize form |
| **Ledger** | Append the bill; HashScan + recompute | Be the payment rail |
| **Buyer** | Resolve → 402 → sign → retry → show data + receipt | Hardcode the name; receive the Graph API key |

The buyer **never** gets the **data-plane credential** (the Graph gateway key the desk uses to fetch the snapshot). The agent pays for the *result*, not for the shop’s backstage pass.

---

## User stories (the ones that define “done”)

These are the stories the demo is built to prove. A **user story** is a sentence in this shape: *As a [who], I want [what], so that [why].*

### Buyer agent

1. **Pay by name.** As a buyer agent, I want to pay a desk I found by name, so I never embed an API key or URL.
2. **Challenge then pay.** As a buyer agent, I want a 402 and then a settle, so I only retry after a real challenge.
3. **See the meter.** As a buyer agent, I want a 2-protocol request to cost more than a 1-protocol request, so I know I am not on a fake flat fee.
4. **Get a refund for unused prepaid.** As a buyer agent, I want leftover tinybars back if a protocol fail-softs, so I did not pay for data I never got.

### Desk operator

5. **Narrow keys.** As a desk operator, I want EAC so a hot account can edit price and endpoint and cannot transfer the name.
6. **Secret cap.** As a desk operator, I want the TEE to refuse an over-cap agent, so the desk never settles that request.
7. **Move the shop without rewriting buyers.** As a desk operator, I want to change the endpoint text record, so the next resolve hits the new URL and old buyer code still works.

### Judge / human on the homepage

8. **Paste, don’t trust a default.** As a judge, I want the video and the homepage to type or paste the name, so I know it is not hardcoded.
9. **Recompute the bill.** As a judge, I want a HashScan settle and an HCS topic, so I can do `units × price` myself.
10. **See the locked room on the path.** As a judge, I want a `cre workflow simulate` log with `handlerInTee` and `getSecret`, so the TEE is not a hello-world in a side folder.
11. **Watch deny then allow.** As a judge, I want one over-cap run that stays locked, and one under-cap run that pays, so I believe the Brain changes whether money moves.

If you only remember four stories, remember **1, 3, 6, and 9**.

---

## What to expect when you open it

### The desk console is `/app`, not a consumer checkout

`/` and `/landing` are the product page. `/desks` is the registry (paste a parent, list children). `/docs` is the manual. The drive UI is `/app`: a ticket-looking page with **stations**.

1. Paste a name. The box is empty on purpose.
2. Pick the **meter**: 1 protocol or 2.
3. Click **Open desk**.
4. Read the stations. Then click **Pay** if the Brain allowed it.

| Station | What you should see |
| --- | --- |
| **01 Descriptor** | Endpoint, pay-to, price rule, HCS topic — from the live name |
| **02 TEE** | `allow` true/false, a public reason, max tinybars vs requested tinybars |
| **03 402** | Status `402`, amount in tinybars, asset `0.0.0` |
| **04 Snapshot** | After pay: units, whether it was live (`stub: false`) |
| **05 HashScan + HCS** | Settle tx link + topic link |
| **06 Remainder** | Prepaid, burned units, owed, refund (zero if you used what you paid for) |

Banners you should expect:

- Empty: “Paste a name…”
- Error: the name did not resolve, or inspect failed
- Deny: TEE said no. **Pay stays locked.** No snapshot. No bill.
- OK: TEE allowed. Unpaid GET is still 402 until you pay.
- After pay: settled, maybe “unused remainder refunded”

**Pay** on `/app` uses **server-side buyer keys** (the desk already has a test buyer, so a judge can click once). That is a demo convenience. The real buyer path is still “agent has its own key” (`npm run buyer -- <name>` or `npm run agent -- <parent>`). If buyer keys are missing, Pay stays disabled and the page tells you to use the buyer CLI.

### Commands you will see in the README

| You run | What it means |
| --- | --- |
| `npm start` | Boot the desk (default `http://127.0.0.1:8787`) |
| `GET /health` | Is the process up? No partner keys needed |
| `GET /desk/snapshot` with no payment | Should be **402** |
| `GET /desk/resolve?name=…` | Phone-book lookup, no pay |
| `GET /desk/inspect?name=…` | Descriptor + TEE + 402 challenge, no settle |
| `GET /desk/catalog?parent=…` | Children of a parent + live probes |
| `POST /desk/pay` | Demo pay (server buyer keys) |
| `npm run buyer -- <name>` | Real consuming agent: resolve → 402 → sign → data |
| `npm run agent -- <parent>` | Discover a child, then pay |
| `GET /desk/ledger` | Recent bills |
| `GET /desk/subscribe` / `/desk/claim` | Scheduled TOLL slots + claim (extra, not the 402 rail) |

A successful CLI pay prints a HashScan URL.

### Networks you will hear

| Word | What it is here |
| --- | --- |
| **Hedera testnet** | Where HBAR moves and HCS bills land. Test coins. |
| **Sepolia** | Where the ENS name lives. Different chain, same product. |
| **ngrok URL** | A temporary public tunnel so a judge not on your laptop can hit the desk. It **dies** when the laptop process stops. Localhost is not the demo target. |

### What “done” looks like for a human

A stranger should be able to:

1. Paste `nametoll.eth` or `desk.nametoll.eth`.
2. See a descriptor that came from ENS, not from a constant in the page.
3. Ask for 2 protocols, watch TEE **deny** if that is over the secret cap.
4. Ask for 1 protocol, watch TEE **allow**, see 402, pay, get a snapshot.
5. Open HashScan for the settle.
6. Open the HCS topic and recompute `units × 100000`.
7. Open a redacted simulate log that shows `handlerInTee`.

That is the product. Everything else is stretch.

---

## What you should *not* expect

Nametoll is not:

- A chatbot, an inference marketplace, or “ChatGPT but on Hedera”
- A consumer bank app, a wallet product, or a pretty design prize
- A World ID / Selfie login
- A Uniswap / 1inch swap
- Mainnet money (this is testnet)
- A monthly subscription as the pay path (scheduled TOLL slots exist as extra-points; snapshot 402 is still HBAR)
- A name that is only shown as a label while the real URL is hardcoded

The Graph is the **merchandise** (what you buy). It is not currently a prize-form pick. World is not in this app.

Stretch that **landed** and is still not required for the spine: unused-remainder refund, Hedera harness PR #59, Chainlink liquidation `join()`, Sunday form stay, `/desks` + discover-and-pay agent, second ENSv2 sibling, TEE allowlist/rate, TOLL custom fee + scheduled subscribe. ERC-8004 / A2A stayed out.

---

## A 60-second walkthrough you can say out loud

“I paste a name. ENS on Sepolia tells me the shop URL, the Hedera pay-to, the price, and the receipt topic. A Chainlink TEE reads a secret spend cap I cannot see and says allow or deny. Deny means no money moves. Allow means an unpaid click is HTTP 402. I sign an x402 payment in HBAR. Blocky402 settles it. I get a live Aave + Compound snapshot. Two protocols cost twice one. If one indexer is down I get a refund for the unused half. The bill is on HCS. Anyone can recompute it.”

---

## If another agent is still building

The loop above is the contract. Implementation details can move:

- Public URL may change (ngrok sessions die).
- Exact `/app` copy, refund HashScan links, and hosting may still be in flux.
- Ticket IDs in `docs/BACKLOG.md` (`B0`…`B20`) are the build checklist. Spine B0–B12 and stretch B13–B20 are marked done as of 12 Sep 2026. Human remaining: video + stable public URL.

If something on screen disagrees with this file, trust **observable behavior** (402, HashScan, topic math, simulate log) over a sentence in a doc. Then update this file.

---

## Where to go next

| If you want… | Open |
| --- | --- |
| The product contract (loop, non-goals) | `docs/PRD.md` |
| What is built vs stretch | `docs/BACKLOG.md` |
| How to run it | `README.md` |
| Prize / partner rules | `docs/analysis.md`, `docs/partners/README.md` |
| Agent “do not invent APIs” rules | `AGENTS.md` |
| Demo timestamps | `README.md` and `docs/submission.md` |

You do not need those to understand Nametoll. You need: **a name, a locked spend rule, a 402, a meter, a public bill.**
