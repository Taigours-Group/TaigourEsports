import React from 'react';
import LegalLayout from './LegalLayout.jsx';

const sections = [
  { id: 'acceptance', title: 'Acceptance of Terms' },
  { id: 'eligibility', title: 'Eligibility and Accounts' },
  { id: 'conduct', title: 'User Conduct' },
  { id: 'tournaments-and-prizes', title: 'Tournaments and Prizes' },
  { id: 'intellectual-property', title: 'Intellectual Property' },
  { id: 'liability', title: 'Liability and Disclaimers' },
  { id: 'termination', title: 'Termination' },
  { id: 'governing-law', title: 'Governing Law' }
];

const TermsOfServicePage = () => {
  return (
    <LegalLayout
      eyebrow="Terms"
      title="Terms of Service"
      lastUpdated="July 2026"
      readingTime="6"
      intro="These Terms of Service govern your access to and use of Taigour E-Sports services, including our website, app, tournaments, and community features."
      sections={sections}
    >
      <div className="space-y-10 text-gray-300">
        <section id="acceptance" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Acceptance of Terms</h2>
          <p className="leading-8 text-gray-300">
            By accessing or using Taigour E-Sports, you accept and agree to be bound by these Terms of Service and any additional rules, policies, or guidelines posted by us.
            If you do not agree, you must not use our platform.
          </p>
        </section>

        <section id="eligibility" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Eligibility and Accounts</h2>
          <div className="space-y-4 leading-8 text-gray-300">
            <p>You must provide accurate information when creating an account and keep that information current.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>You may not create multiple accounts to manipulate rankings, tournaments, or rewards.</li>
            </ul>
          </div>
        </section>

        <section id="conduct" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">User Conduct</h2>
          <p className="leading-8 text-gray-300">
            You agree not to misuse the platform, engage in cheating, harassment, spam, impersonation, or any behavior that disrupts tournaments or the experience of other users.
            We reserve the right to suspend or terminate accounts that violate these standards.
          </p>
        </section>

        <section id="tournaments-and-prizes" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Tournaments and Prizes</h2>
          <p className="leading-8 text-gray-300">
            Participation in tournaments is governed by the event rules published for each competition. Taigour E-Sports may change schedules, formats, eligibility,
            or prize structures at its discretion, especially for technical, legal, or safety reasons. Prizes are subject to verification and compliance with applicable law.
          </p>
          <p className="leading-8 text-gray-300 mt-4">
            If a participant is disqualified for cheating, misconduct, or rule violations, we may revoke eligibility and withhold prizes.
          </p>
        </section>

        <section id="intellectual-property" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Intellectual Property</h2>
          <p className="leading-8 text-gray-300">
            All content, branding, design, software, visuals, and tournament materials on Taigour E-Sports are owned by us or licensed to us.
            You may not copy, redistribute, or create derivative works without prior written permission, except as permitted by applicable law.
          </p>
        </section>

        <section id="liability" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Liability and Disclaimers</h2>
          <p className="leading-8 text-gray-300">
            Our services are provided “as is” and “as available.” We do not guarantee uninterrupted access, error-free operation, or specific outcomes from tournaments or promotions.
            To the maximum extent permitted by law, Taigour E-Sports shall not be liable for indirect, incidental, or consequential damages arising from your use of the platform.
          </p>
        </section>

        <section id="termination" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Termination</h2>
          <p className="leading-8 text-gray-300">
            We may suspend or terminate your access to the platform if you breach these Terms, engage in harmful behavior, or create risk for other users, our partners, or our platform.
          </p>
        </section>

        <section id="governing-law" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Governing Law</h2>
          <p className="leading-8 text-gray-300">
            These Terms are governed by the laws of Nepal, without regard to conflict of law principles. Any dispute arising from these Terms shall be resolved in the competent courts of Nepal.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
};

export default TermsOfServicePage;
