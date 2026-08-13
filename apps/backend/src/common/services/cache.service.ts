import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger('CacheService');
  private readonly store = new Map<string, CacheEntry<any>>();

  /**
   * Set cache entry with TTL in milliseconds (default 5 minutes)
   */
  set<T>(key: string, value: T, ttlMs: number = 300000): void {
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Get cached entry if valid, otherwise returns undefined
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Delete entry by key
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Delete all entries matching a key prefix
   */
  deletePattern(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Wrap an async operation with caching
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttlMs: number = 300000): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const freshValue = await fn();
    this.set(key, freshValue, ttlMs);
    return freshValue;
  }
}
