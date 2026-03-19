import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Fathom from "@/component/Fathom";

const API_URL = process.env.API_URL || "http://localhost:3001";

const geist = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});

type Branding = {
  siteName: string;
  title: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  accentColor: string;
};

async function getBranding(): Promise<Branding> {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/knowledge-base/public/branding`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.branding) return data.branding;
    }
  } catch {}
  return {
    siteName: "Knowledge Base",
    title: "Help Center",
    accentColor: "#14b8a6",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: branding.siteName,
    description: `${branding.title} — find answers, guides, and troubleshooting steps.`,
    ...(branding.faviconUrl
      ? { icons: { icon: branding.faviconUrl } }
      : {}),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased`}>
        <Fathom />
        {children}
      </body>
    </html>
  );
}
