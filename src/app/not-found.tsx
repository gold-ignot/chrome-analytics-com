import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found | Chrome Analytics',
  description: 'The page you are looking for could not be found.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* 404 Animation */}
        <div className="mb-8">
          <div className="relative">
            <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 select-none">
              404
            </h1>
            <div className="absolute inset-0 text-9xl font-black text-slate-200 -z-10 transform translate-x-1 translate-y-1">
              404
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">
              Page Not Found
            </h2>
            <p className="text-lg text-slate-600 max-w-md mx-auto">
              Looks like this Chrome extension wandered off into the digital void. Don't worry, we'll help you find your way back!
            </p>
          </div>

          {/* Decorative Icon */}
          <div className="flex justify-center my-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              {/* Floating elements */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-200 rounded-full opacity-60 animate-bounce"></div>
              <div className="absolute -bottom-1 -left-3 w-4 h-4 bg-purple-200 rounded-full opacity-40 animate-pulse"></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m0 0V11a1 1 0 011-1h2a1 1 0 011 1v10m3 0a1 1 0 001-1V10M9 21h6" />
              </svg>
              Go Home
            </Link>
            
            <Link
              href="/extensions"
              className="inline-flex items-center px-6 py-3 bg-white text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Extensions
            </Link>
          </div>

          {/* Popular Links */}
          <div className="pt-8 border-t border-slate-200">
            <p className="text-sm text-slate-500 mb-4">Or try these popular sections:</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/popular" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">Popular</Link>
              <span className="text-slate-300">•</span>
              <Link href="/trending" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">Trending</Link>
              <span className="text-slate-300">•</span>
              <Link href="/top-rated" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">Top Rated</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}