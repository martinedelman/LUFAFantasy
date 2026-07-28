import { revalidateTag, unstable_cache } from "next/cache";
import { getDatabaseProvider } from "@/lib/databaseProvider";

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
  const providerScopedKey = `${getDatabaseProvider()}:${key}`;
  const cachedLoader = unstable_cache(loader, [providerScopedKey], {
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
    // Los datos se cachean en el servidor con unstable_cache y se invalidan por
    // etiquetas tras cada mutación. No permitir que el navegador conserve una
    // respuesta antigua, porque no puede conocer esa invalidación.
    "Cache-Control": "private, no-store",
    "X-Cache-TTL": String(ttlSeconds),
  };
}
