'use client';

import Link from 'next/link';
import { BEST_TYPES } from '@/lib/seoHelpers';
import { Category } from '@/lib/api';

interface FooterClientProps {
  categories: Category[];
}

export default function FooterClient({ categories }: FooterClientProps) {
  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      {/* Structured Data for Site Navigation */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SiteNavigationElement',
            name: 'Chrome Extension Analytics Footer Navigation',
            url: process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com',
            hasPart: [
              {
                '@type': 'SiteNavigationElement',
                name: 'Extension Categories',
                url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com'}/extensions`,
              },
              {
                '@type': 'SiteNavigationElement', 
                name: 'Popular Extensions',
                url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com'}/popular`,
              },
              {
                '@type': 'SiteNavigationElement',
                name: 'Top Rated Extensions', 
                url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com'}/top-rated`,
              },
            ],
          }),
        }}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-900">Chrome Analytics</span>
            </div>
            <p className="text-slate-600 text-sm max-w-md leading-relaxed">
              Comprehensive Chrome extension analytics, tracking performance metrics, user growth, 
              and market trends. Discover the most popular extensions and analyze their success patterns.
            </p>
          </div>

          {/* Browse Extensions */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">
              Browse Extensions
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/extensions" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  All Extensions
                </Link>
              </li>
              <li>
                <Link href="/popular" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  Most Popular
                </Link>
              </li>
              <li>
                <Link href="/top-rated" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  Top Rated
                </Link>
              </li>
              <li>
                <Link href="/trending" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  Trending Now
                </Link>
              </li>
              <li>
                <Link href="/new" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  Newest Extensions
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">
              Categories
            </h3>
            <ul className="space-y-3">
              {categories.slice(0, 6).map((category) => (
                <li key={category.slug}>
                  <Link 
                    href={`/category/${category.slug}`} 
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {category.name} ({category.count})
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Searches */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">
              Popular Searches
            </h3>
            <ul className="space-y-3">
              {Object.entries(BEST_TYPES).slice(0, 6).map(([slug, config]) => (
                <li key={slug}>
                  <Link 
                    href={`/best/${slug}`} 
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {config.title.replace('Best ', '')}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Extended Category Links for SEO - Using top categories dynamically */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.slice(0, 8).map((category) => (
              <div key={category.slug}>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  {category.name}
                </h4>
                <ul className="space-y-2">
                  <li>
                    <Link href={`/category/${category.slug}`} className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                      Browse {category.count} Extensions
                    </Link>
                  </li>
                  {/* Add related "best" link if it exists */}
                  {category.slug === 'developer-tools' && (
                    <li>
                      <Link href="/best/developer-extensions" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                        Best Developer Extensions
                      </Link>
                    </li>
                  )}
                  {category.slug === 'shopping' && (
                    <li>
                      <Link href="/best/shopping-extensions" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                        Best Shopping Extensions
                      </Link>
                    </li>
                  )}
                  {category.slug === 'productivity' && (
                    <li>
                      <Link href="/best/productivity-extensions" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                        Best Productivity Extensions
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Legal and Copyright */}
        <div className="border-t border-slate-200 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-slate-500">
                © 2025 Chrome Analytics. All rights reserved.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Analytics and insights for Chrome Web Store extensions.
              </p>
            </div>
            <div className="flex flex-wrap items-center space-x-6">
              <Link href="/about" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                About
              </Link>
              <Link href="/contact" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                Contact
              </Link>
              <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/sitemap.xml" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}