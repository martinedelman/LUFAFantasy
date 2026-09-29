import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@lufa/institutional-web/components/Navbar";
import Providers from "@lufa/institutional-web/components/Providers";
import SiteFooter from "@lufa/institutional-web/components/SiteFooter";
import { Analytics } from "@vercel/analytics/next";
import { siteConfig } from "@/site.config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004";
const siteName = "LUFA Tackle";
const siteDescription =
  "Tackle Football en Uruguay: partidos, equipos, jugadores, rankings, estadísticas y tabla de posiciones de LUFA Tackle.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: siteName,
  title: {
    default: "LUFA Tackle",
    template: "%s | LUFA Tackle",
  },
  description: siteDescription,
  keywords: [
    "LUFA",
    "LUFA Tackle",
    "tackle football Uruguay",
    "Liga Uruguaya de Football Americano",
    "football americano Uruguay",
    "partidos LUFA",
    "rankings LUFA",
    "equipos tackle football",
    "tackle football",
  ],
  authors: [{ name: "LUFA Tackle" }],
  creator: "LUFA Tackle",
  publisher: "LUFA Tackle",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      {
        url: "/favicon-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/favicon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: "/favicon-192.png",
    apple: [
      {
        url: "/apple-touch-icon.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "es_UY",
    url: "/",
    siteName,
    title: "LUFA Tackle | Tackle Football en Uruguay",
    description: siteDescription,
    images: [
      {
        url: "/Hero1.JPG",
        width: 1200,
        height: 798,
        alt: "Partido de Tackle football en Uruguay",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LUFA Tackle | Tackle Football en Uruguay",
    description: siteDescription,
    images: ["/Hero1.JPG"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen flex flex-col`}>
        <Providers siteConfig={siteConfig}>
          <Navbar />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
