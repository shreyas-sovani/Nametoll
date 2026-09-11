import {
  concat,
  encodeAbiParameters,
  getAddress,
  getContractAddress,
  keccak256,
  parseAbi,
  stringToBytes,
  zeroAddress,
  type Hex,
} from "viem";
import { labelhash, namehash } from "viem/ens";
import type { PublicClient } from "viem";

/**
 * Canonical ENSv2 Sepolia deployment from vendor/ens-cli
 * (`src/lib/contracts.ts`, contracts-v2 PR #388, 2026-07-30).
 */
export const ENSV2_SEPOLIA = {
  registry: "0xBDC85dD5b15D7ecb354cd7cb6f2c50b4f2c4F0E2",
  registrar: "0xa88553F454b77203B0D036A05c894d555EAAa2Cc",
  paymentToken: "0x768F42455A2D082E23ceeF7d51e5787C82d67a39",
  resolverFactory: "0x10dC6333CDFe1FCEf624c6e0a8221b91804Cd7ef",
  resolverImplementation: "0x9EAe5C2730a7dD16BDD1DeE6421a1B91e3B0365e",
  resolverProxyLogic: "0xA136BeE4E37B44586242e516a39893EfD54315e9",
  subregistryImplementation: "0x624a25d67B59D587752EbEc8DdeD8827dAe52050",
} as const;

export const ALL_ROLES = BigInt(
  "0x1111111111111111111111111111111111111111111111111111111111111111",
);

export const V2_DEFAULT_OWNER_ROLE_BITMAP =
  (1n << 12n) |
  (1n << 16n) |
  (1n << 20n) |
  (1n << 24n) |
  (1n << 140n) |
  (1n << 144n) |
  (1n << 148n) |
  (1n << 152n);

export const YEAR_SECONDS = 31_536_000n;

export const ethRegistrarAbi = parseAbi([
  "function commit(bytes32 commitment)",
  "function register(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, address paymentToken, bytes32 referrer) returns (uint256 tokenId)",
  "function getRegisterPrice(string label, uint64 duration, address paymentToken) view returns (uint256 base, uint256 premium)",
  "function isAvailable(string label) view returns (bool)",
  "function makeCommitment(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, bytes32 referrer) pure returns (bytes32)",
]);

export const V2Status = {
  AVAILABLE: 0,
  RESERVED: 1,
  REGISTERED: 2,
} as const;

export const v2RegistryAbi = parseAbi([
  "function getState(uint256 anyId) view returns ((uint8 status, uint64 expiry, address latestOwner, uint256 tokenId, uint256 resource))",
  "function getSubregistry(string label) view returns (address)",
  "function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expires) returns (uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function setSubregistry(uint256 tokenId, address registry)",
]);

export const verifiableFactoryAbi = parseAbi([
  "function deployProxy(address implementation, uint256 salt, bytes data) returns (address)",
]);

export const userRegistryAbi = parseAbi([
  "function initialize(address rootAccount, uint256 roleBitmap)",
]);

export const permissionedResolverWriteAbi = parseAbi([
  "function initialize(address admin, uint256 roleBitmap, bytes[] setters)",
  "function setAddr(bytes32 node, address addr)",
  "function setText(bytes32 node, string key, string value)",
  "function multicall(bytes[] data) returns (bytes[] results)",
  "function authorizeTextRoles(bytes toName, string key, address account, bool grant)",
  "function text(bytes32 node, string key) view returns (string)",
]);

export const dummyUsdcAbi = parseAbi([
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

const OWNED_RESOLVER_ID = keccak256(stringToBytes("OwnedResolver"));
const USER_REGISTRY_ID = keccak256(stringToBytes("UserRegistry"));

export function v2LabelId(label: string): bigint {
  return BigInt(labelhash(label));
}

export function defaultOwnedResolverSalt(owner: `0x${string}`, index = 0n): bigint {
  return BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "address" }, { type: "uint256" }],
        [OWNED_RESOLVER_ID, owner, index],
      ),
    ),
  );
}

export function computeOwnedResolverAddress(opts: {
  deployer: `0x${string}`;
  owner: `0x${string}`;
  index?: bigint;
}): `0x${string}` {
  const salt = defaultOwnedResolverSalt(opts.owner, opts.index ?? 0n);
  const outerSalt = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [opts.deployer, salt],
    ),
  );
  const bytecode = concat([
    "0x3d604d80600a3d3981f3363d3d373d3d3d363d73",
    ENSV2_SEPOLIA.resolverProxyLogic,
    "0x5af43d82803e903d91602b57fd5bf3",
    outerSalt,
  ]);
  return getContractAddress({
    bytecode,
    from: ENSV2_SEPOLIA.resolverFactory,
    opcode: "CREATE2",
    salt: outerSalt,
  });
}

export function defaultUserRegistrySalt(name: string): bigint {
  return BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "bytes32" }, { type: "uint256" }],
        [USER_REGISTRY_ID, namehash(name), 0n],
      ),
    ),
  );
}

export async function isContract(
  client: PublicClient,
  address: `0x${string}`,
): Promise<boolean> {
  const code = await client.getCode({ address });
  return Boolean(code && code !== "0x");
}

export function eth2ldLabel(name: string): string {
  const labels = name.split(".");
  if (labels.length !== 2 || labels[1] !== "eth" || !labels[0]) {
    throw new Error(`Expected a 2LD .eth parent, got ${name}`);
  }
  return labels[0];
}

export { namehash, zeroAddress };
export type { Hex };
export { getAddress };
