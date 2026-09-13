<p align="center">
  <img src="nametoll%20logo.png" alt="Nametoll" width="560" />
</p>

<h1 align="center">Nametoll</h1>

<p align="center"><b>A named pay desk.</b><br />
Look up a shop by name. A spend rule the desk cannot read decides if you may pay.<br />
You pay in HBAR for what came back. Anyone can recompute the bill.</p>

<p align="center">
  <a href="https://nametoll.run.place"><img src="https://img.shields.io/badge/●_LIVE-nametoll.run.place-00D68F?style=for-the-badge&labelColor=08352A" alt="Live" /></a>
  <a href="https://nametoll.run.place/desks"><img src="https://img.shields.io/badge/FIND-a_desk-00C2FF?style=for-the-badge&labelColor=042430" alt="Find" /></a>
  <a href="https://nametoll.run.place/app"><img src="https://img.shields.io/badge/OPEN-the_desk-FF6B35?style=for-the-badge&labelColor=3D1608" alt="Open" /></a>
  <a href="https://nametoll.run.place/register"><img src="https://img.shields.io/badge/PUBLISH-a_name-FF4D8D?style=for-the-badge&labelColor=3A1024" alt="Publish" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTTP-402-FFD166?style=flat-square&labelColor=3D2E00" alt="402" />
  <img src="https://img.shields.io/badge/name-ENS-22D3EE?style=flat-square&labelColor=042A32" alt="ENS" />
  <img src="https://img.shields.io/badge/pay-HBAR-8B5CF6?style=flat-square&labelColor=1C1033" alt="HBAR" />
  <img src="https://img.shields.io/badge/spend-TEE-06D6A0?style=flat-square&labelColor=063D2C" alt="TEE" />
  <img src="https://img.shields.io/badge/bill-HCS-C77DFF?style=flat-square&labelColor=2A1040" alt="HCS" />
  <img src="https://img.shields.io/badge/data-Aave_+_Compound-F4B942?style=flat-square&labelColor=3A2A08" alt="Data" />
</p>

```text
name → spend check → HTTP 402 → metered units → public bill
```

---

## Why it exists

- Buying live market data still means a URL, an API key, and a monthly invoice.
- That handle is not portable. You cannot hand a shop to another agent.
- The spend limit lives in a config the buyer can read.
- After payment, there is no receipt a stranger can check.

Nametoll is the shop for that job.

---

## What you get

- A desk you find by **name**, not by a hardcoded host.
- A spend cap sealed in a TEE. Over cap is HTTP 403. Nothing settles.
- Unpaid traffic is HTTP **402**. Price is tinybars per delivered unit.
- Two products on the same meter:
  - **Snapshot** — live Aave + Compound lending rows
  - **Risk score** — health factor, distance to liquidation, worst market
- A public HCS bill. Recompute: `units * priceTinybarsPerUnit = tinybars`

---

## How a request works

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"ui-sans-serif","lineColor":"#1f1e1d","primaryTextColor":"#1f1e1d"}}}%%
flowchart LR
  A["① Name"] --> B["② Resolve desk"]
  B --> C{"③ Spend allowed?"}
  C -->|no| D["HTTP 403"]
  C -->|yes| E["④ HTTP 402"]
  E --> F["⑤ Pay HBAR"]
  F --> G["⑥ Metered units"]
  G --> H["⑦ Public bill"]
  classDef name fill:#22D3EE,stroke:#042A32,color:#042A32
  classDef tee fill:#F4B942,stroke:#3A2A08,color:#1f1e1d
  classDef stop fill:#FF4D8D,stroke:#3A1024,color:#fff
  classDef pay fill:#FF6B35,stroke:#3D1608,color:#fff
  classDef good fill:#06D6A0,stroke:#063D2C,color:#063D2C
  classDef bill fill:#C77DFF,stroke:#2A1040,color:#fff
  class A,B name
  class C tee
  class D stop
  class E,F pay
  class G good
  class H bill
```

- Resolve the name → origin, price, pay-to, bill topic.
- Ask the TEE if this amount may spend.
- Pay the 402 in HBAR. Unused prepaid is refunded.
- Read the rows. Check the bill on topic `0.0.10464309`.

```bash
curl -sD - -H 'Accept: application/json' https://nametoll.run.place/desk/snapshot
```

---

## Architecture

One service. Six modules.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"ui-sans-serif","lineColor":"#1f1e1d"}}}%%
flowchart TB
  Buyer["Buyer"]
  Dir["Directory"]
  Gate["Gate"]
  Brain["Brain"]
  Merch["Merchandise"]
  Led["Ledger"]
  Buyer --> Dir --> Gate
  Gate --> Brain
  Gate --> Merch
  Gate --> Led
  classDef b fill:#FF6B35,stroke:#3D1608,color:#fff
  classDef d fill:#22D3EE,stroke:#042A32,color:#042A32
  classDef g fill:#FFD166,stroke:#3D2E00,color:#1f1e1d
  classDef t fill:#F4B942,stroke:#3A2A08,color:#1f1e1d
  classDef m fill:#06D6A0,stroke:#063D2C,color:#063D2C
  classDef l fill:#C77DFF,stroke:#2A1040,color:#fff
  class Buyer b
  class Dir d
  class Gate g
  class Brain t
  class Merch m
  class Led l
```

- **Directory** — resolve a name, list children, publish a child, open a guest buyer.
- **Gate** — HTTP 402, verify, settle. Does not hold the facilitator key.
- **Brain** — sealed spend cap, optional allowlist and rate. Cached per amount.
- **Merchandise** — live Aave + Compound. Risk score is one unit.
- **Ledger** — append the bill. Refund unused prepaid.
- **Buyer** — resolve, ask the gate, pay, print the receipt.

---

## API

| Call | What happens |
| --- | --- |
| `GET /desk/resolve?name=` | Descriptor: origin, price, pay-to, topic |
| `GET /desk/catalog?parent=` | Children under a parent name |
| `GET /desk/snapshot` | 402, then live lending rows |
| `GET /desk/risk?wallet=` | 402, then a health-factor score |
| `GET /desk/ledger` | Recent bills |
| `POST /desk/session` | Guest buyer (key stays on the server) |
| `POST /desk/pay` | Resolve → spend check → settle |
| `POST /desk/register` | Publish a child name for this desk |

Pages: [`/`](https://nametoll.run.place) · [`/desks`](https://nametoll.run.place/desks) · [`/app`](https://nametoll.run.place/app) · [`/register`](https://nametoll.run.place/register) · [`/docs`](https://nametoll.run.place/docs)

---

## Run it

```bash
npm install
cp .env.example .env
npm start
```

```bash
curl -s http://127.0.0.1:8787/health
npm run agent -- nametoll.eth
```

Live origin: https://nametoll.run.place

Bills: https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10464309/messages

---

## Stack

- **Name** — ENS. The name is the directory.
- **Pay** — HBAR over HTTP 402 (x402 v2, exact, tinybars).
- **Spend rule** — confidential TEE. Deny means no settle.
- **Data** — The Graph. Aave v3 + Compound III. Fail-soft if an indexer is down.
- **Bill** — Hedera Consensus Service. Public, recomputable.
