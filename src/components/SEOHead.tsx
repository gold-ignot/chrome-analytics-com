'use client';

import Head from 'next/head';
import { SEOData } from '@/lib/seo';

interface SEOHeadProps {
  seoData: SEOData;
}

export default function SEOHead({ seoData }: SEOHeadProps) {
  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{seoData.title}</title>
      <meta name="description" content={seoData.description} />
      <meta name="keywords" content={seoData.keywords.join(', ')} />
      
      {/* Canonical URL */}
      {seoData.canonical && <link rel="canonical" href={seoData.canonical} />}
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={seoData.openGraph.title} />
      <meta property="og:description" content={seoData.openGraph.description} />
      <meta property="og:type" content={seoData.openGraph.type} />
      {seoData.openGraph.url && <meta property="og:url" content={seoData.openGraph.url} />}
      {seoData.openGraph.image && <meta property="og:image" content={seoData.openGraph.image} />}
      <meta property="og:site_name" content="Chrome Extension Analytics" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={seoData.twitter.card} />
      <meta name="twitter:title" content={seoData.twitter.title} />
      <meta name="twitter:description" content={seoData.twitter.description} />
      {seoData.twitter.image && <meta name="twitter:image" content={seoData.twitter.image} />}
      
      {/* Additional SEO Tags */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="1 days" />
      <meta name="author" content="Chrome Extension Analytics" />
      
      {/* Structured Data */}
      {seoData.structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(seoData.structuredData),
          }}
        />
      )}
    </Head>
  );
}

// For App Router, we need to use Next.js metadata API instead
export function generateMetadata(seoData: SEOData) {
  return {
    title: seoData.title,
    description: seoData.description,
    keywords: seoData.keywords.join(', '),
    canonical: seoData.canonical,
    openGraph: {
      title: seoData.openGraph.title,
      description: seoData.openGraph.description,
      type: seoData.openGraph.type,
      url: seoData.openGraph.url,
      images: seoData.openGraph.image ? [seoData.openGraph.image] : [],
      siteName: 'Chrome Extension Analytics',
    },
    twitter: {
      card: seoData.twitter.card,
      title: seoData.twitter.title,
      description: seoData.twitter.description,
      images: seoData.twitter.image ? [seoData.twitter.image] : [],
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    other: {
      'revisit-after': '1 days',
    },
  };
}