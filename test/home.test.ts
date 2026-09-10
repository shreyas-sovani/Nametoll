import { describe, expect, it } from "vitest";
import { publicDeskConfig, startDesk } from "./helpers.ts";

describe("public desk page", () => {
  it("explains the pay desk without a baked-in name", async () => {
    const desk = await startDesk({}, publicDeskConfig());
    try {
      const res = await fetch(`${desk.url}/`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/text\/html/);
      const html = await res.text();
      expect(html).toMatch(/Nametoll/i);
      expect(html).toMatch(/\/desk\/snapshot/);
      expect(html).toMatch(/402/);
      expect(html.toLowerCase()).not.toMatch(/\.eth/);
    } finally {
      await desk.close();
    }
  });
});
