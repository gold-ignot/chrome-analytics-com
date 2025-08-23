export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
      <div className="prose max-w-none text-slate-600">
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Information We Collect</h2>
          <p>
            Chrome Analytics collects publicly available information from the Chrome Web Store, 
            including extension names, descriptions, ratings, user counts, and other metadata.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">How We Use Information</h2>
          <p>
            We use the collected data to provide analytics, insights, and trend analysis 
            for Chrome Web Store extensions. This helps users discover and evaluate extensions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Data Sharing</h2>
          <p>
            We do not sell personal information. The data we display is based on publicly 
            available information from the Chrome Web Store.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Cookies and Tracking</h2>
          <p>
            We may use cookies for basic functionality and analytics to improve our service. 
            No personal information is collected through these cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Contact</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us.
          </p>
        </section>
      </div>
    </div>
  );
}