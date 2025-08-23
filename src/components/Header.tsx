import Link from 'next/link';

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Chrome Analytics</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/extensions" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
              Extensions
            </Link>
            <Link href="/popular" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
              Popular
            </Link>
            <Link href="/top-rated" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
              Top Rated
            </Link>
            <Link href="/trending" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
              Trending
            </Link>
            <Link href="/best/productivity-extensions" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
              Best
            </Link>
          </nav>

          {/* Search or Mobile Menu */}
          <div className="flex items-center">
            <Link 
              href="/extensions"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Browse All
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}