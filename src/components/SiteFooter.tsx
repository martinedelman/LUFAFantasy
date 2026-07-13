"use client";

import { usePathname } from "next/navigation";
import SponsorsSection from "@/components/SponsorsSection";

export default function SiteFooter() {
  const pathname = usePathname();

  if (pathname?.includes("/print-template")) {
    return null;
  }

  return (
    <footer className="border-t border-white/10 bg-blue-900 text-white">
      <SponsorsSection variant="footer" />
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-6 text-center sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-green-50/90">
          Desarrollado por{" "}
          <a
            href="https://www.linkedin.com/in/medelman01/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white underline decoration-white/35 underline-offset-4 transition hover:decoration-white"
          >
            Martín Edelman
          </a>
        </p>
      </div>
    </footer>
  );
}
