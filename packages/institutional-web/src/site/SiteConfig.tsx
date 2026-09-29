"use client";

import { createContext, useContext, type ReactNode } from "react";

export type SiteModality = "flag" | "tackle";

/**
 * Everything that differs between the institutional sites (flag, tackle).
 * Each app defines one in `src/site.config.ts` and passes it to `Providers`.
 * Images with the same role keep the same file name in every app's
 * `public/` (Hero1.JPG, Games.JPG, ...), so only the files change.
 */
export type SiteConfig = {
  modality: SiteModality;
  /** "LUFA Flag" */
  siteName: string;
  /** "Flag Football" */
  sportName: string;
  /** Short name used in running copy: "el flag". */
  sportShortName: string;
  /** Prefix for analytics event names: "Flag" → "Flag interest form submitted". */
  analyticsLabel: string;
  logo: { src: string; alt: string };
  /** Fallbacks used until the API site settings load. */
  contact: {
    email: string;
    instagramUrl: string;
    whatsappChannelUrl: string;
    whatsappMessageTemplate: string;
  };
};

const SiteConfigContext = createContext<SiteConfig | null>(null);

export function SiteConfigProvider({ config, children }: { config: SiteConfig; children: ReactNode }) {
  return <SiteConfigContext.Provider value={config}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig(): SiteConfig {
  const config = useContext(SiteConfigContext);
  if (!config) throw new Error("useSiteConfig must be used inside <SiteConfigProvider>");
  return config;
}
