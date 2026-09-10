import { describe, expect, it } from "vitest";
import { publicDeskConfig, startDesk } from "./helpers.ts";

describe("desk health", () => {
  it("returns ok without partner credentials", async () => {
    const desk = await startDesk({}, publicDeskConfig());
    try {
      const res = await fetch(`${desk.url}/health`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/application\/json/);
      const body = (await res.json()) as { ok?: unknown };
      expect(body.ok).toBe(true);
    } finally {
      await desk.close();
    }
  });

  it("names the six module boundaries", async () => {
    const desk = await startDesk({}, publicDeskConfig());
    try {
      const res = await fetch(`${desk.url}/health`);
      const body = (await res.json()) as { modules?: unknown };
      expect(body.modules).toEqual([
        "directory",
        "gate",
        "brain",
        "merchandise",
        "ledger",
        "buyer",
      ]);
    } finally {
      await desk.close();
    }
  });
});
