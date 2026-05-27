interface CacheEntry<T> {
  value?: T;
  expiresAt: number;
  pending?: Promise<T>;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

function pruneExpiredEntries(now: number) {
  for (const [key, entry] of cacheStore.entries()) {
    if (!entry.pending && entry.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }
}

export function buildRequestCacheKey(namespace: string, searchParams?: URLSearchParams) {
  if (!searchParams || Array.from(searchParams.keys()).length === 0) {
    return namespace;
  }

  const normalizedParams = Array.from(searchParams.entries())
    .sort(([keyA, valueA], [keyB, valueB]) => {
      if (keyA === keyB) {
        return valueA.localeCompare(valueB);
      }

      return keyA.localeCompare(keyB);
    })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  return `${namespace}:${normalizedParams}`;
}

export async function getCachedValue<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = cacheStore.get(key) as CacheEntry<T> | undefined;

  if (entry?.value !== undefined && entry.expiresAt > now) {
    return entry.value;
  }

  if (entry?.pending) {
    return entry.pending;
  }

  if (cacheStore.size > 500) {
    pruneExpiredEntries(now);
  }

  const pending = loader();
  cacheStore.set(key, {
    pending,
    expiresAt: now + ttlMs,
  });

  try {
    const value = await pending;
    cacheStore.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });

    return value;
  } catch (error) {
    cacheStore.delete(key);
    throw error;
  }
}

export function invalidateCacheByPrefix(prefixes: string | string[]) {
  const prefixList = Array.isArray(prefixes) ? prefixes : [prefixes];
  let deleted = 0;

  for (const key of cacheStore.keys()) {
    if (prefixList.some((prefix) => key === prefix || key.startsWith(`${prefix}:`))) {
      cacheStore.delete(key);
      deleted += 1;
    }
  }

  return deleted;
}

export function createCacheHeaders(ttlSeconds: number) {
  return {
    "Cache-Control": `private, max-age=${ttlSeconds}`,
    "X-Cache-TTL": String(ttlSeconds),
  };
}
