import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import EnvironmentWatermark from "@lufa/institutional-web/components/EnvironmentWatermark";
import "./globals.css";
import "./flag-font.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "LUFA",
  description: "Portal institucional de la Liga Uruguaya de Football Americano.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-UY">
      <body className={geistSans.variable}>
        {children}
        <EnvironmentWatermark />
        <Analytics />
      </body>
    </html>
  );
}
