import React from 'react';
import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout.jsx';

const sections = [
  { id: 'overview', title: 'Overview' },
  { id: 'documents', title: 'Documents' },
  { id: 'contact', title: 'Contact' }
];

const LegalLandingPage = () => {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Legal Center"
      lastUpdated="July 2026"
      readingTime="3"
      intro="Everything you need to understand our platform rules, privacy practices, and service terms is gathered here in one polished legal hub."
      sections={sections}
    >
      <div className="space-y-8 text-gray-300">
        <section id="overview" className="rounded-3xl border border-cyan/20 bg-gradient-to-br from-cyan/10 via-white/[0.03] to-transparent p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan" />
            <p className="text-xs uppercase tracking-[3px] text-cyan font-inter-semibold">Trusted by players and partners</p>
          </div>
          <h2 className="text-2xl font-space font-semibold text-white mb-4">A cleaner way to review your rights and responsibilities</h2>
          <p className="leading-8 text-gray-300">
            From how we handle your data to the rules that govern tournaments, prizes, and account use, our legal documents are designed to be clear, modern, and easy to explore.
          </p>
        </section>

        <section id="documents" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-6">Quick access</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Link to="/privacy-policy" className="group rounded-2xl border border-white/10 bg-bg-dark/70 p-5 transition hover:border-cyan/40 hover:bg-cyan/10">
              <p className="text-xs uppercase tracking-[3px] text-cyan font-inter-semibold mb-2">Privacy</p>
              <h3 className="text-lg font-space font-semibold text-white mb-2">Privacy Policy</h3>
              <p className="text-sm leading-7 text-gray-400">
                Learn how we collect, store, and protect your information across the website, app, and tournament services.
              </p>
            </Link>

            <Link to="/terms-of-service" className="group rounded-2xl border border-white/10 bg-bg-dark/70 p-5 transition hover:border-cyan/40 hover:bg-cyan/10">
              <p className="text-xs uppercase tracking-[3px] text-cyan font-inter-semibold mb-2">Terms</p>
              <h3 className="text-lg font-space font-semibold text-white mb-2">Terms of Service</h3>
              <p className="text-sm leading-7 text-gray-400">
                Review the rules for accounts, tournament participation, conduct, prizes, and platform use.
              </p>
            </Link>
          </div>
        </section>

        <section id="contact" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Need help or have a question?</h2>
          <p className="leading-8 text-gray-300">
            If you need clarification about our policies, account data, or tournament rules, reach out to our team and we’ll help you quickly.
          </p>
          <a href="mailto:taigouresports@gmail.com" className="mt-5 inline-flex items-center gap-2 text-cyan font-inter-semibold hover:underline">
            <i className="fas fa-envelope" /> taigouresports@gmail.com
          </a>
        </section>
      </div>
    </LegalLayout>
  );
};

export default LegalLandingPage;
