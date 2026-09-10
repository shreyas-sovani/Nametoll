# Working notes (B0–B4)

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
