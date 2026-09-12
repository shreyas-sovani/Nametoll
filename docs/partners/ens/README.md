# ENSv2 directory sources (B7–B8)

Reads go through the ENS Omnigraph (`sepolia-v2` hosted default), then official Universal Resolver `findResolver` + Permissioned Resolver `text()`. Writes follow official `ens-cli` calldata (or the equivalent viem calls in `npm run ens:sepolia`). Do not invent record keys or CLI flags.

| What | Where |
| --- | --- |
| Live `llms.txt` | https://docs.ens.domains/llms.txt |
| Snapshot | `docs/partners/ens/llms.txt` |
| Context7 | `/ensdomains/docs` |
| ENSIP-5 text keys | https://docs.ens.domains/ensip/5 (`url`) |
| ENSIP-26 agent keys | https://docs.ens.domains/ensip/26 (`agent-context`, `agent-endpoint[web]`) |
| Permissioned Resolver + EAC | https://docs.ens.domains/ensv2/permissioned-resolver |
| ETH Registrar | https://docs.ens.domains/ensv2/eth-registrar |
| Registry hierarchy | https://docs.ens.domains/ensv2/registry-hierarchy |
| `ens-cli` writes | `vendor/ens-cli/README.md` |
| Omnigraph query model | `.agents/skills/omnigraph/SKILL.md` |

**Parent** = the 2LD you register (`nametoll.eth`). **Child** = a label under that parent's UserRegistry (`desk.nametoll.eth`). **Sibling** = another label under the same UserRegistry with its own Permissioned Resolver (`agent-02.nametoll.eth`, salt index 1).

Desk records (documented keys only):

| Key | Spec | Value |
| --- | --- | --- |
| `agent-endpoint[web]` | ENSIP-26 | Desk HTTP origin |
| `url` | ENSIP-5 | Fallback origin |
| `agent-context` | ENSIP-26 | JSON `{ payTo, priceRule, hcsTopic, asset: "0.0.0" }` |

Happy path does not ship a name. Type or paste one into `GET /desk/resolve?name=`, `/desks`, or `npm run directory -- <name>`. `/register` + `POST /desk/register` issue a child via the existing `issueDeskChild` write path. Label, endpoint, and optional `expiresIn` (60s–1 year) vary; `payTo`, `priceRule`, topic, and asset `0.0.0` are this origin's (`ENS_PARENT` selects the parent). Do not accept a judge-supplied price. After expiry, `getState` is `AVAILABLE` and `/desks` marks the child unresolved.

## Live Sepolia (11–12 Sep 2026)

| | |
| --- | --- |
| Parent | `nametoll.eth` |
| Child | `desk.nametoll.eth` |
| Sibling | `agent-02.nametoll.eth` — resolver `0xe41Fab44355C6169af965C7994743625198561Da` (salt index 1) |
| Expired | `gone.nametoll.eth` — 90s expiry, now `AVAILABLE`. Register https://sepolia.etherscan.io/tx/0x44bbbd33adc88b3fb103eec45e2941ee4ad9eb14d8a0f446f738c7c2ac20d3ac |
| Owner | `0xD2aA21AF4faa840Dea890DB2C6649AACF2C80Ff3` |
| Operator | `0xFeAf5C921996FC53f4DEf35e181E766e6D74690A` |
| Permissioned Resolver (parent/child) | `0x558283D5F8E36316B60be7e24F4e58C7133752D2` |
| UserRegistry | `0x0531cdfAa619d1Ce33B37e87AAcD685bEcd976B9` |
| Register tx | https://sepolia.etherscan.io/tx/0x28ab9c164cca6f967413f944a3ef1f81ca3ef86f7e1620fdc5b7a57d8d7a8a96 |
| Sibling register | https://sepolia.etherscan.io/tx/0xd1f6f4faa9f11636fb64673ddfe6d458285e6cbf6ea79631c0d017c528c10454 |

Operator has `authorizeTextRoles` on those three keys only (`ROLE_SET_TEXT`). No registry transfer role. `--reverse-record` was not used. Resolver was deployed before register.

Hosted ENSNode `https://api.v2-sepolia.ensnode.io` currently serves a `*.up.railway.app` cert. Resolve then uses Sepolia Universal Resolver `0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe`. Catalog `listChildNames` uses the same transport-failure check: Omnigraph first; on `fetch failed` or ENSNode 4xx/5xx, walk `getSubregistry` from `ENSV2_SEPOLIA.registry` and read official `LabelRegistered` logs on the parent UserRegistry ([ENSv2 indexing](https://docs.ens.domains/ensv2/indexing/)). Default window is 3×8000 recent Sepolia blocks (`ETH_RPC_URL` or publicnode). Older labels (e.g. `desk.nametoll.eth`, register block `11677191`) can sit outside that window — paste the child on `/app`. Official `pkg.pr.new` ens-cli is 404; `npm run ens:sepolia` broadcasts with the same ABIs/addresses as `vendor/ens-cli`.

```bash
npm run directory -- nametoll.eth
npm run buyer -- nametoll.eth
npm run agent -- nametoll.eth
npm run ens:subname -- --plan --parent nametoll.eth --label agent-02
npm run ens:eac -- nametoll.eth <new-public-origin>
```
