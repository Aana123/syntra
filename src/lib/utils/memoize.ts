/**
 * Premium, type-safe memoization utility for Syntra Core.
 * Supports synchronous memoization, asynchronous request coalescing, custom resolvers, and Time-To-Live (TTL) expiration.
 */

interface MemoizeOptions<Args extends any[], Value> {
  /**
   * Time to live in milliseconds. If specified, cached values expire after this duration.
   */
  ttlMs?: number;

  /**
   * Custom function to resolve the cache key based on arguments.
   * Defaults to JSON stringification of the arguments.
   */
  resolver?: (...args: Args) => string;
}

interface CacheEntry<Value> {
  value: Value;
  expiry: number | null;
}

/**
 * Default key resolver that serializes arguments using JSON.stringify.
 */
function defaultResolver<Args extends any[]>(...args: Args): string {
  try {
    return JSON.stringify(args);
  } catch (err) {
    // Fallback if args contain non-serializable objects (e.g. circular references)
    return args.map(arg => String(arg)).join("|");
  }
}

/**
 * Memoizes a synchronous function.
 * 
 * @param fn The synchronous function to memoize.
 * @param options Configuration for TTL and key resolution.
 * @returns A memoized version of the function.
 */
export function memoize<Args extends any[], Value>(
  fn: (...args: Args) => Value,
  options: MemoizeOptions<Args, Value> = {}
): (...args: Args) => Value {
  const cache = new Map<string, CacheEntry<Value>>();
  const { ttlMs, resolver = defaultResolver } = options;

  return function (...args: Args): Value {
    const key = resolver(...args);
    const now = Date.now();
    const cached = cache.get(key);

    if (cached) {
      if (cached.expiry === null || cached.expiry > now) {
        return cached.value;
      }
      // Expired entry
      cache.delete(key);
    }

    const value = fn(...args);
    const expiry = ttlMs ? now + ttlMs : null;
    cache.set(key, { value, expiry });

    return value;
  };
}

/**
 * Memoizes an asynchronous function.
 * Incorporates request coalescing: if the function is invoked concurrently with the same arguments
 * before the first promise resolves, it will return the same active promise.
 * 
 * @param fn The asynchronous function to memoize.
 * @param options Configuration for TTL and key resolution.
 * @returns A memoized version of the asynchronous function.
 */
export function memoizeAsync<Args extends any[], Value>(
  fn: (...args: Args) => Promise<Value>,
  options: MemoizeOptions<Args, Value> = {}
): (...args: Args) => Promise<Value> {
  const cache = new Map<string, CacheEntry<Value>>();
  const pendingPromises = new Map<string, Promise<Value>>();
  const { ttlMs, resolver = defaultResolver } = options;

  return function (...args: Args): Promise<Value> {
    const key = resolver(...args);
    const now = Date.now();

    // 1. Check if we have a valid cached value
    const cached = cache.get(key);
    if (cached) {
      if (cached.expiry === null || cached.expiry > now) {
        return Promise.resolve(cached.value);
      }
      // Clean up expired cache
      cache.delete(key);
    }

    // 2. Check if there is already a pending promise for the same key (Coalescing / Deduplication)
    const pending = pendingPromises.get(key);
    if (pending) {
      return pending;
    }

    // 3. Invoke the underlying function and capture its promise
    const promise = fn(...args)
      .then((value) => {
        const expiry = ttlMs ? Date.now() + ttlMs : null;
        cache.set(key, { value, expiry });
        pendingPromises.delete(key);
        return value;
      })
      .catch((err) => {
        // Remove from pending on failure to allow subsequent retry attempts
        pendingPromises.delete(key);
        throw err;
      });

    pendingPromises.set(key, promise);
    return promise;
  };
}
