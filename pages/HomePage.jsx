
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TournamentCard } from './TournamentsPage';

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
  const [copiedId, setCopiedId] = useState(null);
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
    .slice(0, 4); // Open first, then upcoming, then ended

  return (
    <div className="flex flex-col bg-bg-dark">
      {/* Cinematic Hero */}
      <section className="relative min-h-screen md:min-h-[90vh] mb-8 md:mb-10 flex items-center justify-center px-4 overflow-hidden pt-16 md:pt-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/40 via-bg-dark/80 to-bg-dark z-10"></div>
          <img
            src="https://res.cloudinary.com/dbjjzyrr3/image/upload/v1768562833/florian-olivo-Mf23RF8xArY-unsplash_mwnhvg.jpg"
            className="w-full h-full object-cover scale-110 blur-[2px]"
            alt="Hero Background"
          />
        </div>

        <div className="relative z-20 text-center max-w-4xl mx-auto w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 glass rounded-full mb-4 md:mb-8 border border-primary/20 animate-fade-in">
             <span className="w-2 h-2 bg-primary rounded-full animate-ping"></span>
             <span className="font-orbitron font-black text-[8px] md:text-xs text-primary uppercase tracking-[0.3em]">Season 2.5 Active</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-orbitron font-black mb-4 md:mb-6 leading-none tracking-tighter">
            <span className="text-white">TAIGOUR</span><br/>
            <span className="text-primary animate-glitch inline-block drop-shadow-[0_0_20px_rgba(0,212,255,0.4)]">ESPORTS</span>
          </h1>

          <p className="text-gray-400 font-rajdhani text-sm sm:text-base md:text-lg lg:text-2xl mb-6 md:mb-12 uppercase tracking-[0.1em] md:tracking-[0.2em] max-w-2xl mx-auto leading-tight">
            Forge Your Legacy, Rule the Game. Join the ultimate competitive arena and compete for glory.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link to="/tournaments" className="px-6 sm:px-10 md:px-12 py-2.5 sm:py-3 md:py-4 bg-primary text-dark font-orbitron font-black text-xs sm:text-sm uppercase tracking-widest cyber-button shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:shadow-[0_0_40px_rgba(0,212,255,0.5)] transition-all">
              JOIN NOW <i className="fa-solid fa-bolt-lightning ml-2 hidden sm:inline"></i>
            </Link>
            <Link to="/leaderboard" className="px-6 sm:px-10 md:px-12 py-2.5 sm:py-3 md:py-4 border border-white/10 hover:border-primary text-white font-orbitron font-black text-xs sm:text-sm uppercase tracking-widest transition-all hover:bg-white/5">
              RANKINGS <i className="fa-solid fa-crown ml-2 hidden sm:inline"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* Grid Stats */}
      <section className="py-12 md:py-16 bg-bg-card/5 border-y border-white/5">
        <div className="container mx-auto px-3 md:px-6 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {[
            { label: 'Total Warriors', val: '1,500+', icon: 'fa-users', color: 'text-primary' },
            { label: 'Tournaments', val: '48+', icon: 'fa-crosshairs', color: 'text-pink' },
            { label: 'Prize Awarded', val: ' 50K+', icon: 'fa-trophy', color: 'text-accent' },
            { label: 'Lobbies Live', val: '12', icon: 'fa-broadcast-tower', color: 'text-tertiary' }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col text-center border rounded border-primary/10 group p-2 md:p-4">
              <i className={`fa-solid ${stat.icon} ${stat.color} text-lg md:text-2xl mb-2 md:mb-3 block group-hover:scale-125 transition-transform`}></i>
              <div className="text-xl md:text-3xl lg:text-4xl font-orbitron font-black text-white">{stat.val}</div>
              <div className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

            {/* Trending Section */}
      <section className="py-12 md:py-24 px-3 md:px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-start mb-8 md:mb-12 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-orbitron font-black text-white uppercase tracking-tighter">
                ACTIVE <span className="text-primary">ARENAS</span>
              </h2>
              <p className="text-gray-500 font-rajdhani font-bold uppercase tracking-[0.2em] md:tracking-[0.4em] mt-1 md:mt-2 text-xs md:text-sm">Open for deployment</p>
            </div>
            <Link to="/tournaments" className="text-primary font-orbitron font-black text-[9px] md:text-xs uppercase tracking-widest group border-b border-primary/20 pb-1 hover:border-primary transition-all">
              VIEW ALL <i className="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
            {trendingEvents.map(t => (
              <TournamentCard
                key={t.id}
                t={t}
                registrations={registrations}
                registrationStatus={getRegistrationStatus(t)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Community Call */}
      <section className="py-12 md:py-24 bg-primary text-dark relative overflow-hidden mx-3 md:mx-6 rounded-2xl md:rounded-3xl mb-12 md:mb-24">
         <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/dbjjzyrr3/image/upload/v1768563939/carbon-fibre_q7myx8.png')] opacity-20"></div>
         <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <h2 className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-orbitron font-black mb-4 md:mb-6 uppercase tracking-tighter">
            JOIN THE <span className="border-b-4 border-dark">SQUAD</span>
          </h2>
          <p className="max-w-2xl mx-auto font-rajdhani font-bold text-sm sm:text-base md:text-xl lg:text-2xl mb-6 md:mb-12 uppercase tracking-wider opacity-80">
            Get instant match alerts, daily scrims, and exclusive giveaways.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 md:gap-4">
            <a href="https://discord.gg/f2bgpfNP" className="flex items-center justify-center gap-2 md:gap-3 px-4 md:px-8 py-2.5 md:py-4 bg-dark text-white font-orbitron font-black text-xs md:text-sm hover:scale-105 transition-all shadow-xl" target="_blank" rel="noopener noreferrer">
              <i className="fa-brands fa-discord text-base md:text-2xl"></i> <span className="hidden sm:inline">DISCORD</span>
            </a>
            <a href="https://wa.me/9766115626" className="flex items-center justify-center gap-2 md:gap-3 px-4 md:px-8 py-2.5 md:py-4 bg-green-600 text-white font-orbitron font-black text-xs md:text-sm hover:scale-105 transition-all shadow-xl" target="_blank" rel="noopener noreferrer">
              <i className="fa-brands fa-whatsapp text-base md:text-2xl"></i> <span className="hidden sm:inline">WHATSAPP</span>
            </a>
            <a href="https://www.youtube.com/@TaigoursE-Sports" className="flex items-center justify-center gap-2 md:gap-3 px-4 md:px-8 py-2.5 md:py-4 bg-red-600 text-white font-orbitron font-black text-xs md:text-sm hover:scale-105 transition-all shadow-xl" target="_blank" rel="noopener noreferrer">
              <i className="fa-brands fa-youtube text-base md:text-2xl"></i> <span className="hidden sm:inline">YOUTUBE</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
