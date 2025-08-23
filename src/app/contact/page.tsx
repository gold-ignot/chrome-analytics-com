export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Contact Us</h1>
      <div className="prose max-w-none">
        <p className="text-lg text-slate-600 mb-6">
          Have questions about Chrome Analytics or need support? We'd love to hear from you.
        </p>
        <div className="bg-slate-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Get in Touch</h3>
          <p className="text-slate-600 mb-2">
            For general inquiries, feedback, or partnership opportunities, please reach out to us.
          </p>
          <p className="text-slate-600">
            We typically respond within 24-48 hours during business days.
          </p>
        </div>
      </div>
    </div>
  );
}