import { describe, expect, it } from "vitest";
import { MemoryCache } from "../src/cache/cache.js";

describe("MemoryCache", () => {
  it("returns misses, hits, and invalidates by prefix", async () => {
    const cache = new MemoryCache();
    await expect(cache.get("graph:a")).resolves.toBeNull();
    await cache.set("graph:a", { ok: true }, 10);
    await expect(cache.get("graph:a")).resolves.toEqual({ ok: true });
    await cache.deleteByPrefix("graph:");
    await expect(cache.get("graph:a")).resolves.toBeNull();
  });

  it("expires stale entries", async () => {
    const cache = new MemoryCache();
    await cache.set("metadata:skills", ["CUDA"], 0);
    await expect(cache.get("metadata:skills")).resolves.toBeNull();
  });
});
