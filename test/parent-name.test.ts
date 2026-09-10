import { describe, expect, it } from "vitest";
import { dnsEncodedName } from "../src/modules/directory/dns-name.ts";
import { ethRegistrarAbi } from "../src/modules/directory/ensv2-sepolia.ts";
import { PARENT_CANDIDATES, childName, chooseParentName } from "../src/modules/directory/parent-name.ts";

describe("parent name", () => {
  it("picks nametoll.eth as the first candidate", () => {
    expect(PARENT_CANDIDATES[0]).toBe("nametoll.eth");
    expect(childName("nametoll.eth")).toBe("desk.nametoll.eth");
  });

  it("prefers a name we already own over a later available candidate", () => {
    expect(
      chooseParentName([
        { name: "nametoll.eth", available: false, ownedByUs: true },
        { name: "nametolldesk.eth", available: true, ownedByUs: false },
      ]),
    ).toBe("nametoll.eth");
  });

  it("falls through when the product name is taken by someone else", () => {
    expect(
      chooseParentName([
        { name: "nametoll.eth", available: false, ownedByUs: false },
        { name: "nametolldesk.eth", available: true, ownedByUs: false },
      ]),
    ).toBe("nametolldesk.eth");
  });
});

describe("ENSv2 Sepolia helpers", () => {
  it("DNS-encodes names the way Permissioned Resolver docs show", () => {
    expect(dnsEncodedName("alice.eth")).toBe("0x05616c6963650365746800");
  });

  it("keeps secret on the official v2 register ABI", () => {
    const register = ethRegistrarAbi.find(
      (item) => item.type === "function" && item.name === "register",
    );
    expect(register?.inputs.map((input) => input.name)).toEqual([
      "label",
      "owner",
      "secret",
      "subregistry",
      "resolver",
      "duration",
      "paymentToken",
      "referrer",
    ]);
  });
});
