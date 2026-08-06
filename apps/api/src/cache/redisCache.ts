import { Redis } from "ioredis";
import type { CacheClient } from "./cache.js";
import { cacheOperations } from "../observability/metrics.js";

export class RedisCache implements CacheClient {
  private readonly redis: Redis;

  public constructor(url: string) {
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      }
    });
    this.redis.on("error", (error) => {
      console.error("Redis Cache Error:", error);
    });
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (data) {
        cacheOperations.labels("get", "hit").inc();
        return JSON.parse(data) as T;
      }
      cacheOperations.labels("get", "miss").inc();
      return null;
    } catch (e) {
      cacheOperations.labels("get", "error").inc();
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      cacheOperations.labels("set", "ok").inc();
    } catch (e) {
      cacheOperations.labels("set", "error").inc();
    }
  }

  public async deleteByPrefix(prefix: string): Promise<void> {
    try {
      let cursor = "0";
      let deleted = 0;
      do {
        const result = await this.redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
        cursor = result[0];
        const keys = result[1];
        if (keys.length > 0) {
          await this.redis.del(...keys);
          deleted += keys.length;
        }
      } while (cursor !== "0");
      cacheOperations.labels("deleteByPrefix", String(deleted)).inc();
    } catch (e) {
      cacheOperations.labels("deleteByPrefix", "error").inc();
    }
  }
}
