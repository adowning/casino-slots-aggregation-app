import NodeCache from 'node-cache';

export class CacheService {
  private cache: NodeCache;

  constructor(stdTTL: number = 0, checkperiod: number = 600) {
    // stdTTL: default time-to-live in seconds for new keys. 0 = infinite.
    // checkperiod: period in seconds to automatically perform delete E.g. expired keys.
    this.cache = new NodeCache({ stdTTL, checkperiod });
    console.log(`CacheService initialized with stdTTL: ${stdTTL}s, checkperiod: ${checkperiod}s`);
  }

  public get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    // console.log(`Cache GET: key='${key}', found=${value !== undefined}`);
    return value;
  }

  public put(key: string, value: any, ttlSeconds?: number): boolean {
    let success: boolean;
    if (ttlSeconds !== undefined) {
      success = this.cache.set(key, value, ttlSeconds);
    } else {
      success = this.cache.set(key, value); // Uses stdTTL if ttlSeconds is not provided
    }
    // console.log(`Cache PUT: key='${key}', success=${success}, ttl=${ttlSeconds !== undefined ? ttlSeconds + 's' : 'stdTTL'}`);
    return success;
  }

  public forget(key: string): boolean {
    const deletedCount = this.cache.del(key);
    // console.log(`Cache FORGET: key='${key}', deleted=${deletedCount > 0}`);
    return deletedCount > 0;
  }

  public flushAll(): void {
    this.cache.flushAll();
    console.log('Cache FLUSHALL: All cache cleared.');
  }

  public async remember<T>(
    key: string,
    ttlSeconds: number, // TTL must be provided for remember
    fallback: () => Promise<T> | T
  ): Promise<T> {
    const cachedValue = this.get<T>(key);
    if (cachedValue !== undefined) {
      // console.log(`Cache REMEMBER (HIT): key='${key}'`);
      return cachedValue;
    }

    // console.log(`Cache REMEMBER (MISS): key='${key}', executing fallback.`);
    const result = await fallback();
    this.put(key, result, ttlSeconds);
    return result;
  }

  public rememberSync<T>(
    key: string,
    ttlSeconds: number, // TTL must be provided for remember
    fallback: () => T
  ): T {
    const cachedValue = this.get<T>(key);
    if (cachedValue !== undefined) {
      // console.log(`Cache REMEMBER_SYNC (HIT): key='${key}'`);
      return cachedValue;
    }

    // console.log(`Cache REMEMBER_SYNC (MISS): key='${key}', executing fallback.`);
    const result = fallback();
    this.put(key, result, ttlSeconds);
    return result;
  }

  // Additional useful methods from Laravel Cache
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public take(key: string): any | undefined {
    // Gets item and deletes it
    return this.cache.take(key);
  }

  public getStats() {
    return this.cache.getStats();
  }
}

// Optional: Export a default instance for singleton-like usage if preferred,
// but injectable is generally better for testing.
// export const cacheServiceInstance = new CacheService();
