import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TournamentCard } from './TournamentsPage';
import BlurText from '../components/ReactBits/BlurText';
import ShinyText from '../components/ReactBits/ShinyText';
import SpotlightCard from '../components/ReactBits/SpotlightCard';
import FadeContent from '../components/ReactBits/FadeContent';
import BorderGlow from '../components/ReactBits/BorderGlow';

const parseDateAtStartOfDay = (dateValue) => {
  if (!dateValue) return null;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const parseDateAtEndOfDay = (dateValue) => {
  if (!dateValue) return null;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(23, 59, 59, 999);
  return parsed;
};
 
const getRegistrationStatus = (tournament) => {
  const now = new Date();
  const regStart = parseDateAtStartOfDay(tournament.registration_start_date);
  const regEnd = parseDateAtEndOfDay(tournament.registration_end_date);
  if (regStart && now < regStart) return 'upcoming';
  if (regEnd && now > regEnd) return 'ended';
  return 'open';
};

const HomePage = ({ tournaments, leaderboard, registrations }) => {
  const trendingEvents = [...(Array.isArray(tournaments) ? tournaments : [])]
    .sort((a, b) => {
      const statusOrder = { open: 0, upcoming: 1, ended: 2 };
      const aStatus = getRegistrationStatus(a);
      const bStatus = getRegistrationStatus(b);
      if (statusOrder[aStatus] !== statusOrder[bStatus]) {
        return statusOrder[aStatus] - statusOrder[bStatus];
      }
      return (a.title || '').localeCompare(b.title || '');
    })
    .slice(0, 4);

  return (
    <div className="flex flex-col bg-bg-dark font-inter selection:bg-cyan/30">
      
      {/* 1. Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/40 via-bg-dark/80 to-bg-dark z-10"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-navy/40 via-bg-dark to-bg-dark z-0"></div>
          {/* User Placeholder Silhouette */}
          <img
            src="https://res.cloudinary.com/dbjjzyrr3/image/upload/v1768562833/florian-olivo-Mf23RF8xArY-unsplash_mwnhvg.jpg"
            className="w-full h-full object-cover opacity-20 object-center mix-blend-luminosity animate-blur-in"
            alt="Hero Background"
          />
        </div>

        <div className="container mx-auto relative z-20 flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          
          <div className="flex-1 text-center lg:text-left max-w-3xl animate-fade-in">
            <div className="inline-flex items-center gap-3 px-4 py-2 glass rounded-full mb-8 border border-white/10">
               <span className="relative flex h-2.5 w-2.5">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan"></span>
               </span>
               <ShinyText text="Live: Season 2.5 Active" speed={3} className="font-space font-bold text-xs uppercase tracking-widest" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-space font-bold mb-6 leading-tight tracking-tight text-white flex flex-col items-center lg:items-start">
              <BlurText text="TAIGOUR" animateBy="words" delay={150} />
              <span className="text-cyan -mt-2">
                <BlurText text="ESPORTS" animateBy="words" delay={200} />
              </span>
            </h1>

            <p className="text-gray-400 font-inter text-lg sm:text-xl md:text-2xl mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
              From Local Legends to National Champions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/tournaments" className="premium-button px-8 py-4 bg-cyan text-charcoal font-space font-bold text-sm uppercase tracking-wider hover:bg-white text-center">
                Register Tournament
              </Link>
              <Link to="/become-partner" className="premium-button px-8 py-4 border border-white/20 text-white font-space font-bold text-sm uppercase tracking-wider hover:border-cyan hover:bg-cyan/5 text-center">
                Become Partner
              </Link>
            </div>
          </div>

          <div className="flex-1 hidden lg:block animate-slide-up">
            <BorderGlow
              edgeSensitivity={25}
              glowColor="187 80 70"
              backgroundColor="#111827"
              borderRadius={16}
              glowRadius={30}
              glowIntensity={1.2}
              coneSpread={20}
              animated={true}
              colors={['#22D3EE', '#06B6D4', '#0891B2']}
              className="w-full max-w-lg ml-auto transform rotate-1 hover:rotate-0 transition-transform duration-500"
            >
              <div className="p-6">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="font-space font-bold text-white tracking-wide">Upcoming Events</h3>
                 <i className="fa-solid fa-ellipsis text-gray-500"></i>
               </div>
               <div className="space-y-4">
                 {trendingEvents.length > 0 ? (
                   trendingEvents.slice(0, 3).map((tournament) => (
                     <div key={tournament.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                       <div className="w-12 h-12 bg-charcoal rounded-lg flex items-center justify-center border border-white/10">
                          <i className="fa-solid fa-gamepad text-cyan/70"></i>
                       </div>
                       <div className="flex-1">
                         <h4 className="text-white font-space font-semibold text-sm line-clamp-1">{tournament.title}</h4>
                         <p className="text-gray-500 text-xs font-inter capitalize">{getRegistrationStatus(tournament)} Registration</p>
                       </div>
                       <div className="text-right">
                         <div className="text-cyan font-space font-bold text-sm">{tournament.prize || 'TBA'}</div>
                         <div className="text-gray-600 text-[10px] uppercase tracking-wider">Prize</div>
                       </div>
                     </div>
                   ))
                 ) : (
                   <div className="text-center py-6 text-gray-400 text-sm">
                     No upcoming events at the moment
                   </div>
                 )}
               </div>
              </div>
            </BorderGlow>
          </div>

        </div>
      </section>

      {/* 2. Stats Section */}
      <section className="py-16 bg-navy/30 border-y border-white/5">
        <FadeContent blur={true} duration={1000} easing="ease-out" initialOpacity={0}>
        <div className="container mx-auto px-5">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { label: 'Completed Tournaments', val: '48+', icon: 'fa-trophy' },
              { label: 'Prize Distributed', val: 'Rs 50K+', icon: 'fa-coins' },
              { label: 'Registered Players', val: '1,500+', icon: 'fa-users' },
              { label: 'Active Events', val: '12', icon: 'fa-calendar-check' }
            ].map((stat, i) => (
              <SpotlightCard key={i} className="flex flex-col text-center p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan/30 transition-all group" spotlightColor="rgba(34, 211, 238, 0.15)">
                <div className="w-12 h-12 mx-auto bg-cyan/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <i className={`fa-solid ${stat.icon} text-cyan text-xl`}></i>
                </div>
                <div className="text-2xl md:text-4xl font-space font-bold text-white mb-2">{stat.val}</div>
                <div className="text-[8px] md:text-xs font-inter font-medium text-gray-500 uppercase tracking-widest">{stat.label}</div>
              </SpotlightCard>
            ))}
          </div>
        </div>
        </FadeContent>
      </section>

      {/* 3. Upcoming Tournaments */}
      <section className="py-24 px-6 relative overflow-hidden">
        <FadeContent blur={true} duration={1000} easing="ease-out" initialOpacity={0}>
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-space font-bold text-white tracking-tight mb-3">
                Featured Tournaments
              </h2>
              <p className="text-gray-400 font-inter text-sm md:text-base max-w-xl leading-relaxed">
                Compete against the best. Register for our premium events and build your legacy.
              </p>
            </div>
            <Link to="/tournaments" className="inline-flex items-center gap-2 text-cyan font-space font-bold text-sm uppercase tracking-wider hover:text-white transition-colors group pb-1 border-b border-cyan/30 hover:border-white">
              View Schedule <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 no-scrollbar snap-x snap-mandatory">
            {trendingEvents.map(t => (
              <div key={t.id} className="min-w-[180px] max-w-[200px] md:max-w-[300px] md:min-w-[280px] flex-shrink-0 snap-start">
                
                  <TournamentCard
                    t={t}
                    registrations={registrations}
                    registrationStatus={getRegistrationStatus(t)}
                  />
                
              </div>
            ))}
          </div>
        </div>
        </FadeContent>
      </section>

      {/* 4. Why Taigour Section */}
      <section className="py-24 bg-navy/20 border-y border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-full bg-cyan/5 blur-[120px] rounded-full pointer-events-none"></div>
        <FadeContent blur={true} duration={1000} easing="ease-out" initialOpacity={0}>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-space font-bold text-white tracking-tight mb-4">
              Why Choose Taigour
            </h2>
            <p className="text-gray-400 font-inter text-sm md:text-base max-w-2xl mx-auto">
              We provide the most professional and reliable esports ecosystem in Nepal.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
             {[
               { title: 'Fair Competition', desc: 'Strict anti-cheat protocols and verified slot systems ensure a level playing field.', icon: 'fa-scale-balanced' },
               { title: 'Fast Payouts', desc: 'Automated prize distribution system guarantees timely rewards for winners.', icon: 'fa-bolt' },
               { title: 'Nationwide Reach', desc: 'Connect with elite teams and players from all across the country.', icon: 'fa-earth-asia' },
               { title: 'Pro Management', desc: 'Experienced admins and broadcasters deliver a seamless tournament experience.', icon: 'fa-user-tie' }
             ].map((feature, idx) => (
               <SpotlightCard key={idx} className="p-2 md:p-8 rounded-2xl bg-bg-card border border-white/10 hover:border-cyan/50 hover:bg-white/[0.02] transition-all group" spotlightColor="rgba(34, 211, 238, 0.1)">
                 <div className="w-10 md:w-14 h-10 md:h-14 bg-charcoal border border-white/10 rounded-xl flex items-center justify-center mb-3 md:mb-6 group-hover:border-cyan/50 group-hover:bg-cyan/10 transition-colors relative z-10">
                   <i className={`fa-solid ${feature.icon} text-cyan text-xm md:text-xl`}></i>
                 </div>
                 <h3 className="text-xm md:text-xl font-space font-bold text-white mb-3 relative z-10">{feature.title}</h3>
                 <p className="text-gray-400 font-inter text-xs md:text-sm leading-relaxed relative z-10">{feature.desc}</p>
               </SpotlightCard>
             ))}
          </div>
        </div>
        </FadeContent>
      </section>

      {/* 5. Sponsors Section */}
      <section className="py-20 px-6">
        <FadeContent blur={true} duration={1000} easing="ease-out" initialOpacity={0}>
        <div className="container mx-auto text-center">
          <h3 className="text-sm font-space font-bold text-gray-500 uppercase tracking-[0.2em] mb-12">
            Trusted by partners across Nepal
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Placeholders for logos */}
             <div className="text-xl font-space font-bold text-white flex items-center gap-2"><i className="fa-brands fa-aws text-3xl"></i> BRAND A</div>
             <div className="text-xl font-space font-bold text-white flex items-center gap-2"><i className="fa-brands fa-discord text-3xl"></i> BRAND B</div>
             <div className="text-xl font-space font-bold text-white flex items-center gap-2"><i className="fa-brands fa-twitch text-3xl"></i> BRAND C</div>
             <div className="text-xl font-space font-bold text-white flex items-center gap-2"><i className="fa-solid fa-gamepad text-3xl"></i> BRAND D</div>
          </div>
        </div>
        </FadeContent>
      </section>

      {/* 6. Community CTA Section */}
      <section className="py-24 px-6">
         <FadeContent blur={true} duration={1000} easing="ease-out" initialOpacity={0}>
         <div className="container mx-auto max-w-5xl">
           <BorderGlow
              edgeSensitivity={20}
              glowColor="187 80 70"
              backgroundColor="#22D3EE"
              borderRadius={32}
              glowRadius={50}
              glowIntensity={1.5}
              coneSpread={30}
              colors={['#22D3EE', '#06B6D4', '#0891B2']}
           >
             <div className="relative p-10 md:p-16 overflow-hidden text-center">
              <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/dbjjzyrr3/image/upload/v1768563939/carbon-fibre_q7myx8.png')] opacity-10 mix-blend-overlay"></div>
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-space font-bold text-charcoal tracking-tight mb-4">
                  Join the Community
                </h2>
                <p className="text-charcoal/80 font-inter text-lg md:text-xl max-w-2xl mx-auto mb-10 font-medium">
                  Get instant match alerts, daily scrims, and network with other players.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <a href="https://discord.gg/f2bgpfNP" className="premium-button px-8 py-4 bg-charcoal text-white font-space font-bold text-sm uppercase tracking-wider hover:bg-navy flex items-center justify-center gap-3" target="_blank" rel="noopener noreferrer">
                    <i className="fa-brands fa-discord text-lg"></i> Discord
                  </a>
                  <a href="https://wa.me/9766115626" className="premium-button px-8 py-4 bg-green-600 text-white font-space font-bold text-sm uppercase tracking-wider hover:bg-green-700 flex items-center justify-center gap-3" target="_blank" rel="noopener noreferrer">
                    <i className="fa-brands fa-whatsapp text-lg"></i> WhatsApp
                  </a>
                  <a href="https://www.youtube.com/@TaigoursE-Sports" className="premium-button px-8 py-4 bg-red-600 text-white font-space font-bold text-sm uppercase tracking-wider hover:bg-red-700 flex items-center justify-center gap-3" target="_blank" rel="noopener noreferrer">
                    <i className="fa-brands fa-youtube text-lg"></i> YouTube
                  </a>
                </div>
              </div>
             </div>
           </BorderGlow>
         </div>
         </FadeContent>
      </section>
      
    </div>
  );
};

export default HomePage;
