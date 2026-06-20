import { Link } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c3aed]/20">
            <FileText className="h-5 w-5 text-[#a78bfa]" />
          </div>
          <h1 className="text-2xl font-bold">Terms of Service</h1>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-white/70">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Quid (the "Service"), you agree to be bound by these Terms of Service. If you do not agree, you must not use the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">2. Description of Service</h2>
            <p>
              Quid provides a subscription management and comparison platform. We analyse your financial data (with your consent) to identify recurring subscriptions, compare providers, and facilitate switches to better-value alternatives.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">3. User Accounts</h2>
            <p className="mb-2">You must:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Be at least 18 years old and resident in the United Kingdom.</li>
              <li>Provide accurate and complete registration information.</li>
              <li>Maintain the confidentiality of your account credentials.</li>
              <li>Notify us immediately of any unauthorised access.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">4. Open Banking & Bank Connections</h2>
            <p>
              To use our analysis features, you may connect your UK bank account via regulated Open Banking APIs. You grant us read-only access to transaction data solely for the purpose of identifying subscriptions. You may disconnect your bank at any time. We do not store your banking credentials.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">5. Affiliate Links & Commissions</h2>
            <p>
              When you choose to switch providers through our platform, you may be redirected via affiliate tracking links. We earn a commission from the new provider when you complete a switch. This does not affect the price you pay. We disclose affiliate relationships transparently.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">6. Accuracy of Information</h2>
            <p>
              We strive to provide accurate comparisons, but provider prices, terms, and availability change frequently. We do not guarantee that any saving estimate is final or that a switch will be successful. Always verify details directly with the provider before committing.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">7. Prohibited Conduct</h2>
            <p className="mb-2">You may not:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Use the Service for any illegal or fraudulent purpose.</li>
              <li>Attempt to access data belonging to other users.</li>
              <li>Reverse-engineer, scrape, or abuse the Service.</li>
              <li>Submit false or misleading information in switch forms.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">8. Intellectual Property</h2>
            <p>
              All content, branding, and software within the Service is owned by Quid or licensed to us. You may not copy, modify, or distribute any part of the Service without our written permission.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Quid is not liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount you have paid us in the preceding 12 months (or £100 if you use the free tier).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">10. Termination</h2>
            <p>
              We may suspend or terminate your account if you violate these Terms. You may delete your account at any time via Settings. Upon termination, your data will be deleted in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of England and Wales. Any disputes shall be resolved in the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">12. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes via email or in-app notice. Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">13. Contact</h2>
            <p>
              Questions about these Terms? Contact us at <a href="mailto:support@quid.co.uk" className="text-[#a78bfa] hover:underline">support@quid.co.uk</a>.
            </p>
          </section>

          <p className="text-xs text-white/40">Last updated: 20 June 2026</p>
        </div>
      </div>
    </div>
  )
}
