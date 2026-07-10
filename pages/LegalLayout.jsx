import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LegalScene3D from '../components/LegalScene3D.jsx';
import ShinyText from '../components/ReactBits/ShinyText.jsx';
import BlurText from '../components/ReactBits/BlurText.jsx';

const LegalLayout = ({ eyebrow, title, lastUpdated, readingTime, intro, sections = [], children }) => {
  const safeSections = Array.isArray(sections) ? sections : [];
  const [activeId, setActiveId] = useState(safeSections[0]?.id ?? null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    const headings = safeSections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));

    const onScroll = () => setShowBackToTop(window.scrollY > 800);
    window.addEventListener('scroll', onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToSection = (id) => {
    setTocOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-bg-dark min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 pointer-events-none opacity-70">
          <LegalScene3D className="w-full h-full" />
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, transparent 0%, #0B0F14 75%)' }}
        />
        <div className="relative container mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-14 md:pb-20 max-w-4xl">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
            <ShinyText text={eyebrow} speed={3} className="text-xs font-inter-semibold uppercase tracking-[3px]" />
          </div>

          <BlurText
            text={title}
            animateBy="words"
            delay={90}
            className="font-space text-4xl md:text-6xl font-bold text-white tracking-tight mb-5"
          />

          {intro && <p className="text-gray-400 font-inter text-base md:text-lg leading-relaxed max-w-2xl mb-6">{intro}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
              <i className="fas fa-clock text-cyan text-xs" />
              <span className="text-gray-300 text-xs font-inter-medium">{readingTime} min read</span>
            </div>
            <div className="flex items-center gap-2 bg-cyan/10 border border-cyan/20 rounded-full px-4 py-1.5">
              <i className="fas fa-circle-check text-cyan text-xs" />
              <span className="text-cyan text-xs font-inter-semibold">Last updated {lastUpdated}</span>
            </div>
          </div>

          {safeSections.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {safeSections.slice(0, 3).map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="rounded-full border border-cyan/20 bg-cyan/10 px-4 py-2 text-sm text-cyan transition hover:bg-cyan/20"
                >
                  {String(index + 1).padStart(2, '0')} • {section.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile TOC toggle */}
      <div className="lg:hidden sticky top-0 z-20 bg-bg-dark/95 backdrop-blur border-b border-white/5">
        <button
          onClick={() => setTocOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        >
          <span className="font-space text-sm font-semibold text-white">
            {safeSections.find((s) => s.id === activeId)?.title || 'Contents'}
          </span>
          <i className={`fas fa-chevron-down text-cyan text-xs transition-transform ${tocOpen ? 'rotate-180' : ''}`} />
        </button>
        {tocOpen && (
          <div className="px-4 pb-3 flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
            {safeSections.map((s, i) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={`text-left text-sm py-2 px-3 rounded-lg ${
                  activeId === s.id ? 'bg-cyan/10 text-cyan font-inter-semibold' : 'text-gray-400'
                }`}
              >
                {String(i + 1).padStart(2, '0')}. {s.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 xl:gap-16">
          {/* Desktop TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-gray-600 text-[10px] font-space font-bold uppercase tracking-widest mb-4 px-3">
                On this page
              </p>
              <nav className="flex flex-col gap-1 border-l border-white/10">
                {safeSections.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    className={`text-left text-sm py-2 pl-4 pr-3 -ml-px border-l-2 transition-colors ${
                      activeId === s.id
                        ? 'border-cyan text-cyan font-inter-semibold'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-gray-600 mr-2 font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </button>
                ))}
              </nav>

              <div className="mt-8 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <p className="text-gray-400 text-xs leading-relaxed mb-3">Questions about this document?</p>
                <a
                  href="mailto:taigouresports@gmail.com"
                  className="text-cyan text-xs font-inter-semibold flex items-center gap-2"
                >
                  <i className="fas fa-envelope" /> taigouresports@gmail.com
                </a>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0">{children}</div>
        </div>
      </div>

      {/* Cross-link */}
      <div className="border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6 py-8 max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">Looking for the other document?</p>
          <div className="flex gap-3">
            <Link to="/privacy-policy" className="text-cyan text-sm font-inter-semibold hover:underline">Privacy Policy</Link>
            <span className="text-gray-700">•</span>
            <Link to="/terms-of-service" className="text-cyan text-sm font-inter-semibold hover:underline">Terms of Service</Link>
          </div>
        </div>
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-cyan text-charcoal flex items-center justify-center shadow-lg shadow-cyan/20 hover:scale-105 transition-transform"
          aria-label="Back to top"
        >
          <i className="fas fa-arrow-up" />
        </button>
      )}
    </div>
  );
};

export default LegalLayout;
