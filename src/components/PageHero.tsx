"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

type PageHeroProps = {
  path?: string;
  eyebrow?: string;
  title: string;
  imageSrc?: string;
  children?: ReactNode;
};

export default function PageHero({ path, eyebrow, title, imageSrc = "/Hero1.JPG", children }: PageHeroProps) {
  const pathname = usePathname();

  if (path && pathname !== path) {
    return null;
  }

  return (
    <section className="relative isolate overflow-hidden bg-slate-950 text-white" aria-label={`Portada de ${title}`}>
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={
          {
            backgroundImage: `linear-gradient(90deg, rgba(8, 27, 43, 0.9) 0%, rgba(8, 27, 43, 0.72) 48%, rgba(8, 27, 43, 0.34) 100%), url('${imageSrc}')`,
            backgroundPosition: "center 42%",
          } as CSSProperties
        }
        aria-hidden="true"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(12,49,74,0.12)_0%,rgba(12,49,74,0.34)_100%)]" />

      <div className="mx-auto flex min-h-[210px] max-w-7xl items-start px-4 py-6 sm:min-h-[230px] sm:px-6 sm:py-7 lg:min-h-[250px] lg:px-8">
        <div className="w-full">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100 sm:text-sm">{eyebrow}</p>
          )}
          <h1 className="mt-2 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">{title}</h1>
          {children && <div className="mt-5 w-full">{children}</div>}
        </div>
      </div>
    </section>
  );
}
