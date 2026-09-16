"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { fantasyRequest, type FantasyUser } from "@/lib/fantasyApi";

interface SessionValue { user: FantasyUser | null; loading: boolean; features: Record<string, boolean>; refresh: () => Promise<void> }
const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FantasyUser | null>(null);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  async function refresh() {
    try {
      const data = await fantasyRequest<{ user: FantasyUser; features: Record<string, boolean> }>("/bootstrap");
      setUser(data.user); setFeatures(data.features);
    } catch { setUser(null); setFeatures({}); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  return <SessionContext.Provider value={{ user, loading, features, refresh }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession debe usarse dentro de SessionProvider");
  return value;
}
