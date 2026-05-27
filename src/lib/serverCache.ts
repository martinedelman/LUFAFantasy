import { revalidateTag, unstable_cache } from "next/cache";

interface CachedValueOptions {
  tags: string[];
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

export async function getCachedValue<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  options: CachedValueOptions,
): Promise<T> {
  const cachedLoader = unstable_cache(loader, [key], {
    revalidate: Math.max(1, Math.ceil(ttlMs / 1000)),
    tags: options.tags,
  });

  return cachedLoader();
}

export function invalidateCacheByPrefix(prefixes: string | string[]) {
  const tags = Array.isArray(prefixes) ? prefixes : [prefixes];
  tags.forEach((tag) => revalidateTag(tag));
  return tags.length;
}

export function createCacheHeaders(ttlSeconds: number) {
  return {
    "Cache-Control": `private, max-age=${ttlSeconds}`,
    "X-Cache-TTL": String(ttlSeconds),
  };
}
