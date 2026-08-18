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
    title: "Innovestart — Where startups meet conviction",
    description: "Discover ambitious startups, meet aligned investors, and build what’s next on Innovestart.",
    openGraph: {
      type: "website",
      title: "Innovestart — Where startups meet conviction",
      description: "Founder stories, verified traction, and trusted investor connections—all in one high-signal network.",
      url: origin,
      siteName: "Innovestart",
      images: [{ url: `${origin}/og.png`, width: 1728, height: 920, alt: "Innovestart — Where bold ideas meet conviction" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Innovestart — Where startups meet conviction",
      description: "Founder stories, verified traction, and trusted investor connections.",
      images: [`${origin}/og.png`],
    },
  icons: {
    icon: "/og.png",
    shortcut: "/og.png",
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
