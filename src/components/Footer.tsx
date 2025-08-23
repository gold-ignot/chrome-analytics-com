'use client';

import Link from 'next/link';
import { CATEGORIES, BEST_TYPES } from '@/lib/seoHelpers';

export default function Footer() {
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
        <div className="grid grid-cols-1 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
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
            <div className="flex space-x-4 mt-6">
              <a href="https://twitter.com/chrome-analytics" className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Follow us on Twitter">
                <span className="sr-only">Twitter</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84"/>
                </svg>
              </a>
              <a href="https://github.com/chrome-analytics" className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="View our code on GitHub">
                <span className="sr-only">GitHub</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd"/>
                </svg>
              </a>
            </div>
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
              {Object.entries(CATEGORIES).slice(0, 6).map(([slug, name]) => (
                <li key={slug}>
                  <Link 
                    href={`/category/${slug}`} 
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {name}
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

          {/* Tools & Resources */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">
              Tools & Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/api" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  API Access
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  Analytics Dashboard
                </Link>
              </li>
              <li>
                <Link href="/compare" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  Extension Compare
                </Link>
              </li>
              <li>
                <Link href="/insights" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  Market Insights
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  Chrome Extension Blog
                </Link>
              </li>
              <li>
                <Link href="/guides" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  Extension Guides
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Extended Category Links for SEO */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Productivity
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/category/productivity" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    Productivity Extensions
                  </Link>
                </li>
                <li>
                  <Link href="/best/productivity-extensions" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    Best Productivity Tools
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Security
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/category/security" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    Security Extensions
                  </Link>
                </li>
                <li>
                  <Link href="/best/ad-blockers" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    Best Ad Blockers
                  </Link>
                </li>
                <li>
                  <Link href="/best/password-managers" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    Password Managers
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Development
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/category/developer-tools" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    Developer Tools
                  </Link>
                </li>
                <li>
                  <Link href="/best/developer-extensions" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    Best Dev Extensions
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Shopping
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/category/shopping" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    Shopping Extensions
                  </Link>
                </li>
                <li>
                  <Link href="/best/coupon-extensions" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    Coupon Extensions
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Social Media
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/category/social" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    Social Media Tools
                  </Link>
                </li>
                <li>
                  <Link href="/best/social-media-extensions" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    Social Media Extensions
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Entertainment
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/category/entertainment" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    Entertainment Extensions
                  </Link>
                </li>
                <li>
                  <Link href="/best/youtube-extensions" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    YouTube Extensions
                  </Link>
                </li>
              </ul>
            </div>
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