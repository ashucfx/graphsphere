import { cacheOperations } from "../observability/metrics.js";

export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>;
}

export class MemoryCache implements CacheClient {
  private readonly values = new Map<string, CacheEntry<unknown>>();

  public async get<T>(key: string): Promise<T | null> {
    const entry = this.values.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      cacheOperations.labels("get", "miss").inc();
      return null;
    }
    cacheOperations.labels("get", "hit").inc();
    return entry.value as T;
  }

  public async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.values.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
    cacheOperations.labels("set", "ok").inc();
  }

  public async deleteByPrefix(prefix: string): Promise<void> {
    let deleted = 0;
    for (const key of this.values.keys()) {
      if (key.startsWith(prefix)) {
        this.values.delete(key);
        deleted += 1;
      }
    }
    cacheOperations.labels("deleteByPrefix", String(deleted)).inc();
  }
}
