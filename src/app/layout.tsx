import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const siteName = "LUFA Flag";
const siteDescription =
  "Liga Uruguaya de Football Americano: toda la información sobre Flag Football incluyendo partidos, equipos, jugadores, rankings, estadísticas y tabla de posiciones.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: siteName,
  title: {
    default: "LUFA Flag",
    template: "%s | LUFA Flag",
  },
  description: siteDescription,
  keywords: [
    "LUFA",
    "LUFA Flag",
    "flag football Uruguay",
    "Liga Uruguaya de Football Americano",
    "football flag",
    "partidos LUFA",
    "rankings LUFA",
    "equipos flag football",
    "flag football",
  ],
  authors: [{ name: "LUFA Flag" }],
  creator: "LUFA Flag",
  publisher: "LUFA Flag",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      {
        url: "/lufa_flag_icon.jpeg",
        type: "image/jpeg",
        sizes: "225x225",
      },
    ],
    shortcut: "/lufa_flag_icon.jpeg",
    apple: [
      {
        url: "/lufa_flag_icon.jpeg",
        type: "image/jpeg",
        sizes: "225x225",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "es_UY",
    url: "/",
    siteName,
    title: "LUFA Flag",
    description: siteDescription,
    images: [
      {
        url: "/Hero1.JPG",
        width: 1200,
        height: 798,
        alt: "Partido de Flag football en Uruguay",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LUFA Flag",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen`}>
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
