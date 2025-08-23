export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Terms of Service</h1>
      <div className="prose max-w-none text-slate-600">
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
          <p>
            By using Chrome Analytics, you agree to these Terms of Service. If you do not agree 
            with these terms, please do not use our service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Use of Service</h2>
          <p>
            Chrome Analytics provides analytics and insights for Chrome Web Store extensions. 
            Our service is provided "as is" for informational purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Data and Privacy</h2>
          <p>
            We collect and analyze publicly available data from the Chrome Web Store. 
            See our Privacy Policy for more information about data handling.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Contact</h2>
          <p>
            If you have questions about these Terms of Service, please contact us.
          </p>
        </section>
      </div>
    </div>
  );
}