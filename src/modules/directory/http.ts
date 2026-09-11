import type { Express } from "express";
import { listChildNames } from "./omnigraph.ts";
import { listDesks, probeDesk, type ProbeDesk } from "./catalog.ts";
import { DeskResolveError, type Directory } from "./index.ts";

export const RESOLVE_PATH = "/desk/resolve";
export const CATALOG_PATH = "/desk/catalog";

export type DirectoryHttpOptions = {
  ensnodeUrl?: string;
  listChildren?: (parent: string) => Promise<string[]>;
  probeDesk?: ProbeDesk;
};

export function mountDirectory(
  app: Express,
  directory: Directory,
  options: DirectoryHttpOptions = {},
): void {
  const listChildren =
    options.listChildren ??
    ((parent: string) => listChildNames(parent, options.ensnodeUrl));
  const probe = options.probeDesk ?? probeDesk;

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

  app.get(CATALOG_PATH, async (req, res) => {
    const parent = typeof req.query.parent === "string" ? req.query.parent : "";
    if (!parent.trim()) {
      res.status(400).json({ ok: false, error: "parent query is required" });
      return;
    }
    try {
      const catalog = await listDesks(parent, {
        directory,
        listChildren,
        probe,
      });
      res.json({ ok: true, ...catalog });
    } catch (error) {
      const message = error instanceof Error ? error.message : "catalog failed";
      const status = error instanceof DeskResolveError && /required/i.test(message) ? 400 : 404;
      res.status(status).json({ ok: false, error: message });
    }
  });
}
