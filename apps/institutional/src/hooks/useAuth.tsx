"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { UserRole } from "@lufa/contracts";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (returnTo?: string) => void;
  signOut: () => void;
  signUp: (returnTo?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificación real de sesión en backend
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setUser(data.data);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = (returnTo?: string) => {
    window.location.assign(`/auth/login?returnTo=${encodeURIComponent(returnTo ?? window.location.pathname)}`);
  };

  const signOut = () => {
    setUser(null);
    window.location.assign("/auth/logout");
  };

  const signUp = (returnTo?: string) => {
    window.location.assign(`/auth/login?returnTo=${encodeURIComponent(returnTo ?? window.location.pathname)}&screen_hint=signup`);
  };

  return <AuthContext.Provider value={{ user, isLoading, signIn, signOut, signUp }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
