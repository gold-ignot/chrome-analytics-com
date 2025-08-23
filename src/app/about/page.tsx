export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">About Chrome Analytics</h1>
      <div className="prose max-w-none">
        <p className="text-lg text-slate-600 mb-6">
          Chrome Analytics provides comprehensive insights and analytics for Chrome Web Store extensions. 
          Our platform helps users discover popular extensions, track performance metrics, and analyze market trends.
        </p>
        <p className="text-slate-600">
          We aggregate data from the Chrome Web Store to provide valuable insights about extension performance, 
          user adoption, ratings, and trends in the extension ecosystem.
        </p>
      </div>
    </div>
  );
}