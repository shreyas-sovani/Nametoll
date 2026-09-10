# ENSv2 directory sources (B7–B8)

Reads go through the ENS Omnigraph (`sepolia-v2` hosted default). Writes go through official `ens-cli` and stay **unsigned** `{to,data,value}`. Do not invent record keys or CLI flags.

| What | Where |
| --- | --- |
| Live `llms.txt` | https://docs.ens.domains/llms.txt |
| Snapshot | `docs/partners/ens/llms.txt` |
| Context7 | `/ensdomains/docs` |
| ENSIP-5 text keys | https://docs.ens.domains/ensip/5 (`url`) |
| ENSIP-26 agent keys | https://docs.ens.domains/ensip/26 (`agent-context`, `agent-endpoint[web]`) |
| Permissioned Resolver + EAC | https://docs.ens.domains/ensv2/permissioned-resolver |
| Registry hierarchy | https://docs.ens.domains/ensv2/registry-hierarchy |
| `ens-cli` writes | `vendor/ens-cli/README.md` |
| Omnigraph query model | `.agents/skills/omnigraph/SKILL.md` (schema confirmed offline with `enscli ensnode omnigraph schema`) |

Desk records (documented keys only):

| Key | Spec | Value |
| --- | --- | --- |
| `agent-endpoint[web]` | ENSIP-26 | Desk HTTP origin |
| `url` | ENSIP-5 | Fallback origin |
| `agent-context` | ENSIP-26 | JSON `{ payTo, priceRule, hcsTopic, asset: "0.0.0" }` |

Happy path does not ship a name. Type or paste one into `GET /desk/resolve?name=` or `npm run directory -- <name>`.

## Unsigned write sequence

`npm run ens:writes -- --owner 0x… --operator 0x… --parent <name-you-chose> --child desk --endpoint <public-desk-url>`

Prints the official `ens-cli` commands in order: **resolver deploy → register commit/reveal → subregistry → subname → set batch**. Then the official Permissioned Resolver `authorizeTextRoles` calls for those three keys only. The operator is not granted registry transfer roles.

Someone with a funded Sepolia account still signs and broadcasts. `--reverse-record` is ENSv1-only and is not in the plan.

## Live check (after broadcast)

```bash
npm run directory -- <the-name-you-registered>
npm run buyer -- <the-name-you-registered>
```

Until that broadcast exists, resolve is implemented and tested against an injected reader. Hosted ENSNode `https://api.v2-sepolia.ensnode.io` is the default `ENSNODE_URL`. If that host fails TLS (it currently serves a `*.up.railway.app` cert), the desk falls back to `ens get text --chain sepolia`.
