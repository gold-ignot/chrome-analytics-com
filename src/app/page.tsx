import Link from 'next/link';
import { apiClient, Extension } from '@/lib/api';
import { extensionUrls } from '@/lib/slugs';
import ExtensionCard from '@/components/ExtensionCard';
import HomePageClient from './HomePageClient';

// Component for category cards
interface CategoryCardProps {
  title: string;
  href: string;
  description: string;
  icon: React.ReactNode;
}

function CategoryCard({ title, href, description, icon }: CategoryCardProps) {
  return (
    <Link href={href} className="group">
      <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-200">
        <div className="flex items-center mb-4">
          <div className="text-blue-600 group-hover:text-blue-700 transition-colors">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-slate-900 ml-3">{title}</h3>
        </div>
        <p className="text-slate-600 text-sm leading-relaxed mb-4">{description}</p>
        <div className="flex items-center text-blue-600 group-hover:text-blue-700 font-medium text-sm">
          Browse {title}
          <svg className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

interface ExtensionSectionProps {
  extensions: Extension[];
  title: string;
  description: string;
  viewAllHref: string;
  viewAllText: string;
  sectionBg?: string;
}

function ExtensionSection({ 
  extensions, 
  title, 
  description, 
  viewAllHref, 
  viewAllText, 
  sectionBg = "" 
}: ExtensionSectionProps) {
  return (
    <section className={`py-12 ${sectionBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {title}
            </h2>
            <p className="text-slate-600 mt-1">
              {description}
            </p>
          </div>
          <Link
            href={viewAllHref}
            className="text-sm font-medium text-slate-700 hover:text-slate-900 flex items-center"
          >
            {viewAllText}
            <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {extensions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {extensions.map((extension) => (
              <ExtensionCard
                key={extension.extension_id}
                extension={extension}
                href={extensionUrls.main(extension)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <div className="text-slate-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No extensions available</h3>
            <p className="text-slate-500">Extensions will appear here once data is loaded.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default async function Home() {
  // Fetch all data server-side in parallel
  let trendingExtensions: Extension[] = [];
  let topRatedExtensions: Extension[] = [];
  let popularExtensions: Extension[] = [];
  let totalExtensions = 0;

  try {
    const [trendingResponse, topRatedResponse, popularResponse] = await Promise.all([
      apiClient.getExtensions(1, 6, 'recent', 'desc').catch(() => ({ extensions: [], total: 0 })),
      apiClient.getExtensions(1, 6, 'rating', 'desc').catch(() => ({ extensions: [], total: 0 })),
      apiClient.getExtensions(1, 6, 'users', 'desc').catch(() => ({ extensions: [], total: 0 }))
    ]);

    trendingExtensions = trendingResponse.extensions || [];
    topRatedExtensions = topRatedResponse.extensions || [];
    popularExtensions = popularResponse.extensions || [];
    totalExtensions = popularResponse.total || 0;
  } catch (error) {
    console.error('Error fetching landing page data:', error);
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Chrome Extension Analytics
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Track growth, analyze performance, and discover insights for Chrome Web Store extensions
          </p>
          
          <div className="max-w-lg mx-auto mb-8">
            <HomePageClient />
          </div>
        </div>
      </section>

      {/* Trending Extensions */}
      <ExtensionSection
        extensions={trendingExtensions}
        title="Trending Extensions"
        description="Recently updated and gaining popularity"
        viewAllHref="/trending"
        viewAllText="View all trending"
      />

      {/* Top Rated Extensions */}
      <ExtensionSection
        extensions={topRatedExtensions}
        title="Top Rated Extensions"
        description="Highest quality extensions based on user ratings"
        viewAllHref="/top-rated"
        viewAllText="View all top-rated"
        sectionBg="bg-white"
      />

      {/* Popular Categories */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Browse by Category
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Find extensions tailored to your specific needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CategoryCard 
              title="Productivity" 
              href="/category/productivity" 
              description="Boost your efficiency with task management and workflow tools"
              icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
            />
            <CategoryCard 
              title="Developer Tools" 
              href="/category/developer-tools" 
              description="Essential tools for web development and programming"
              icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
            />
            <CategoryCard 
              title="Shopping" 
              href="/category/shopping" 
              description="Find deals, compare prices, and shop smarter online"
              icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
            />
            <CategoryCard 
              title="Communication" 
              href="/category/communication" 
              description="Stay connected with messaging and collaboration tools"
              icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
            />
            <CategoryCard 
              title="Entertainment" 
              href="/category/entertainment" 
              description="Games, videos, and fun extensions for your browsing"
              icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <CategoryCard 
              title="Accessibility" 
              href="/category/accessibility" 
              description="Tools that make the web more accessible for everyone"
              icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            />
          </div>

          <div className="text-center mt-8">
            <Link
              href="/extensions"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Browse All Categories
            </Link>
          </div>
        </div>
      </section>

      {/* Popular Extensions */}
      <ExtensionSection
        extensions={popularExtensions}
        title="Most Popular Extensions"
        description="Extensions with the highest number of users"
        viewAllHref="/popular"
        viewAllText="View all popular"
        sectionBg="bg-white"
      />

      {/* Stats */}
      <section className="py-12 bg-slate-100 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {totalExtensions.toLocaleString()}
              </div>
              <div className="text-slate-600">Extensions Tracked</div>
            </div>
            
            <div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                24/7
              </div>
              <div className="text-slate-600">Real-time Monitoring</div>
            </div>
            
            <div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                API
              </div>
              <div className="text-slate-600">Access Available</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}