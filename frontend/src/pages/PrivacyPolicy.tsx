import { Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'

export default function PrivacyPolicy() {
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
            <Shield className="h-5 w-5 text-[#a78bfa]" />
          </div>
          <h1 className="text-2xl font-bold">Privacy Policy</h1>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-white/70">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">1. Introduction</h2>
            <p>
              Quid ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our subscription comparison and switching service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">2. Information We Collect</h2>
            <p className="mb-2">We may collect the following types of information:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li><strong>Personal Information:</strong> Name, email address, phone number, and address when you register or complete a switch form.</li>
              <li><strong>Financial Information:</strong> Bank connection data via Open Banking (read-only access to transaction history) to identify your subscriptions.</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our app, including pages visited and features used.</li>
              <li><strong>Device Information:</strong> IP address, browser type, and operating system for analytics and security.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">3. How We Use Your Information</h2>
            <p className="mb-2">We use your information to:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Analyse your bank transactions to identify recurring subscriptions and bills.</li>
              <li>Compare your current providers against available alternatives.</li>
              <li>Facilitate switches to better-value providers via affiliate links.</li>
              <li>Send renewal alerts and price hike notifications.</li>
              <li>Improve our service and personalise recommendations.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">4. Open Banking & Bank Data</h2>
            <p>
              We access your bank data through regulated Open Banking APIs. We use read-only access — we cannot move, spend, or modify your money. Your bank login credentials are never stored by us. You can revoke bank access at any time through your bank or by disconnecting in our app.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">5. Affiliate Links & Third Parties</h2>
            <p>
              When you click a provider switch link, we may redirect you through an affiliate tracking link (e.g. Awin). This allows us to earn a commission if you complete a switch. We do not sell your personal data to third parties. Affiliate networks may receive anonymised click data only.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">6. Data Security</h2>
            <p>
              We use bank-level encryption (TLS 1.3), secure databases, and regular security audits. Access to your data is restricted to authenticated systems only.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">7. Your Rights</h2>
            <p className="mb-2">Under UK GDPR, you have the right to:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction or deletion of your data.</li>
              <li>Withdraw consent for bank data access.</li>
              <li>Export your data in a portable format.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">8. Data Retention</h2>
            <p>
              Raw bank transactions are automatically deleted within 24 hours of classification. Classified subscription records and switch history are retained for as long as your account is active. You can delete your account and all associated data at any time from Settings.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">9. Contact Us</h2>
            <p>
              For privacy-related questions or to exercise your rights, contact us at <a href="mailto:privacy@quid.co.uk" className="text-[#a78bfa] hover:underline">privacy@quid.co.uk</a>.
            </p>
          </section>

          <p className="text-xs text-white/40">Last updated: 20 June 2026</p>
        </div>
      </div>
    </div>
  )
}
