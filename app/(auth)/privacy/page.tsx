import Link from "next/link";
import { TrendingUp, Shield, Lock, Eye, Trash2, Mail } from "lucide-react";

export default function PrivacyPage() {
  const lastUpdated = "March 21, 2026";

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/login" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">FinTrack</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mt-2">Last updated: {lastUpdated}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8 text-sm text-gray-700 leading-relaxed">

          <section className="flex gap-4">
            <Shield className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Our commitment to you</h2>
              <p>
                FinTrack is a personal finance tracker built for individuals and families. We are committed to protecting your privacy.
                This policy explains clearly what data we collect, how we use it, and your rights over it.
                We do not sell your data, serve you ads, or share your information with third parties for marketing.
              </p>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section className="flex gap-4">
            <Eye className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">What data we collect</h2>
              <ul className="space-y-2 list-none">
                {[
                  ["Account information", "Your name and email address, provided during registration or via Google sign-in."],
                  ["Profile picture", "If you sign in with Google, we store your Google profile photo URL."],
                  ["Financial data you enter", "Transactions, recurring payments, budgets, goals, and categories that you create. This data belongs to you."],
                  ["Session data", "An encrypted session token stored in your browser to keep you logged in. It does not contain your financial data."],
                  ["Technical logs", "Basic server logs for error monitoring. These do not contain your financial data."],
                ].map(([title, desc]) => (
                  <li key={title as string} className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-2" />
                    <span><strong className="text-gray-900">{title}:</strong> {desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section className="flex gap-4">
            <Lock className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">How we protect your data</h2>
              <ul className="space-y-2 list-none">
                {[
                  "All data is transmitted over HTTPS — encrypted in transit.",
                  "Passwords are hashed using bcrypt (cost factor 12) — we never store your plain-text password.",
                  "Your financial data is stored in a PostgreSQL database hosted by Neon on AWS infrastructure in Southeast Asia.",
                  "Each user's data is isolated — no user can access another user's financial information.",
                  "Google sign-in users authenticate through Google's secure OAuth system — we never receive or store your Google password.",
                ].map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-2" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section className="flex gap-4">
            <div className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5 font-bold text-center">👥</div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Who can see your data</h2>
              <p>
                <strong className="text-gray-900">Only you.</strong> Your transactions, budgets, goals, and categories are
                private to your account. No other user, administrator, or third party has access to your financial data
                through the application. The only exception is in cases of a legal requirement — for example, a valid
                court order — in which case we would notify you to the extent permitted by law.
              </p>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section className="flex gap-4">
            <div className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5 font-bold text-center">🌐</div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Third-party services</h2>
              <p className="mb-2">We use the following trusted services to operate FinTrack:</p>
              <ul className="space-y-1 list-none">
                {[
                  ["Neon (neon.tech)", "Database hosting"],
                  ["Vercel (vercel.com)", "Application hosting and deployment"],
                  ["Google OAuth", "Optional sign-in method — governed by Google's privacy policy"],
                ].map(([name, role]) => (
                  <li key={name as string} className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-2" />
                    <span><strong className="text-gray-900">{name}</strong> — {role}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2">We do not use advertising networks, analytics trackers, or any other third-party data processors.</p>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section className="flex gap-4">
            <Trash2 className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Your rights</h2>
              <ul className="space-y-2 list-none">
                {[
                  ["Access", "You can view all your data at any time within the application."],
                  ["Correction", "You can edit your name, currency, and any financial data you've entered."],
                  ["Deletion", "You can permanently delete your account and all associated data from Settings → Profile → Delete Account. Deletion is immediate and irreversible."],
                  ["Data portability", "You can export your transaction history as a CSV from the Reports page at any time."],
                ].map(([right, desc]) => (
                  <li key={right as string} className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-2" />
                    <span><strong className="text-gray-900">{right}:</strong> {desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section className="flex gap-4">
            <Mail className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Contact</h2>
              <p>
                If you have questions about this privacy policy or how your data is handled,
                you may contact the developer through the GitHub repository at{" "}
                <a href="https://github.com/juswa2415/fintrack"
                  className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  github.com/juswa2415/fintrack
                </a>.
              </p>
            </div>
          </section>

          <div className="pt-2 text-xs text-gray-400 text-center border-t border-gray-100">
            This privacy policy applies to FinTrack hosted at fintrack-sage-omega.vercel.app.
            By using FinTrack, you agree to the terms described here.
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm text-indigo-600 hover:underline">← Back to login</Link>
        </div>
      </div>
    </div>
  );
}
