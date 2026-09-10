import { toHex } from "viem";
import { packetToBytes } from "viem/ens";

/** DNS wire encoding for Permissioned Resolver `authorize*` (`toName`). */
export function dnsEncodedName(name: string): `0x${string}` {
  return toHex(packetToBytes(name));
}
