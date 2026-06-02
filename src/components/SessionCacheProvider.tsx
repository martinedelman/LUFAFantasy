"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getSessionCache, type SessionCache } from "@/lib/sessionCache";

const SessionCacheContext = createContext<SessionCache | null>(null);

interface SessionCacheProviderProps {
  children: ReactNode;
}

export default function SessionCacheProvider({ children }: SessionCacheProviderProps) {
  const cache = useMemo(() => getSessionCache(), []);

  return <SessionCacheContext.Provider value={cache}>{children}</SessionCacheContext.Provider>;
}

export function useSessionCache() {
  const context = useContext(SessionCacheContext);
  return context || getSessionCache();
}
