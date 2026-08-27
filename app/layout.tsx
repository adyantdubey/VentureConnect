import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "Fayvar — Startup intelligence, built for both sides",
    description: "Discover companies, understand investor fit, size markets, route trusted outreach, and move promising conversations forward.",
    openGraph: {
      type: "website",
      title: "Fayvar — Startup intelligence, built for both sides",
      description: "Discover companies, understand investor fit, size markets, route trusted outreach, and move promising conversations forward.",
      url: origin,
      siteName: "Fayvar",
      images: [{ url: `${origin}/innovestart-network-v2.png`, width: 1731, height: 909, alt: "An abstract network of startups and investors connected through Fayvar" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Fayvar — Startup intelligence, built for both sides",
      description: "Discover companies, understand investor fit, size markets, route trusted outreach, and move promising conversations forward.",
      images: [`${origin}/innovestart-network-v2.png`],
    },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
