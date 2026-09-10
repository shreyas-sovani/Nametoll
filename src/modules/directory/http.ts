import type { Express } from "express";
import { DeskResolveError, type Directory } from "./index.ts";

export const RESOLVE_PATH = "/desk/resolve";

export function mountDirectory(app: Express, directory: Directory): void {
  app.get(RESOLVE_PATH, async (req, res) => {
    const name = typeof req.query.name === "string" ? req.query.name : "";
    if (!name.trim()) {
      res.status(400).json({ ok: false, error: "name query is required" });
      return;
    }
    try {
      const resolved = await directory.resolve(name);
      res.json({
        ok: true,
        name: resolved.name,
        descriptor: resolved.descriptor,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "resolve failed";
      const status = error instanceof DeskResolveError && /required/i.test(message) ? 400 : 404;
      res.status(status).json({ ok: false, error: message });
    }
  });
}
