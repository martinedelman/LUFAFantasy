import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Verificar Real ID · LUFA",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function VerifyLayout({ children }: { children: ReactNode }) {
  return children;
}
