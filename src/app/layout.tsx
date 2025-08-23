import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import FooterWrapper from "@/components/FooterWrapper";
import { GCScript } from 'next-goatcounter';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "ChromeInsights - Chrome Extension Analytics & Growth Tracking",
    template: "%s | ChromeInsights"
  },
  description: "Track Chrome extension growth, analyze performance metrics, and discover trending extensions. Built for developers and marketers who want data-driven insights.",
  keywords: ["chrome extensions", "analytics", "growth tracking", "extension metrics", "chrome web store", "developer tools"],
  authors: [{ name: "ChromeInsights" }],
  creator: "ChromeInsights",
  publisher: "ChromeInsights",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://chrome-analytics.com',
    title: 'ChromeInsights - Chrome Extension Analytics & Growth Tracking',
    description: 'Track Chrome extension growth, analyze performance metrics, and discover trending extensions. Built for developers and marketers who want data-driven insights.',
    siteName: 'ChromeInsights',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChromeInsights - Chrome Extension Analytics & Growth Tracking',
    description: 'Track Chrome extension growth, analyze performance metrics, and discover trending extensions. Built for developers and marketers who want data-driven insights.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/chrome-analytics-icon.svg', type: 'image/svg+xml', sizes: '32x32' }
    ],
    shortcut: '/favicon.svg',
    apple: '/chrome-analytics-icon.svg',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} font-sans antialiased bg-slate-50`}>
        <GCScript siteUrl="https://chromeanalytics.goatcounter.com/count" />
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <FooterWrapper />
        </div>
      </body>
    </html>
  );
}
