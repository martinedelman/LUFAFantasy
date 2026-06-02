"use client";
import { ReactNode } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import SessionCacheProvider from "@/components/SessionCacheProvider";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionCacheProvider>
      <AuthProvider>{children}</AuthProvider>
    </SessionCacheProvider>
  );
}
