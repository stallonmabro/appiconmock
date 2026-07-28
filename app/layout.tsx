import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AppIconMock — Free App Icon & Mockup Maker",
    template: "%s | AppIconMock",
  },
  description: "Create stunning app icons for iOS and Android, and beautiful device mockups. Free, no sign-up required. AI-powered icon generation.",
  keywords: ["app icon maker", "mockup generator", "iOS icon", "Android icon", "device mockup", "app store screenshot"],
  authors: [{ name: "AppIconMock" }],
  openGraph: {
    title: "AppIconMock — Free App Icon & Mockup Maker",
    description: "Create stunning app icons and device mockups. Free, AI-powered.",
    url: "https://appiconmock.com",
    siteName: "AppIconMock",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AppIconMock — Free App Icon & Mockup Maker",
    description: "Create stunning app icons and device mockups. Free, AI-powered.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
        <Script
          strategy="lazyOnload"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
