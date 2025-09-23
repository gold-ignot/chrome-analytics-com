import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SEOOptimizedHeader from "@/components/SEOOptimizedHeader";
import FooterWrapper from "@/components/FooterWrapper";
import LoadingBar from "@/components/LoadingBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Chrome Analytics - Chrome Extension Analytics & Growth Tracking",
    template: "%s | Chrome Analytics"
  },
  description: "Track Chrome extension growth, analyze performance metrics, and discover trending extensions. Built for developers and marketers who want data-driven insights.",
  keywords: ["chrome extensions", "analytics", "growth tracking", "extension metrics", "chrome web store", "developer tools"],
  authors: [{ name: "Chrome Analytics" }],
  creator: "Chrome Analytics",
  publisher: "Chrome Analytics",
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
    title: 'Chrome Analytics - Chrome Extension Analytics & Growth Tracking',
    description: 'Track Chrome extension growth, analyze performance metrics, and discover trending extensions. Built for developers and marketers who want data-driven insights.',
    siteName: 'Chrome Analytics',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chrome Analytics - Chrome Extension Analytics & Growth Tracking',
    description: 'Track Chrome extension growth, analyze performance metrics, and discover trending extensions. Built for developers and marketers who want data-driven insights.',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml', sizes: '32x32' }
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
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
        <LoadingBar />
        <div className="min-h-screen flex flex-col">
          <SEOOptimizedHeader />
          <main className="flex-1">
            {children}
          </main>
          <FooterWrapper />
        </div>
      </body>
    </html>
  );
}
