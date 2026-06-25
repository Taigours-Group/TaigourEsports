import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const PARTNER_TYPES = [
  'Tournament Sponsor',
  'Strategic Business Partner',
  'Investor',
  'Media Partner',
  'Educational Partner',
  'Brand Collaboration',
  'Technology Partner'
];

const BUDGET_RANGES = [
  '$1,000 - $5,000',
  '$5,000 - $15,000',
  '$15,000 - $50,000',
  '$50,000 - $100,000',
  '$100,000+'
];

const sanitizeClientText = (value) => {
  // Client-side only; server must still validate.
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim();
};

const BecomePartnerPage = () => {
  const [csrfReady, setCsrfReady] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    company_name: '',
    position: '',
    email: '',
    phone_number: '',
    country: '',
    website: '',
    partner_type: PARTNER_TYPES[0],
    budget_range: BUDGET_RANGES[0],
    message: '',
    attachment: null
  });

  const [consent, setConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!csrfReady) return false;
    if (!consent || !termsAccepted) return false;
    if (!form.full_name.trim()) return false;
    if (!form.email.trim()) return false;
    if (!form.partner_type) return false;
    if (!form.message.trim()) return false;
    if (form.attachment && form.attachment.size > 5 * 1024 * 1024) return false;
    return true;
  }, [submitting, csrfReady, consent, termsAccepted, form]);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/csrf-token', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to get CSRF token');
        const data = await res.json();
        setCsrfToken(data?.csrfToken || '');
        setCsrfReady(true);
      } catch (e) {
        setCsrfReady(false);
      }
    };

    run();
  }, []);

  const update = (key) => (e) => {
    const value = e?.target?.value;
    setForm((prev) => ({ ...prev, [key]: sanitizeClientText(value) }));
    setError('');
    setSuccess('');
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setForm((prev) => ({ ...prev, attachment: null }));
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Attachment must be a PDF file.');
      setForm((prev) => ({ ...prev, attachment: null }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Attachment must be <= 5MB.');
      setForm((prev) => ({ ...prev, attachment: null }));
      return;
    }

    setForm((prev) => ({ ...prev, attachment: file }));
    setError('');
    setSuccess('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!canSubmit) {
      setError('Please complete all required fields and accept the consent/terms.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = new FormData();
      payload.append('full_name', form.full_name);
      payload.append('company_name', form.company_name);
      payload.append('position', form.position);
      payload.append('email', form.email);
      payload.append('phone', form.phone_number);
      payload.append('country', form.country);
      payload.append('website', form.website);
      payload.append('partner_type', form.partner_type);
      payload.append('budget_range', form.budget_range);
      payload.append('message', form.message);
      if (form.attachment) payload.append('attachment', form.attachment);

      const res = await fetch('/api/partner-applications', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
        credentials: 'include',
        body: payload
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Submission failed');

      setSuccess('Application submitted successfully. Our team will review it shortly.');
      setForm({
        full_name: '',
        company_name: '',
        position: '',
        email: '',
        phone_number: '',
        country: '',
        website: '',
        partner_type: PARTNER_TYPES[0],
        budget_range: BUDGET_RANGES[0],
        message: '',
        attachment: null
      });
      setConsent(false);
      setTermsAccepted(false);
    } catch (err) {
      setError(err?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-20 md:pt-24 pb-16 min-h-screen bg-bg-dark font-rajdhani">
      <div className="container mx-auto px-4">
        {/* Hero */}
        <section className="mb-12 md:mb-16">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-bg-card/60">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan/25 via-bg-dark to-bg-dark" />
            <div className="relative p-6 md:p-10">
              <div className="inline-flex items-center gap-3 px-4 py-2 glass rounded-full border border-white/10 mb-6">
                <i className="fa-solid fa-handshake text-cyan" />
                <span className="text-xs md:text-[10px] font-bold uppercase tracking-widest text-gray-300">Become a Partner</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-orbitron font-black text-white tracking-tight mb-4">Collaborate with Taigour E-Sports</h1>
              <p className="text-gray-400 font-inter text-sm md:text-base max-w-3xl leading-relaxed">
                We connect brands, investors, media partners, educational organizations, and technology collaborators with Nepal’s competitive mobile esports ecosystem.
              </p>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: 'Visibility', desc: 'Exposure across tournaments, streams, and community channels.' },
                  { title: 'Credibility', desc: 'Verified platform for measurable partner collaboration.' },
                  { title: 'Reach', desc: 'Nationwide audience including players, fans, and creators.' }
                ].map((x) => (
                  <div key={x.title} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
                        <i className="fa-solid fa-star text-cyan" />
                      </span>
                      <div>
                        <div className="text-white font-bold">{x.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{x.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mb-12 md:mb-16">
          <h2 className="text-xl md:text-2xl font-orbitron font-black text-white uppercase tracking-widest mb-6">Partnership Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PARTNER_TYPES.map((t) => (
              <div key={t} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan/30 transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-white font-bold text-sm">{t}</div>
                  <div className="text-cyan">
                    <i className="fa-solid fa-arrow-right" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Form */}
        <section className="mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-bg-card rounded-3xl border border-white/10 p-6 md:p-8">
              <h2 className="text-xl md:text-2xl font-orbitron font-black text-white uppercase tracking-widest mb-4">Application Form</h2>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">{error}</div>
              )}
              {success && (
                <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-200 text-sm">{success}</div>
              )}

              <form onSubmit={onSubmit} className="space-y-4 md:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Full Name *</label>
                    <input
                      value={form.full_name}
                      onChange={update('full_name')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan"
                      placeholder="e.g. John Smith"
                      required
                      maxLength={120}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Company Name</label>
                    <input
                      value={form.company_name}
                      onChange={update('company_name')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan"
                      placeholder="Company / Organization"
                      maxLength={160}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Position</label>
                    <input
                      value={form.position}
                      onChange={update('position')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan"
                      placeholder="Your role"
                      maxLength={120}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Email *</label>
                    <input
                      value={form.email}
                      onChange={update('email')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan"
                      placeholder="name@company.com"
                      required
                      type="email"
                      maxLength={180}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Phone Number</label>
                    <input
                      value={form.phone_number}
                      onChange={update('phone_number')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan"
                      placeholder="+977..."
                      maxLength={30}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Country</label>
                    <input
                      value={form.country}
                      onChange={update('country')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan"
                      placeholder="Nepal / India / ..."
                      maxLength={120}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Website</label>
                    <input
                      value={form.website}
                      onChange={update('website')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan"
                      placeholder="https://company.com"
                      maxLength={200}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Partnership Type *</label>
                    <select
                      value={form.partner_type}
                      onChange={update('partner_type')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan"
                      required
                    >
                      {PARTNER_TYPES.map((t) => (
                        <option key={t} value={t} className="bg-bg-dark">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Budget Range</label>
                    <select
                      value={form.budget_range}
                      onChange={update('budget_range')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan"
                    >
                      {BUDGET_RANGES.map((b) => (
                        <option key={b} value={b} className="bg-bg-dark">
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Message *</label>
                  <textarea
                    value={form.message}
                    onChange={update('message')}
                    rows={5}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan resize-y"
                    placeholder="Tell us about your proposal, expected collaboration timeline, and how you want to support Taigour E-Sports."
                    required
                    maxLength={2000}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Attachment Upload (PDF only)</label>
                    <div className="text-[11px] text-gray-500">Max 5MB</div>
                  </div>
                  <input type="file" accept="application/pdf" onChange={onFileChange} className="w-full" />
                </div>

                {/* GDPR-style consent + Terms */}
                <div className="space-y-3">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-xs text-gray-300 leading-relaxed">
                      I consent to Taigour E-Sports processing my application details for partnership review (GDPR-style consent).
                    </span>
                  </label>

                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1"
                      required
                    />
                    <span className="text-xs text-gray-300 leading-relaxed">
                      I accept the <a href="/terms" className="text-cyan underline">Terms</a> and understand the <a href="/privacy" className="text-cyan underline">Privacy Policy</a> and data retention policy.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full py-4 md:py-5 font-orbitron font-black text-xs md:text-sm uppercase tracking-[0.3em] transition-all border ${
                    canSubmit ? 'bg-primary text-dark border-primary shadow-[0_0_20px_rgba(0,212,255,0.2)] hover:brightness-110' : 'bg-white/5 text-gray-500 border-white/10 cursor-not-allowed'
                  }`}
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-2" /> Submitting...
                    </>
                  ) : (
                    <>Submit Application</>
                  )}
                </button>

                <div className="text-[11px] text-gray-500 leading-relaxed">
                  Security note: We validate inputs server-side, accept PDF attachments only (max 5MB), and store uploads outside the public directory.
                </div>

                <div className="text-[11px] text-gray-500 leading-relaxed">
                  Prefer admin review? View status later from our internal partner workflow.
                  <span className="block mt-1">
                    <Link to="/">Back to Home</Link>
                  </span>
                </div>
              </form>
            </div>

            {/* Right info column (optional) */}
            <div className="lg:col-span-5">
              <div className="bg-bg-card rounded-3xl border border-white/10 p-6 md:p-8">
                <h3 className="text-lg font-orbitron font-black text-white uppercase tracking-widest mb-4">What happens next?</h3>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex gap-3">
                    <span className="text-cyan font-bold">1</span>
                    <span>Submit your partnership application (PDF optional).</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-cyan font-bold">2</span>
                    <span>Our team reviews your proposal and contacts you if needed.</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-cyan font-bold">3</span>
                    <span>Once approved, we schedule collaboration terms and timelines.</span>
                  </div>
                </div>
                <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 text-[12px] text-gray-300 leading-relaxed">
                  <b className="text-white">Tip:</b> Include your organization website and a brief plan in the message.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BecomePartnerPage;

