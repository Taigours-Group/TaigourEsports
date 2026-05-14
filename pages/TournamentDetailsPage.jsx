
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CountdownTimer, FeeTooltip } from './TournamentsPage';

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

const TournamentDetailsPage = ({ tournaments, onRegister, registrations }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournament = tournaments.find(t => t.id === id);
  
  const [activeTab, setActiveTab] = useState('rules');
  const [showRegModal, setShowRegModal] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [regForm, setRegForm] = useState({
    playername: '',
    playerage: '',
    playeremail: '',
    playercontact: '',
    gameuid: '',
    promocode: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const touchStart = useRef(null);
  const touchEnd = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!tournament) {
    return (
      <div className="pt-32 pb-24 text-center">
        <h2 className="text-3xl font-orbitron text-white">404: SECTOR NOT FOUND</h2>
        <Link to="/tournaments" className="mt-8 inline-block text-primary font-bold">RETURN TO ARENA</Link>
      </div>
    );
  }

  const currentRegs = (Array.isArray(registrations) ? registrations : []).filter(r => String(r.tournamentid) === String(tournament.id)).length;
  const max_slots = Number(tournament.max_slots) || 48;
  const slotsLeft = Math.max(0, max_slots - currentRegs);
  const isSoldOut = slotsLeft === 0;
  const regStart = parseDateAtStartOfDay(tournament.registration_start_date);
  const regEnd = parseDateAtEndOfDay(tournament.registration_end_date);
  const now = new Date();
  const registrationUpcoming = regStart && now < regStart;
  const registrationEnded = regEnd && now > regEnd;
  const registrationOpen = !registrationUpcoming && !registrationEnded;
  const canRegister = registrationOpen && !isSoldOut;

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    if (!canRegister || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentid: tournament.id,
          playername: regForm.playername,
          playerage: regForm.playerage,
          playeremail: regForm.playeremail,
          playercontact: regForm.playercontact,
          gameuid: regForm.gameuid,
          promocode: regForm.promocode
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Call the local onRegister to update local state
        const registration = {
          id: Date.now().toString(),
          tournamentid: tournament.id,
          tournamenttitle: tournament.title,
          playername: regForm.playername,
          Player_Age: regForm.playerage,
          playeremail: regForm.playeremail,
          playercontact: regForm.playercontact,
          gameuid: regForm.gameuid,
          Promo_Code: regForm.promocode,
          registrationdate: Date.now()
        };
        onRegister(registration);
        setRegistrationSuccess(true);
        setShowToast(true);

        setTimeout(() => {
          setShowToast(false);
        }, 4000);
      } else {
        const error = await response.json();
        alert(`Registration failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModals = () => {
    setShowRegModal(false);
    setRegistrationSuccess(false);
    setRegForm({
      playername: '',
      playerage: '',
      playeremail: '',
      playercontact: '',
      gameuid: '',
      promocode: ''
    });
    setIsSubmitting(false);
  };

  const handleModalTouchStart = (e) => {
    touchStart.current = e.targetTouches[0].clientY;
  };

  const handleModalTouchMove = (e) => {
    touchEnd.current = e.targetTouches[0].clientY;
  };

  const handleModalTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchEnd.current - touchStart.current;
    if (distance > 150) { // Swiped down significantly
      closeModals();
    }
    touchStart.current = null;
    touchEnd.current = null;
  };

  const addToCalendar = () => {
    if (!tournament) return;
    const title = tournament.title.replace(/,/g, '');
    const location = tournament.location.replace(/,/g, '');
    const description = `Taigour E-Sports Tournament: ${tournament.game}. Prize: ${tournament.prize}`;
    const dateStr = tournament.date.replace(/,/g, '');
    const startDate = new Date(`${dateStr} ${tournament.time}`);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const formatICSDate = (date) => date.toISOString().replace(/-|:|\.\d+/g, '');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pt-24 md:pt-32 pb-24 bg-bg-dark min-h-screen relative">
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[2000] animate-slide-up w-[90%] max-w-sm">
          <div className="bg-tertiary/20 backdrop-blur-xl border border-tertiary/50 px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(0,255,128,0.3)] flex items-center gap-4">
            <div className="w-8 h-8 bg-tertiary rounded-full flex items-center justify-center shrink-0">
              <i className="fas fa-check text-bg-dark text-sm"></i>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-orbitron font-black text-white text-[10px] uppercase tracking-widest truncate">Registration Confirmed</p>
              <p className="font-rajdhani text-gray-300 text-xs truncate">Registration Successful!</p>
            </div>
            <button onClick={() => setShowToast(false)} className="text-white/40 hover:text-white transition-colors shrink-0">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-[10px] md:text-xs font-orbitron font-black text-gray-500 uppercase tracking-widest mb-6 md:mb-8 overflow-hidden">
            <Link to="/tournaments" className="hover:text-primary transition-colors shrink-0">ARENA</Link>
            <i className="fas fa-chevron-right text-[8px] shrink-0"></i>
            <span className="text-white truncate">{tournament.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
            <div className="lg:col-span-8 space-y-6 md:space-y-8">
              <div className="relative aspect-video rounded-xl overflow-hidden neon-border">
                <img src={tournament.image} className="w-full h-full object-cover" alt={tournament.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent"></div>
                <div className="absolute top-3 right-3 md:top-6 md:right-6">
                  <CountdownTimer targetDate={`${tournament.date} ${tournament.time}`} />
                </div>
              </div>

              <div className="glass p-5 md:p-12 rounded-xl border border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-8">
                  <div className="flex-1">
                    <span className="text-primary font-orbitron font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1 md:mb-2 block">{tournament.game}</span>
                    <h1 className="text-2xl md:text-5xl font-orbitron font-black text-white uppercase tracking-tighter leading-tight">{tournament.title}</h1>
                  </div>
                  <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 px-4 py-2 md:px-6 md:py-3 rounded self-start md:self-center">
                    <div className="w-8 h-8 bg-primary rounded flex items-center justify-center shrink-0"><i className="fas fa-award text-bg-dark"></i></div>
                    <div className="flex flex-col leading-none">
                      <span className="text-[8px] md:text-[10px] text-primary uppercase font-bold tracking-widest">PRIZE POOL</span>
                      <span className="text-white text-lg md:text-xl font-black">{tournament.prize}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6 mb-5 lg:hidden">
              <div className="glass p-6 md:p-8 rounded-xl border border-white/5 space-y-6 md:space-y-8 lg:sticky lg:top-24">
                <div className="space-y-5 md:space-y-6">
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary transition-all shrink-0">
                      <i className="fas fa-calendar-day text-primary text-lg md:text-xl"></i>
                    </div>
                    <div>
                      <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest block">DEPARTURE</span>
                      <span className="text-white font-bold text-sm md:text-base">{tournament.date} @ {tournament.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary transition-all shrink-0">
                      <i className="fas fa-map-marker-alt text-primary text-lg md:text-xl"></i>
                    </div>
                    <div>
                      <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest block">ARENA</span>
                      <span className="text-white font-bold text-sm md:text-base">{tournament.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group relative cursor-help">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary transition-all shrink-0">
                      <i className="fas fa-ticket-simple text-primary text-lg md:text-xl"></i>
                    </div>
                    <div>
                      <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest block">ENTRY FEE</span>
                      <span className="text-accent font-black text-lg md:text-xl">{tournament.entry_fee}</span>
                    </div>
                    <FeeTooltip />
                  </div>
                </div>

                <div className="pt-6 md:pt-8 border-t border-white/5 space-y-4">
                  <button 
                    disabled={!canRegister}
                    onClick={() => setShowRegModal(true)}
                    className={`w-full py-4 md:py-5 font-orbitron font-black text-sm uppercase tracking-[0.2em] md:tracking-[0.3em] transition-all cyber-button ${!canRegister ? 'bg-gray-800 text-gray-500 cursor-not-allowed border-gray-700' : 'bg-primary text-bg-dark shadow-[0_0_20px_rgba(0,212,255,0.2)] hover:shadow-[0_0_40px_rgba(0,212,255,0.3)]'}`}
                  >
                    {isSoldOut ? 'SLOTS FULL' : registrationUpcoming ? 'COMING SOON' : registrationEnded ? 'EVENT ENDED' : 'REGISTER NOW'}
                  </button>
                  <p className={`text-center text-[9px] font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] ${registrationEnded || isSoldOut ? 'text-pink' : registrationUpcoming ? 'text-primary' : slotsLeft <= 5 ? 'text-pink animate-pulse' : 'text-gray-500'}`}>
                    {registrationUpcoming
                      ? `Registration opens on ${formatDateLabel(tournament.registration_start_date)}`
                      : registrationEnded
                        ? 'Registration Closed: Event Ended'
                        : isSoldOut
                          ? 'Registration Closed'
                          : `${slotsLeft} sectors remaining`}
                  </p>
                </div>
              </div>
            </div>

                <p className="text-gray-400 font-rajdhani text-lg md:text-xl leading-relaxed mb-8 md:mb-10 border-l-2 border-primary/30 pl-4 md:pl-6 italic">
                  {tournament.description || "Deploy into the most competitive arena of the season. Only the elite will survive and claim the ultimate reward."}
                </p>

                <div className="flex gap-4 md:gap-8 border-b border-white/10 mb-8 overflow-x-auto no-scrollbar">
                   <button onClick={() => setActiveTab('rules')} className={`pb-4 font-orbitron text-[10px] md:text-xs uppercase tracking-widest font-black transition-all relative whitespace-nowrap ${activeTab === 'rules' ? 'text-primary' : 'text-gray-500 hover:text-white'}`}>
                      ENGAGEMENT RULES
                      {activeTab === 'rules' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_#00d4ff]"></span>}
                   </button>
                   <button onClick={() => setActiveTab('prizes')} className={`pb-4 font-orbitron text-[10px] md:text-xs uppercase tracking-widest font-black transition-all relative whitespace-nowrap ${activeTab === 'prizes' ? 'text-primary' : 'text-gray-500 hover:text-white'}`}>
                      REWARD BREAKDOWN
                      {activeTab === 'prizes' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_#00d4ff]"></span>}
                   </button>
                </div>

                <div className="min-h-[200px] md:min-h-[300px] animate-fade-in">
                   {activeTab === 'rules' ? (
                     <ul className="space-y-4 md:space-y-6 font-rajdhani text-gray-300">
                        {(tournament.rules || [
                          'Must use mobile device only. No Emulators.',
                          'Players must be present 15 minutes before start.',
                          'Hacking or exploitation results in instant disqualification.',
                          'Admin decisions are final and binding.'
                        ]).map((rule, idx) => (
                          <li key={idx} className="flex gap-4 md:gap-6 items-start group">
                             <span className="w-5 h-5 md:w-6 md:h-6 rounded bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] md:text-[10px] font-black text-primary shrink-0 group-hover:bg-primary group-hover:text-bg-dark transition-all">{idx + 1}</span>
                             <p className="text-base md:text-lg leading-snug">{rule}</p>
                          </li>
                        ))}
                     </ul>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        {(tournament.prizeBreakdown || [
                          { position: '1st Place', reward: '60% of Prize Pool' },
                          { position: '2nd Place', reward: '25% of Prize Pool' },
                          { position: '3rd Place', reward: '15% of Prize Pool' }
                        ]).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-4 md:p-6 bg-white/5 rounded border border-white/5 group hover:border-primary/30 transition-all">
                             <span className="text-gray-500 uppercase font-black tracking-widest text-[9px] md:text-[10px]">{item.position}</span>
                             <span className="text-primary font-black text-lg md:text-xl group-hover:scale-105 transition-transform">{item.reward}</span>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6 hidden lg:block">
              <div className="glass p-6 md:p-8 rounded-xl border border-white/5 space-y-6 md:space-y-8 lg:sticky lg:top-24">
                <div className="space-y-5 md:space-y-6">
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary transition-all shrink-0">
                      <i className="fas fa-calendar-day text-primary text-lg md:text-xl"></i>
                    </div>
                    <div>
                      <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest block">DEPARTURE</span>
                      <span className="text-white font-bold text-sm md:text-base">{tournament.date} @ {tournament.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary transition-all shrink-0">
                      <i className="fas fa-map-marker-alt text-primary text-lg md:text-xl"></i>
                    </div>
                    <div>
                      <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest block">ARENA</span>
                      <span className="text-white font-bold text-sm md:text-base">{tournament.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group relative cursor-help">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary transition-all shrink-0">
                      <i className="fas fa-ticket-simple text-primary text-lg md:text-xl"></i>
                    </div>
                    <div>
                      <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest block">ENTRY FEE</span>
                      <span className="text-accent font-black text-lg md:text-xl">{tournament.entry_fee}</span>
                    </div>
                    <FeeTooltip />
                  </div>
                </div>

                <div className="pt-6 md:pt-8 border-t border-white/5 space-y-4">
                  <button 
                    disabled={!canRegister}
                    onClick={() => setShowRegModal(true)}
                    className={`w-full py-4 md:py-5 font-orbitron font-black text-sm uppercase tracking-[0.2em] md:tracking-[0.3em] transition-all cyber-button ${!canRegister ? 'bg-gray-800 text-gray-500 cursor-not-allowed border-gray-700' : 'bg-primary text-bg-dark shadow-[0_0_20px_rgba(0,212,255,0.2)] hover:shadow-[0_0_40px_rgba(0,212,255,0.3)]'}`}
                  >
                    {isSoldOut ? 'SLOTS FULL' : registrationUpcoming ? 'COMING SOON' : registrationEnded ? 'EVENT ENDED' : 'REGISTER NOW'}
                  </button>
                  <p className={`text-center text-[9px] font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] ${registrationEnded || isSoldOut ? 'text-pink' : registrationUpcoming ? 'text-primary' : slotsLeft <= 5 ? 'text-pink animate-pulse' : 'text-gray-500'}`}>
                    {registrationUpcoming
                      ? `Registration opens on ${formatDateLabel(tournament.registration_start_date)}`
                      : registrationEnded
                        ? 'Registration Closed: Event Ended'
                        : isSoldOut
                          ? 'Registration Closed'
                          : `${slotsLeft} sectors remaining`}
                  </p>
                </div>
              </div>
            </div>

            
          </div>
        </div>
      </div>

      {showRegModal && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-y-auto"
          onTouchStart={handleModalTouchStart}
          onTouchMove={handleModalTouchMove}
          onTouchEnd={handleModalTouchEnd}
        >
          <div className="fixed inset-0 bg-bg-dark/95 backdrop-blur-md" onClick={closeModals}></div>
          <div className="relative w-full max-w-xl glass p-6 md:p-12 rounded-xl border border-primary/30 shadow-[0_0_100px_rgba(0,212,255,0.1)] my-auto animate-fade-in overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-6 flex items-center justify-center opacity-30 md:hidden">
              <div className="w-12 h-1 bg-white/20 rounded-full"></div>
            </div>

            <button onClick={closeModals} className="absolute top-4 right-4 md:top-6 md:right-6 text-gray-500 hover:text-white transition-colors z-50">
              <i className="fas fa-times text-xl md:text-2xl"></i>
            </button>
            
            {!registrationSuccess ? (
              <>
                <div className="text-center mb-6 md:mb-10">
                  <h3 className="text-xl md:text-3xl font-orbitron font-black text-white uppercase tracking-tight">REGISTRATION <span className="text-primary">PORTAL</span></h3>
                  <p className="text-gray-500 font-rajdhani uppercase tracking-[0.3em] text-[8px] md:text-[10px] mt-1 md:mt-2">Initialize warrior authentication</p>
                </div>
                <form onSubmit={handleRegistrationSubmit} className="space-y-4 md:space-y-6 font-rajdhani">
                  <div className="bg-primary/5 border border-primary/10 p-3 md:p-4 rounded flex justify-between gap-4">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[8px] md:text-[10px] text-primary/60 uppercase font-black tracking-widest">Sector</span>
                      <span className="text-white font-bold truncate text-xs md:text-sm">{tournament.title}</span>
                    </div>
                    <div className="flex flex-col text-right shrink-0">
                        <span className="text-[8px] md:text-[10px] text-primary/60 uppercase font-black tracking-widest">Fee</span>
                        <span className="text-accent font-black text-xs md:text-sm">{tournament.entry_fee}</span>
                    </div>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <div className="group">
                      <label className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block group-focus-within:text-primary transition-colors">Player Name*</label>
                      <input type="text" required placeholder="Player Full Name" className="w-full bg-white/5 border border-white/10 p-3 md:p-4 text-white focus:border-primary outline-none transition-all placeholder:text-white/20 text-sm" value={regForm.playername} onChange={e => setRegForm({...regForm, playername: e.target.value})} />
                    </div>
                    <div className="group">
                      <label className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block group-focus-within:text-primary transition-colors">Player Age*</label>
                      <input type="number" required placeholder="Player Age" className="w-full bg-white/5 border border-white/10 p-3 md:p-4 text-white focus:border-primary outline-none transition-all placeholder:text-white/20 text-sm" value={regForm.playerage} onChange={e => setRegForm({...regForm, playerage: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div className="group">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block group-focus-within:text-primary transition-colors">Player Email*</label>
                        <input type="email" required placeholder="player@email.com" className="w-full bg-white/5 border border-white/10 p-3 md:p-4 text-white focus:border-primary outline-none transition-all placeholder:text-white/20 text-sm" value={regForm.playeremail} onChange={e => setRegForm({...regForm, playeremail: e.target.value})} />
                      </div>
                      <div className="group">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block group-focus-within:text-primary transition-colors">Player WhatsApp Number*</label>
                        <input type="tel" required placeholder="+977-98XXXXXXXX" className="w-full bg-white/5 border border-white/10 p-3 md:p-4 text-white focus:border-primary outline-none transition-all placeholder:text-white/20 text-sm" value={regForm.playercontact} onChange={e => setRegForm({...regForm, playercontact: e.target.value})} />
                      </div>
                    </div>

                    <div className="group">
                      <label className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block group-focus-within:text-primary transition-colors">Game UID*</label>
                      <input type="text" required placeholder="Game UID (i.e: 5498852398xxx955)" className="w-full bg-white/5 border border-white/10 p-3 md:p-4 text-white focus:border-primary outline-none transition-all placeholder:text-white/20 font-mono text-sm" value={regForm.gameuid} onChange={e => setRegForm({...regForm, gameuid: e.target.value})} />
                    </div>
                    <div className="group">
                      <label className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block group-focus-within:text-primary transition-colors">Promo Code (Optional)</label>
                      <input type="text" placeholder="Enter Promo Code if you have one" className="w-full bg-white/5 border border-white/10 p-3 md:p-4 text-white focus:border-primary outline-none transition-all placeholder:text-white/20 text-sm" value={regForm.promocode} onChange={e => setRegForm({...regForm, promocode: e.target.value})} />
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className={`w-full py-4 md:py-5 font-orbitron font-black text-xs md:text-sm uppercase tracking-[0.2em] md:tracking-[0.3em] transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-primary text-bg-dark shadow-[0_0_20px_rgba(0,212,255,0.2)] hover:shadow-[0_0_40px_rgba(0,212,255,0.4)]'}`}>
                    {isSubmitting ? (
                      <><i className="fas fa-circle-notch fa-spin"></i> SUBMITTING...</>
                    ) : (
                      <><i className="fas fa-file-signature"></i> CONFIRM REGISTRATION</>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-6 md:py-10 animate-fade-in">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-tertiary/20 border border-tertiary/40 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(0,255,128,0.2)]">
                  <i className="fas fa-check text-2xl md:text-3xl text-tertiary"></i>
                </div>
                <h3 className="text-2xl md:text-3xl font-orbitron font-black text-white uppercase tracking-tighter mb-2">MISSION <span className="text-tertiary">AUTHORIZED</span></h3>
                <p className="text-gray-400 font-rajdhani text-base md:text-lg mb-6 md:mb-8">Registration confirmed for <span className="text-primary font-bold">{tournament.title}</span></p>
                
                <div className="bg-white/5 border border-white/10 rounded-lg p-5 md:p-6 mb-6 md:mb-8 text-left space-y-3 font-rajdhani text-sm">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-500 uppercase text-[9px] font-black tracking-widest shrink-0">Warrior ID</span>
                    <span className="text-white font-mono truncate ml-4">{regForm.gameuid}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-500 uppercase text-[9px] font-black tracking-widest shrink-0">Deploy</span>
                    <span className="text-white truncate ml-4">{tournament.date} @ {tournament.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 uppercase text-[9px] font-black tracking-widest shrink-0">Arena</span>
                    <span className="text-white truncate ml-4">{tournament.location}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={addToCalendar}
                    className="w-full py-3 md:py-4 bg-white/5 border border-white/10 text-white font-orbitron font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-primary/10 hover:border-primary transition-all flex items-center justify-center gap-2"
                  >
                    <i className="far fa-calendar-plus text-primary"></i>
                    CALENDAR SYNC
                  </button>
                  <button 
                    onClick={closeModals}
                    className="w-full py-3 md:py-4 bg-primary text-bg-dark font-orbitron font-black text-[10px] md:text-xs uppercase tracking-widest hover:scale-[1.01] transition-all"
                  >
                    RETURN TO SECTOR
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetailsPage;
