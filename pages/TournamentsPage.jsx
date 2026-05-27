
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Tournament, GameType, Registration } from '../types.js';

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

const formatDateLabel = (dateValue) => {
  if (!dateValue) return 'TBA';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getRegistrationStatus = (tournament) => {
  const now = new Date();
  const regStart = parseDateAtStartOfDay(tournament.registration_start_date);
  const regEnd = parseDateAtEndOfDay(tournament.registration_end_date);

  if (regStart && now < regStart) return 'upcoming';
  if (regEnd && now > regEnd) return 'ended';
  return 'open';
};

export const CountdownTimer = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const distance = new Date(targetDate).getTime() - new Date().getTime();
      if (distance < 0) {
        setTimeLeft(null);
      } else {
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) {
    return (
            <div className="flex items-center gap-1 bg-pink/20 border border-pink/50 rounded-md px-1.5 py-0.5 md:px-3 md:py-1.5 text-pink font-orbitron font-black text-[6px] md:text-[9px] uppercase tracking-wider shadow-[0_0_10px_rgba(255,0,128,0.3)] animate-pulse">
        <span className="relative flex h-1 w-1 md:h-2 md:w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1 w-1 md:h-2 md:w-2 bg-pink"></span>
        </span> 
        LIVE
      </div>
    );
  }

  return (
    <div className="flex gap-0.5 md:gap-1.5 items-center bg-black/70 backdrop-blur-md px-1.5 py-0.5 md:px-3 md:py-1.5 rounded-lg border border-white/10 shadow-lg">
      <div className="text-primary font-orbitron font-black text-[7px] md:text-[10px] leading-none">{timeLeft.d}d</div>
      <div className="text-white/20 text-[6px] font-bold">:</div>
      <div className="text-white font-orbitron font-black text-[7px] md:text-[10px] leading-none">{String(timeLeft.h).padStart(2, '0')}h</div>
      <div className="text-white/20 text-[6px] font-bold">:</div>
      <div className="text-white font-orbitron font-black text-[7px] md:text-[10px] leading-none">{String(timeLeft.m).padStart(2, '0')}m</div>
    </div>
  );
};

export const FeeTooltip = () => (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-40 md:w-52 p-3 md:p-4 bg-bg-card/20 border border-primary/30 rounded-2xl text-[8px] md:text-[10px] text-gray-100 font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-[0_15px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl scale-95 group-hover:scale-100 origin-bottom">
    <div className="text-primary mb-2 md:mb-3 flex items-center gap-2 font-orbitron">
      <i className="fas fa-shield-halved text-xs"></i>
      PROTOCOL
    </div>
    <ul className="space-y-1.5 md:space-y-2.5">
      <li className="flex items-center gap-2">
        <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-primary rounded-full shadow-[0_0_5px_#00d4ff]"></span>
        Slot Verification
      </li>
      <li className="flex items-center gap-2">
        <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-tertiary rounded-full"></span>
        Anti-Cheat Active
      </li>
      <li className="flex items-center gap-2">
        <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-accent rounded-full"></span>
        Instant Payout
      </li>
    </ul>
    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[10px] border-transparent border-t-primary/30"></div>
  </div>
);

export const TournamentCard = ({ t, registrations, registrationStatus }) => {
  const currentRegs = (Array.isArray(registrations) ? registrations : []).filter(r => r.tournamentid === t.id).length;
  const max_slots = t.max_slots || 48;
  const slotsLeft = Math.max(0, max_slots - currentRegs);
  const progressPercent = (currentRegs / max_slots) * 100;
  const isRegistrationOpen = registrationStatus === 'open';
  const isRegistrationUpcoming = registrationStatus === 'upcoming';
  const isRegistrationEnded = registrationStatus === 'ended';
  
  const islive = new Date(`${t.date} ${t.time}`).getTime() <= new Date().getTime();

  return (
    <div className="relative group flex flex-col h-full animate-fade-in">
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${islive ? 'from-pink/30 to-primary/30' : 'from-primary/15 to-pink/15'} rounded-2xl md:rounded-3xl blur opacity-0 group-hover:opacity-40 transition-opacity duration-500`}></div>
      <div className="relative flex flex-col h-full bg-bg-card border border-white/5 group-hover:border-primary/20 rounded-xl md:rounded-3xl overflow-hidden transition-all duration-500 shadow-xl flex-grow">
        
        {islive && (
          <div className="absolute top-0 left-0 w-full h-0.5 md:h-1 bg-pink shadow-[0_0_10px_#ff0080] z-30 animate-pulse"></div>
        )}

        {isRegistrationEnded && (
          <div className="absolute top-8 -left-12 w-56 z-30 rotate-[-35deg] bg-pink/90 text-white text-center font-orbitron font-black text-[8px] md:text-[10px] uppercase tracking-[0.2em] py-1.5 shadow-[0_0_20px_rgba(255,0,128,0.35)]">
            Event Ended
          </div>
        )}
        
        <div className="relative aspect-[16/10] overflow-hidden">
          <img 
            src={t.image} 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 brightness-75 group-hover:brightness-90" 
            alt={t.title} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card/90 via-transparent to-transparent"></div>
          
          <div className="absolute top-1.5 left-1.5 md:top-4 md:left-4 z-20">
            <span className="bg-primary/20 backdrop-blur-md text-primary border border-primary/20 px-1 py-0.5 md:px-3 md:py-1 rounded-md text-[6px] md:text-[9px] font-orbitron font-black uppercase tracking-[0.05em] md:tracking-[0.2em] shadow-lg">
              {t.game}
            </span>
          </div>
          
          <div className="absolute top-1.5 right-1.5 md:top-4 md:right-4 z-20">
            <CountdownTimer targetDate={`${t.date} ${t.time}`} />
          </div>

          {isRegistrationUpcoming && (
            <div className="absolute inset-0 z-20 bg-black/55 backdrop-blur-[1px] flex items-center justify-center text-center p-4">
              <div>
                <p className="text-white font-orbitron font-black text-[10px] md:text-xs uppercase tracking-[0.18em]">Coming Soon</p>
                <p className="mt-1 text-primary font-rajdhani font-bold text-[10px] md:text-sm">
                  Registration opens {formatDateLabel(t.registration_start_date)}
                </p>
              </div>
            </div>
          )}

          <div className="absolute bottom-1.5 left-1.5 right-1.5 md:bottom-4 md:left-4 md:right-4 z-20">
            <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-lg md:rounded-2xl p-1.5 md:p-3 flex items-center justify-between group-hover:border-primary/30 transition-all">
                <div className="flex flex-col">
                    <span className="text-[5px] md:text-[8px] text-gray-400 font-bold uppercase tracking-wider">PRIZE</span>
                    <span className="text-white font-orbitron font-black text-[10px] md:text-lg leading-none tracking-tighter">{t.prize}</span>
                </div>
                <div className="w-5 h-5 md:w-10 md:h-10 bg-primary/10 rounded-md md:rounded-xl flex items-center justify-center border border-primary/20">
                    <i className="fa-solid fa-trophy text-primary text-[8px] md:text-sm"></i>
                </div>
            </div>
          </div>
        </div>

        <div className="p-2.5 md:p-6 flex-grow flex flex-col relative">
          <p className="text-[10px] md:text-xl font-orbitron font-black text-white md:mb-1 line-clamp-2 leading-tight group-hover:text-primary transition-colors h-6 md:h-14">
            {t.title}
          </p>
          
          <div className="grid grid-cols-2 gap-2 md:gap-4 mb-3 md:mb-8">
            <div className="flex flex-col">
                <span className="text-[5px] md:text-[8px] text-gray-500 font-bold uppercase tracking-widest">DEPLOY</span>
                <div className="flex items-center gap-1 text-white font-rajdhani text-[8px] md:text-xs font-bold truncate">
                    <i className="fa-solid fa-calendar-days text-primary/60 text-[7px] md:text-[10px]"></i>
                    {t.date.split(',')[0]}
                </div>
            </div>
            <div className="flex flex-col">
                <span className="text-[5px] md:text-[8px] text-gray-500 font-bold uppercase tracking-widest">FEE</span>
                <div className="flex items-center gap-1 text-accent font-rajdhani text-[8px] md:text-xs font-black group/fee relative cursor-help">
                    <i className="fa-solid fa-id-card text-accent/60 text-[7px] md:text-[10px]"></i>
                    {t.entry_fee}
                    <FeeTooltip />
                </div>
            </div>
          </div>

          <div className="mb-3 md:mb-6 space-y-1 md:space-y-2">
            <div className="flex justify-between items-center text-[6px] md:text-[9px] font-black uppercase tracking-widest">
                <span className="text-gray-500">REGISTERED</span>
                <span className={slotsLeft <= 5 ? 'text-pink animate-pulse' : 'text-tertiary'}>
                    {slotsLeft === 0 ? 'FULL' : `${slotsLeft} LEFT`}
                </span>
            </div>
            <div className="h-1.5 md:h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div
                    className="h-full bg-primary shadow-[0_0_5px_#00d4ff] rounded-full transition-all duration-1000"
                    style={{ width: `${progressPercent}%` }}
                ></div>
            </div>
          </div>

          <div className="mt-auto">
            {isRegistrationOpen ? (
              <Link to={`/tournament/${t.id}`} className="relative block w-full group/btn overflow-hidden">
                  <div className="absolute inset-0 bg-primary translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                  <div className="relative w-full py-2 md:py-4 bg-white/5 border border-white/10 group-hover/btn:border-primary text-center font-orbitron font-black text-[8px] md:text-[10px] uppercase tracking-widest md:tracking-[0.3em] transition-all group-hover/btn:text-dark">
                      {slotsLeft === 0 ? 'INTEL' : 'REGISTER'} <i className="fa-solid fa-arrow-right-long ml-1 md:ml-2 group-hover/btn:translate-x-1 transition-transform"></i>
                  </div>
              </Link>
            ) : (
              <div className={`w-full py-2 md:py-4 border text-center font-orbitron font-black text-[8px] md:text-[10px] uppercase tracking-widest md:tracking-[0.3em] ${isRegistrationUpcoming ? 'bg-black/60 border-primary/40 text-primary' : 'bg-black/60 border-pink/40 text-pink'}`}>
                {isRegistrationUpcoming ? 'Coming Soon' : 'Event Ended'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


const TournamentsPage = ({ tournaments, registrations }) => {
  const [activeTab, setActiveTab] = useState('all');
  const tabs = ['all', 'freefire', 'pubg', 'ludo'];
  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  const filtered = tournaments
    .filter(t => activeTab === 'all' || t.type === activeTab)
    .sort((a, b) => {
      const statusOrder = { open: 0, upcoming: 1, ended: 2 };
      const aStatus = getRegistrationStatus(a);
      const bStatus = getRegistrationStatus(b);

      if (statusOrder[aStatus] !== statusOrder[bStatus]) {
        return statusOrder[aStatus] - statusOrder[bStatus];
      }

      const aStart = parseDateAtStartOfDay(a.registration_start_date)?.getTime() ?? Infinity;
      const bStart = parseDateAtStartOfDay(b.registration_start_date)?.getTime() ?? Infinity;
      if (aStart !== bStart) return aStart - bStart;

      return (a.title || '').localeCompare(b.title || '');
    });

  const handleTouchStart = (e) => {
    touchStart.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabs.indexOf(activeTab);
      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      } else if (isRightSwipe && currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1]);
      }
    }
    touchStart.current = null;
    touchEnd.current = null;
  };

  return (
    <div 
      className="pt-32 pb-24 min-h-screen bg-bg-dark"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="container mx-auto px-4 md:px-6">
        <header className="text-center mb-10 md:mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 bg-primary/5 blur-[80px] md:blur-[100px] rounded-full -z-10"></div>
          <h2 className="text-3xl md:text-7xl font-orbitron font-black text-white uppercase tracking-tighter text-glow mb-4">
            ACTIVE <span className="text-primary">ARENAS</span>
          </h2>
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <div className="h-[1px] w-8 md:w-12 bg-gradient-to-r from-transparent to-primary/40"></div>
            <p className="text-gray-500 font-rajdhani font-bold uppercase tracking-[0.2em] md:tracking-[0.4em] text-[10px] md:text-base">Operational Sectors</p>
            <div className="h-[1px] w-8 md:w-12 bg-gradient-to-l from-transparent to-primary/40"></div>
          </div>
        </header>

        {/* Tactical Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-1.5 md:gap-3 mb-10 md:mb-16 px-2">
          {tabs.map(game => (
            <button 
              key={game} 
              onClick={() => setActiveTab(game)} 
              className={`px-4 py-2 md:px-8 md:py-3.5 font-orbitron font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all rounded-lg md:rounded-2xl border ${activeTab === game ? 'bg-primary text-dark border-primary shadow-[0_0_15px_rgba(0,212,255,0.4)]' : 'bg-white/5 text-gray-500 border-white/10 hover:border-white/20'}`}
            >
              {game}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-8">
          {filtered.length > 0 ? filtered.map(t => (
            <TournamentCard key={t.id} t={t} registrations={registrations} registrationStatus={getRegistrationStatus(t)} />
          )) : (
            <div className="col-span-full py-40 text-center flex flex-col items-center">
               <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border border-white/5 flex items-center justify-center mb-8 relative">
                    <i className="fa-solid fa-satellite-dish text-3xl md:text-5xl text-gray-800 animate-pulse"></i>
                    <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping"></div>
               </div>
               <p className="text-gray-600 font-orbitron text-[8px] md:text-xs uppercase tracking-[0.4em]">No Active Missions Detected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentsPage;
