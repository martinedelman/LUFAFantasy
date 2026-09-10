import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3002"),
  title: { default: "Fantasy Flag Uruguay", template: "%s · Fantasy Flag Uruguay" },
  description: "Armá tu equipo, seguí cada fecha y competí en el fantasy del flag uruguayo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-UY" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
