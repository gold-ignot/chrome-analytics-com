'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATEGORIES, BEST_TYPES } from '@/lib/seoHelpers';

export default function SEOOptimizedHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActivePath = (path: string) => {
    return pathname === path || pathname.startsWith(path);
  };

  const handleLinkClick = () => {
    setIsCategoryMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
      {/* Structured Data for Site Navigation */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SiteNavigationElement',
            name: 'Chrome Extension Analytics Navigation',
            url: process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com',
          }),
        }}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo with SEO-optimized text */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2" aria-label="Chrome Extension Analytics - Home">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-900">Chrome Analytics</span>
            </Link>
          </div>

          {/* Main Navigation - SEO Optimized */}
          <nav className="hidden lg:flex items-center space-x-1" role="navigation" aria-label="Primary navigation">
            {/* Extensions Dropdown */}
            <div className="relative">
              <button
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${
                  isActivePath('/extensions') || isActivePath('/category')
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                aria-expanded={isCategoryMenuOpen}
                aria-haspopup="true"
              >
                Extensions
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isCategoryMenuOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-50">
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Primary Extension Pages */}
                      <div className="col-span-2 border-b border-slate-100 pb-3 mb-3">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Browse Extensions</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            href="/extensions"
                            onClick={handleLinkClick}
                            className="block px-3 py-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                          >
                            All Extensions
                          </Link>
                          <Link
                            href="/popular"
                            onClick={handleLinkClick}
                            className="block px-3 py-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                          >
                            Most Popular
                          </Link>
                          <Link
                            href="/top-rated"
                            onClick={handleLinkClick}
                            className="block px-3 py-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                          >
                            Top Rated
                          </Link>
                          <Link
                            href="/trending"
                            onClick={handleLinkClick}
                            className="block px-3 py-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                          >
                            Trending
                          </Link>
                        </div>
                      </div>
                      
                      {/* Categories */}
                      <div>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Categories</h3>
                        {Object.entries(CATEGORIES).slice(0, 5).map(([slug, name]) => (
                          <Link
                            key={slug}
                            href={`/category/${slug}`}
                            onClick={handleLinkClick}
                            className="block px-3 py-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                          >
                            {name}
                          </Link>
                        ))}
                      </div>
                      
                      {/* Popular Searches */}
                      <div>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Popular</h3>
                        <Link
                          href="/best/ad-blockers"
                          onClick={handleLinkClick}
                          className="block px-3 py-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                        >
                          Ad Blockers
                        </Link>
                        <Link
                          href="/best/password-managers"
                          onClick={handleLinkClick}
                          className="block px-3 py-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                        >
                          Password Managers
                        </Link>
                        <Link
                          href="/best/developer-extensions"
                          onClick={handleLinkClick}
                          className="block px-3 py-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                        >
                          Developer Tools
                        </Link>
                        <Link
                          href="/best/productivity-extensions"
                          onClick={handleLinkClick}
                          className="block px-3 py-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                        >
                          Productivity
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Navigation Links */}
            <Link
              href="/popular"
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActivePath('/popular') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Popular
            </Link>
            
            <Link
              href="/top-rated"
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActivePath('/top-rated') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Top Rated
            </Link>
            
            <Link
              href="/trending"
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActivePath('/trending') 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Trending
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center space-x-4">
            <Link 
              href="/extensions"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              Browse Extensions
            </Link>
            <Link 
              href="https://vaidas7.typeform.com/to/H13YYQ6O"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              API Access
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-label="Open main menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 py-4">
            <nav className="space-y-2" role="navigation" aria-label="Mobile navigation">
              <Link
                href="/extensions"
                onClick={handleLinkClick}
                className="block px-3 py-2 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors"
              >
                All Extensions
              </Link>
              <Link
                href="/popular"
                onClick={handleLinkClick}
                className="block px-3 py-2 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors"
              >
                Most Popular
              </Link>
              <Link
                href="/top-rated"
                onClick={handleLinkClick}
                className="block px-3 py-2 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors"
              >
                Top Rated
              </Link>
              <Link
                href="/trending"
                onClick={handleLinkClick}
                className="block px-3 py-2 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors"
              >
                Trending
              </Link>
              
              {/* Mobile Categories */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Categories</h3>
                {Object.entries(CATEGORIES).slice(0, 6).map(([slug, name]) => (
                  <Link
                    key={slug}
                    href={`/category/${slug}`}
                    onClick={handleLinkClick}
                    className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors"
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {isCategoryMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsCategoryMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  );
}