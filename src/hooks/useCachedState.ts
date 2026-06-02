"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";
import { useSessionCache } from "@/components/SessionCacheProvider";

export function useCachedState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>, () => void, boolean] {
  const cache = useSessionCache();
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const cachedValue = cache.get<T>(key);
    if (cachedValue !== null) {
      setValue(cachedValue);
    }

    setHydrated(true);
  }, [cache, key]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    cache.set<T>(key, value);
  }, [cache, hydrated, key, value]);

  const reset = useCallback(() => {
    cache.del(key);
    setValue(initialValue);
  }, [cache, initialValue, key]);

  return [value, setValue, reset, hydrated];
}
