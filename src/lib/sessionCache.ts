"use client";

type CacheEntry = {
  value: unknown;
  expiresAt?: number;
};

const STORAGE_KEY = "lufa:session-cache";

function hasWindow() {
  return typeof window !== "undefined";
}

class SessionCache {
  private store = new Map<string, CacheEntry>();
  private hydrated = false;

  private hydrateFromStorage() {
    if (this.hydrated || !hasWindow()) {
      return;
    }

    this.hydrated = true;

    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
      const now = Date.now();

      Object.entries(parsed).forEach(([key, entry]) => {
        if (entry?.expiresAt && entry.expiresAt <= now) {
          return;
        }

        this.store.set(key, entry);
      });

      this.flush();
    } catch (error) {
      console.warn("[SessionCache] Cache corrupto, limpiando datos:", error);
      this.store.clear();
    }
  }

  private flush() {
    if (!hasWindow()) {
      return;
    }

    const serialized = JSON.stringify(Object.fromEntries(this.store.entries()));
    window.sessionStorage.setItem(STORAGE_KEY, serialized);
  }

  get<T>(key: string): T | null {
    this.hydrateFromStorage();

    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.flush();
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number) {
    this.hydrateFromStorage();

    const expiresAt = ttlMs && ttlMs > 0 ? Date.now() + ttlMs : undefined;

    this.store.set(key, {
      value,
      expiresAt,
    });

    this.flush();
  }

  del(key: string) {
    this.hydrateFromStorage();
    this.store.delete(key);
    this.flush();
  }

  clear() {
    this.hydrateFromStorage();
    this.store.clear();
    this.flush();
  }
}

let sessionCacheSingleton: SessionCache | null = null;

export function getSessionCache() {
  if (!sessionCacheSingleton) {
    sessionCacheSingleton = new SessionCache();
  }

  return sessionCacheSingleton;
}

export type { SessionCache };
