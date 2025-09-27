interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class Cache {
  private storage: Map<string, CacheItem<unknown>>;
  private defaultTTL: number;

  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.storage = new Map();
    this.defaultTTL = defaultTTL;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };
    this.storage.set(key, item);
  }

  get<T = unknown>(key: string): T | null {
    const item = this.storage.get(key);

    if (!item) {
      return null;
    }

    const now = Date.now();
    const age = now - item.timestamp;

    if (age > item.ttl) {
      this.storage.delete(key);
      return null;
    }

    return item.data as T;
  }

  has(key: string): boolean {
    const item = this.storage.get(key);

    if (!item) {
      return false;
    }

    const now = Date.now();
    const age = now - item.timestamp;

    if (age > item.ttl) {
      this.storage.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  cleanup(): void {
    const now = Date.now();

    for (const [key, item] of this.storage.entries()) {
      const age = now - item.timestamp;
      if (age > item.ttl) {
        this.storage.delete(key);
      }
    }
  }

  size(): number {
    return this.storage.size;
  }

  keys(): string[] {
    return Array.from(this.storage.keys());
  }
}

// Create a singleton cache instance
export const cache = new Cache();

// Cleanup expired items every 5 minutes
setInterval(() => {
  cache.cleanup();
}, 5 * 60 * 1000);

export default cache;