"use client";
import { ReactNode } from "react";
import { AuthProvider } from "../hooks/useAuth";
import { SiteConfigProvider, type SiteConfig } from "../site/SiteConfig";
import SessionCacheProvider from "./SessionCacheProvider";

interface ProvidersProps {
  siteConfig: SiteConfig;
  children: ReactNode;
}

export default function Providers({ siteConfig, children }: ProvidersProps) {
  return (
    <SiteConfigProvider config={siteConfig}>
      <SessionCacheProvider>
        <AuthProvider>{children}</AuthProvider>
      </SessionCacheProvider>
    </SiteConfigProvider>
  );
}
