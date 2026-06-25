
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Tournament, GameType, Registration } from '../types.js';
import FadeContent from '../components/ReactBits/FadeContent';
import BlurText from '../components/ReactBits/BlurText';
import ShinyText from '../components/ReactBits/ShinyText';
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

export const CountdownTimer = ({ targetDate, status }) => {
  const [state, setState] = useState({ mode: 'timeLeft', timeLeft: null });

  useEffect(() => {
    const calculate = () => {
      const startMs = new Date(targetDate).getTime();
      if (Number.isNaN(startMs)) {
        setState({ mode: 'liveEnded', timeLeft: null });
        return;
      }

      const nowMs = Date.now();

      // Expected tournament duration: use a 2-hour window from start.
      // Display rules:
      // - if time left (now < start) -> show countdown
      // - if time came (start <= now <= end) -> show LIVE
      // - if event ended (now > end) OR status === 'ended' -> show LIVE ENDED
      const endMs = startMs + (2 * 60 * 60 * 1000);
      const liveEndedByTime = nowMs > endMs;
      const liveEndedByServer = status === 'ended';

      if (liveEndedByServer || liveEndedByTime) {
        setState({ mode: 'liveEnded', timeLeft: null });
        return;
      }

      if (nowMs >= startMs) {
        setState({ mode: 'live', timeLeft: null });
        return;
      }

      const distance = startMs - nowMs;
      setState({
        mode: 'timeLeft',
        timeLeft: {
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000),
        }
      });
    };

    calculate();
    const t = setInterval(calculate, 1000);
    return () => clearInterval(t);
  }, [targetDate, status]);

  if (state.mode === 'timeLeft' && state.timeLeft) {
    const { d, h, m } = state.timeLeft;
    return (
      <div className="flex gap-0.5 md:gap-1 items-center bg-navy/90 backdrop-blur-md px-2 md:px-3 py-1 md:py-1.5 rounded-md border border-white/10 shadow-sm">
        <div className="text-white font-space text-[8px] md:text-xs font-semibold">{d}d</div>
        <div className="text-gray-500 text-[8px]">:</div>
        <div className="text-white font-space text-[8px] md:text-xs font-semibold">{String(h).padStart(2, '0')}h</div>
        <div className="text-gray-500 text-[8px]">:</div>
        <div className="text-white font-space text-[8px] md:text-xs font-semibold">{String(m).padStart(2, '0')}m</div>
      </div>
    );
  }

  if (state.mode === 'liveEnded') {
    return (
      <div className="flex items-center gap-1 bg-navy/90 border border-white/10 rounded-md px-1.5 md:px-2 py-0.5 md:py-1 text-gray-300 font-inter text-[8px] md:text-xs font-semibold tracking-wide">
        <span className="relative flex h-1.5 md:h-2 w-1.5 md:w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-white/20 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 md:h-2 w-1.5 md:w-2 bg-white/40" />
        </span>
        LIVE ENDED
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-red-500/10 bg-white border border-red-500/20 rounded-md px-1.5 md:px-2 py-0.5 md:py-1 text-red-500 font-inter text-[8px] md:text-xs font-semibold tracking-wide">
      <span className="relative flex h-1.5 md:h-2 w-1.5 md:w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 md:h-2 w-1.5 md:w-2 bg-red-500"></span>
      </span>
      LIVE
    </div>
  );
};

export const FeeTooltip = () => (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 md:mb-3 w-40 md:w-48 p-3 md:p-4 bg-navy border border-white/10 rounded-lg md:rounded-xl text-[8px] md:text-xs text-gray-300 font-inter opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-xl scale-95 group-hover:scale-100 origin-bottom">
    <div className="text-cyan mb-2 md:mb-3 flex items-center gap-2 font-space font-semibold tracking-wide text-[8px] md:text-[10px]">
      <i className="fas fa-shield-halved text-xs"></i>
      PROTOCOL
    </div>
    <ul className="space-y-1 md:space-y-2">
      <li className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-cyan rounded-full flex-shrink-0"></span>
        Slot Verification
      </li>
      <li className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></span>
        Anti-Cheat Active
      </li>
      <li className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></span>
        Instant Payout
      </li>
    </ul>
    <div className="absolute top-full left-1/2 -translate-x-1/2 border-6 md:border-8 border-transparent border-t-white/10"></div>
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

  return (
    <BorderGlow
                  edgeSensitivity={25}
                  glowColor="187 80 70"
                  backgroundColor="#111827"
                  borderRadius={16}
                  glowRadius={25}
                  glowIntensity={1.0}
                  coneSpread={20}
                  colors={['#22D3EE', '#06B6D4', '#0891B2']}
                  animate={true}
                >
    <div className="relative group flex flex-col h-full animate-fade-in">
      <div className="relative flex flex-col h-full bg-bg-card border border-white/10 group-hover:border-cyan/30 rounded-lg md:rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-2xl flex-grow">
        
        {isRegistrationEnded && (
          <div className="absolute top-3 md:top-6 -left-10 md:-left-12 w-32 md:w-40 z-30 rotate-[-45deg] bg-red-500 text-white text-center font-space text-[8px] md:text-[10px] font-bold uppercase tracking-wider py-0.5 md:py-1 shadow-md">
            Ended
          </div>
        )}
        
        <div className="relative aspect-[16/9] md:aspect-[16/10] overflow-hidden bg-charcoal">
          <img 
            src={t.image} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100" 
            alt={t.title} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent opacity-90"></div>
          
          <div className="absolute top-2 md:top-3 left-2 md:left-3 z-20">
            <span className="bg-navy/80 backdrop-blur-md text-cyan border border-cyan/20 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded text-[8px] md:text-[10px] font-inter font-semibold uppercase tracking-wider shadow-sm">
              {t.game}
            </span>
          </div>
          
          <div className="absolute top-2 md:top-3 right-2 md:right-3 z-20">
            <CountdownTimer
              targetDate={`${t.date} ${t.time}`}
              status={registrationStatus}
            />
          </div>


          {isRegistrationUpcoming && (
            <div className="absolute inset-0 z-20 bg-charcoal/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
              <p className="text-white font-space text-sm font-bold uppercase tracking-widest">Coming Soon</p>
              <p className="mt-2 text-cyan font-inter text-xs">
                Opens {formatDateLabel(t.registration_start_date)}
              </p>
            </div>
          )}

          <div className="absolute bottom-2 md:bottom-3 left-2 md:left-3 right-2 md:right-3 z-20">
            <div className="bg-navy/90 backdrop-blur-md border border-white/10 rounded-lg md:rounded-xl p-2 md:p-3 flex items-center justify-between shadow-sm">
                <div className="flex flex-col">
                    <span className="text-[8px] md:text-[10px] text-gray-400 font-inter font-medium uppercase tracking-widest">Prize Pool</span>
                    <span className="text-white font-space text-sm md:text-lg font-bold leading-tight">{t.prize}</span>
                </div>
                <div className="w-8 md:w-10 h-8 md:h-10 bg-cyan/10 rounded-lg flex items-center justify-center border border-cyan/20">
                    <i className="fa-solid fa-trophy text-cyan text-xs md:text-sm"></i>
                </div>
            </div>
          </div>
        </div>

        <div className="p-3 md:p-5 flex-grow flex flex-col relative">
          <h3 className="text-sm md:text-lg font-space font-bold text-white mb-3 md:mb-4 line-clamp-2 leading-snug group-hover:text-cyan transition-colors">
            {t.title}
          </h3>
          
          <div className="grid grid-cols-2 gap-2 md:gap-4 mb-3 md:mb-6">
            <div className="flex flex-col">
                <span className="text-[8px] md:text-[10px] text-gray-500 font-inter font-semibold uppercase tracking-widest mb-0.5 md:mb-1">Date</span>
                <div className="flex items-center gap-1 md:gap-2 text-gray-300 font-inter text-xs md:text-sm">
                    <i className="fa-regular fa-calendar text-gray-500 text-xs"></i>
                    {t.date.split(',')[0]}
                </div>
            </div>
            <div className="flex flex-col relative group/fee cursor-help">
                <span className="text-[8px] md:text-[10px] text-gray-500 font-inter font-semibold uppercase tracking-widest mb-0.5 md:mb-1">Entry Fee</span>
                <div className="flex items-center gap-1 md:gap-2 text-white font-inter text-xs md:text-sm font-medium">
                    <i className="fa-solid fa-ticket text-cyan/70 text-xs"></i>
                    {t.entry_fee}
                </div>
                <FeeTooltip />
            </div>
          </div>

          <div className="mb-3 md:mb-6">
            <div className="flex justify-between items-center text-[8px] md:text-xs font-inter mb-1 md:mb-2">
                <span className="text-gray-400">Slots Filled</span>
                <span className={`font-medium ${slotsLeft <= 5 ? 'text-red-400' : 'text-gray-300'}`}>
                    {currentRegs} / {max_slots}
                </span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full bg-cyan rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progressPercent}%` }}
                ></div>
            </div>
          </div>

          <div className="mt-auto">
            {isRegistrationOpen ? (
              <Link to={`/tournament/${t.id}`} className="premium-button block w-full py-2 md:py-3 bg-cyan text-charcoal text-center font-space text-xs md:text-sm font-bold uppercase tracking-wider hover:bg-white transition-colors">
                  {slotsLeft === 0 ? 'View Details' : 'Register Now'}
              </Link>
            ) : (
              <div className="block w-full py-2 md:py-3 bg-white/5 border border-white/10 rounded-lg text-center font-space text-xs md:text-sm font-medium text-gray-400 cursor-not-allowed">
                {isRegistrationUpcoming ? 'Registration Closed' : 'Event Ended'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
     </BorderGlow>
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
      className="pt-24 md:pt-32 pb-20 md:pb-24 min-h-screen bg-bg-dark"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="container mx-auto px-3 md:px-6">
        <header className="text-center mb-6 md:mb-10 lg:mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 md:w-48 lg:w-64 h-32 md:h-48 lg:h-64 bg-primary/5 blur-[60px] md:blur-[80px] lg:blur-[100px] rounded-full -z-10"></div>
          <h2 className="text-2xl md:text-5xl lg:text-7xl font-orbitron font-black text-white uppercase tracking-tighter text-glow mb-2 md:mb-4">
            <BlurText text="ACTIVE" animateBy="words" delay={100} /> <span className="text-primary"><BlurText text="ARENAS" animateBy="words" delay={150} /></span>
          </h2>
          <div className="flex items-center justify-center gap-2 md:gap-3 lg:gap-4">
            <div className="h-[1px] w-4 md:w-8 lg:w-12 bg-gradient-to-r from-transparent to-primary/40"></div>
            <ShinyText text="Operational Sectors" speed={3} className="text-gray-500 font-rajdhani font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] lg:tracking-[0.4em] text-[8px] md:text-base" />
            <div className="h-[1px] w-4 md:w-8 lg:w-12 bg-gradient-to-l from-transparent to-primary/40"></div>
          </div>
        </header>

        {/* Tactical Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-1 md:gap-1.5 lg:gap-3 mb-6 md:mb-10 lg:mb-16 px-1">
          {tabs.map(game => (
            <button 
              key={game} 
              onClick={() => setActiveTab(game)} 
              className={`px-2.5 md:px-4 lg:px-8 py-1.5 md:py-2 lg:py-3.5 font-orbitron font-black text-[7px] md:text-[8px] lg:text-[10px] uppercase tracking-widest transition-all rounded-lg md:rounded-2xl border ${activeTab === game ? 'bg-primary text-dark border-primary shadow-[0_0_15px_rgba(0,212,255,0.4)]' : 'bg-white/5 text-gray-500 border-white/10 hover:border-white/20'}`}
            >
              {game}
            </button>
          ))}
        </div>

        <FadeContent blur={true} duration={1000} easing="ease-out" initialOpacity={0}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4 lg:gap-8">
            {filtered.length > 0 ? filtered.map(t => (
              <TournamentCard key={t.id} t={t} registrations={registrations} registrationStatus={getRegistrationStatus(t)} />
            )) : (
              <div className="col-span-full py-24 md:py-40 text-center flex flex-col items-center">
                 <div className="w-12 md:w-16 lg:w-24 h-12 md:h-16 lg:h-24 rounded-full border border-white/5 flex items-center justify-center mb-4 md:mb-8 relative">
                      <i className="fa-solid fa-satellite-dish text-lg md:text-3xl lg:text-5xl text-gray-800 animate-pulse"></i>
                      <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping"></div>
                 </div>
                 <p className="text-gray-600 font-orbitron text-[7px] md:text-[8px] lg:text-xs uppercase tracking-[0.2em] md:tracking-[0.4em]">No Active Missions Detected</p>
              </div>
            )}
          </div>
        </FadeContent>
      </div>
    </div>
  );
};

export default TournamentsPage;
