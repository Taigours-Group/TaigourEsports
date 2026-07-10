import React from 'react';
import LegalLayout from './LegalLayout.jsx';

const sections = [
  { id: 'overview', title: 'Overview' },
  { id: 'information-we-collect', title: 'Information We Collect' },
  { id: 'how-we-use-your-information', title: 'How We Use Your Information' },
  { id: 'sharing-and-disclosure', title: 'Sharing and Disclosure' },
  { id: 'your-rights-and-controls', title: 'Your Rights and Controls' },
  { id: 'security-and-retention', title: 'Security and Retention' },
  { id: 'children-and-sensitive-data', title: 'Children and Sensitive Data' },
  { id: 'changes-to-this-policy', title: 'Changes to This Policy' }
];

const PrivacyPolicyPage = () => {
  return (
    <LegalLayout
      eyebrow="Privacy"
      title="Privacy Policy"
      lastUpdated="July 2026"
      readingTime="6"
      intro="This Privacy Policy explains how Taigour E-Sports collects, uses, and protects your personal information across our website, mobile app, tournaments, and community services."
      sections={sections}
    >
      <div className="space-y-10 text-gray-300">
        <section id="overview" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Overview</h2>
          <p className="leading-8 text-gray-300">
            Taigour E-Sports (“we”, “our”, or “us”) operates a digital platform for esports tournaments, player profiles,
            leaderboards, live streams, community engagement, and partner programs. We are committed to protecting your privacy
            and handling your data in a transparent, secure, and future-ready manner.
          </p>
          <p className="leading-8 text-gray-300 mt-4">
            By using our website, mobile application, or related services, you agree to the practices described in this Privacy Policy.
            We may update this notice periodically to reflect legal requirements, product changes, or enhanced security practices.
          </p>
        </section>

        <section id="information-we-collect" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Information We Collect</h2>
          <div className="space-y-4 leading-8 text-gray-300">
            <p>We collect information that you provide directly and data that is generated through your use of our services, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account details such as name, username, email address, phone number, and profile information.</li>
              <li>Tournament and registration information, including team names, player identities, and competition entries.</li>
              <li>Payment and transaction data necessary for purchases, prize payouts, or partner services.</li>
              <li>Device, application, and usage data such as IP address, browser type, app version, session duration, and interaction logs.</li>
              <li>Communications you send to us, including support requests, feedback, and moderation reports.</li>
            </ul>
          </div>
        </section>

        <section id="how-we-use-your-information" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">How We Use Your Information</h2>
          <div className="space-y-4 leading-8 text-gray-300">
            <p>We use your information to provide, secure, and improve our services, including to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Create and manage your account, verify your identity, and prevent fraud or misuse.</li>
              <li>Process tournament registrations, team submissions, leaderboards, and prize distributions.</li>
              <li>Deliver personalized experiences, notifications, and account-related updates.</li>
              <li>Analyze platform performance, troubleshoot technical issues, and improve reliability.</li>
              <li>Comply with applicable laws, respond to legal requests, and enforce our policies.</li>
            </ul>
          </div>
        </section>

        <section id="sharing-and-disclosure" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Sharing and Disclosure</h2>
          <p className="leading-8 text-gray-300">
            We do not sell your personal information. We may share limited information with trusted service providers that help us operate our platform,
            such as cloud hosting, analytics, payment processing, customer support, and moderation tools. These providers are contractually obligated to use
            your data only for the services they perform for us and to protect it appropriately.
          </p>
          <p className="leading-8 text-gray-300 mt-4">
            We may also disclose information if required by law, to protect the rights or safety of users, or during a merger, acquisition, or similar business transition.
          </p>
        </section>

        <section id="your-rights-and-controls" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Your Rights and Controls</h2>
          <p className="leading-8 text-gray-300">
            Depending on your jurisdiction, you may have the right to access, correct, delete, or restrict the use of your personal information.
            You may also opt out of marketing communications at any time by using the unsubscribe link in our emails or updating your notification settings in the app.
          </p>
          <p className="leading-8 text-gray-300 mt-4">
            To make a privacy request, contact us at <a href="mailto:taigouresports@gmail.com" className="text-cyan underline">taigouresports@gmail.com</a>.
            We may ask you to verify your identity before acting on your request.
          </p>
        </section>

        <section id="security-and-retention" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Security and Retention</h2>
          <p className="leading-8 text-gray-300">
            We use reasonable administrative, technical, and physical safeguards to protect your data from unauthorized access, disclosure, alteration, or destruction.
            However, no digital system is completely immune to risk, and you should also protect your own account credentials.
          </p>
          <p className="leading-8 text-gray-300 mt-4">
            We retain personal information only as long as necessary to fulfill the purposes outlined in this policy, comply with legal obligations, resolve disputes, and enforce agreements.
          </p>
        </section>

        <section id="children-and-sensitive-data" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Children and Sensitive Data</h2>
          <p className="leading-8 text-gray-300">
            Our services are intended for users who are at least the age required by applicable law to participate in online gaming and account registration.
            We do not knowingly collect personal information from children without appropriate parental or guardian consent.
          </p>
          <p className="leading-8 text-gray-300 mt-4">
            If you believe a child has provided us with personal information without authorization, please contact us immediately so we can remove it.
          </p>
        </section>

        <section id="changes-to-this-policy" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-space font-semibold text-white mb-4">Changes to This Policy</h2>
          <p className="leading-8 text-gray-300">
            We may revise this Privacy Policy from time to time to reflect changes in law, technology, or our services. When we make material updates,
            we will update the “Last updated” date and, where appropriate, notify you through the platform or via email.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
};

export default PrivacyPolicyPage;
