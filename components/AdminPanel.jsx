
import React, { useState, useMemo, lazy, Suspense } from 'react';

// Lazy-load AdminRequestsPanel at module level (not inside a render function)
const AdminRequestsPanel = lazy(() => import('./AdminRequestsPanel'));
import PlayerStatsAdmin from './PlayerStatsAdmin';

const AdminPanel = ({
  tournaments, saveTournaments, refetchTournaments,
  leaderboard, saveLeaderboard,
  streams, saveStreams,
  registrations, saveRegistrations,
  systemLogs,
  onRestore
}) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [filterGame, setFilterGame] = useState('all');
  const [viewingReg, setViewingReg] = useState(null);
  const [whatsAppSentMap, setWhatsAppSentMap] = useState({});
  const [isRefreshingRegistrations, setIsRefreshingRegistrations] = useState(false);

  // Initial States for New Records
  const initialTournament = {
    title: '', game: 'Free Fire', type: 'freefire', location: 'Nepal',
    prize: '◈ 1,000', entry_fee: '◈ 100', date: '', time: '07:00 PM',
    registration_start_date: '', registration_end_date: '',
    registration_url: '#', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
    description: '', rules: ['No Emulators allowed', 'Fair play protocol active'],
    prize_breakdown: [{ position: '1st', reward: '◈ 600' }, { position: '2nd', reward: '◈ 400' }],
    max_slots: 48, stream_id: '',
    login_required: true, payment_type: 'tgc_coin', team_size: 4
  };

  const initialLeaderboard = {
    game: 'freefire', rank: 0, kills: 0, wins: 0, points: 0, teamname: '',
    avatar: 'https://i.pravatar.cc/150?u=' + Math.random()
  };

  const initialStream = {
    title: '', youtubeid: '', islive: false
  };

  // Form States
  const [tourneyForm, setTourneyForm] = useState(initialTournament);
  const [lbForm, setLbForm] = useState(initialLeaderboard);
  const [streamForm, setStreamForm] = useState(initialStream);

  // Statistics Calculation
  const stats = useMemo(() => {
    const totalPrize = tournaments.reduce((acc, t) => {
      const val = parseInt(t.prize.replace(/[^0-9]/g, ''));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    const totalPlayers = registrations.length;
    const activeTourneys = tournaments.length;
    return { totalPrize, totalPlayers, activeTourneys };
  }, [tournaments, registrations]);

  // Filtered List Logic
  const filteredList = useMemo(() => {
    const normalizeGame = (value) => {
      const v = (value || '').toString().toLowerCase().trim();
      if (!v) return '';
      if (v === 'freefire' || v === 'free fire') return 'freefire';
      if (v === 'pubg' || v === 'pubg mobile') return 'pubg';
      if (v === 'ludo' || v === 'ludo king') return 'ludo';
      return v.replace(/\s+/g, '');
    };

    const s = search.toLowerCase();
    let base = [];
    switch (activeView) {
      case 'tournaments': base = tournaments; break;
      case 'leaderboard': base = leaderboard; break;
      case 'streams': base = streams; break;
      case 'registrations': base = registrations; break;
      default: return [];
    }
    return base.filter(item => {
      const matchSearch = (
        (item.title || '') +
        (item.teamname || '') +
        (item.playername || '') +
        (item.tournamenttitle || '') +
        (item.gameuid || '') +
        (item.playeremail || '')
      ).toLowerCase().includes(s);

      let itemGameType = normalizeGame(item.type || item.game);
      if (activeView === 'registrations') {
        const linkedTournament = tournaments.find(t => t.id === item.tournamentid);
        itemGameType = normalizeGame(linkedTournament?.type || linkedTournament?.game);
      }

      // Streams are not game-specific in current data model.
      const matchGame = activeView === 'streams' || filterGame === 'all' || itemGameType === filterGame;
      return matchSearch && matchGame;
    });
  }, [activeView, tournaments, leaderboard, streams, registrations, search, filterGame]);

  // Handlers
  const resetForms = () => {
    setEditingId(null);
    setTourneyForm(initialTournament);
    setLbForm(initialLeaderboard);
    setStreamForm(initialStream);
  };

  const handleSaveTournament = async (e) => {
    e.preventDefault();
    if (tourneyForm.registration_start_date && tourneyForm.registration_end_date) {
      const regStart = new Date(tourneyForm.registration_start_date);
      const regEnd = new Date(tourneyForm.registration_end_date);
      if (regStart > regEnd) {
        alert('Registration start date must be before or equal to registration end date.');
        return;
      }
    }

    const gameLabel = tourneyForm.type === 'freefire' ? 'Free Fire' : tourneyForm.type === 'pubg' ? 'PUBG Mobile' : 'Ludo King';
    const sanitizedRules = (tourneyForm.rules || []).map(r => r.trim()).filter(r => r !== '');

    const finalForm = {
      ...tourneyForm,
      game: gameLabel,
      rules: sanitizedRules
    };

    try {
      let response;
      if (editingId) {
        // Update existing tournament
        response = await fetch(`/api/admin/tournaments/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalForm)
        });
      } else {
        // Create new tournament
        response = await fetch('/api/admin/tournaments/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalForm)
        });
      }

      if (response.ok) {
        const result = await response.json();
        // Update local state
        const newData = editingId
          ? tournaments.map(t => t.id === editingId ? result.data : t)
          : [...tournaments, result.data];
        await saveTournaments(newData);
        // Refetch from database to ensure display is updated
        await refetchTournaments();
        resetForms();
      } else {
        const error = await response.json();
        alert(`Failed to save tournament: ${error.error}`);
      }
    } catch (error) {
      console.error('Save tournament failed:', error);
      alert('Failed to save tournament. Please try again.');
    }
  };

  const handleSaveLeaderboard = async (e) => {
    e.preventDefault();

    try {
      let response;
      if (editingId) {
        // Update existing leaderboard entry
        response = await fetch(`/api/admin/leaderboard/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lbForm)
        });
      } else {
        // Create new leaderboard entry
        response = await fetch('/api/admin/leaderboard/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lbForm)
        });
      }

      if (response.ok) {
        const result = await response.json();
        // Update local state
        const newData = editingId
          ? leaderboard.map(l => l.id === editingId ? result.data : l)
          : [...leaderboard, result.data];
        await saveLeaderboard(newData);
        resetForms();
      } else {
        const error = await response.json();
        alert(`Failed to save leaderboard entry: ${error.error}`);
      }
    } catch (error) {
      console.error('Save leaderboard failed:', error);
      alert('Failed to save leaderboard entry. Please try again.');
    }
  };

  const handleSaveStream = async (e) => {
    e.preventDefault();
    let finalId = streamForm.youtubeid;
    if (finalId.includes('youtube.com/watch?v=')) {
      finalId = finalId.split('v=')[1]?.split('&')[0];
    } else if (finalId.includes('youtu.be/')) {
      finalId = finalId.split('youtu.be/')[1]?.split('?')[0];
    }

    const finalForm = { ...streamForm, youtubeid: finalId };

    try {
      let response;
      if (editingId) {
        // Update existing stream
        response = await fetch(`/api/admin/streams/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalForm)
        });
      } else {
        // Create new stream
        response = await fetch('/api/admin/streams/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalForm)
        });
      }

      if (response.ok) {
        const result = await response.json();
        // Update local state
        const newData = editingId
          ? streams.map(s => s.id === editingId ? result.data : s)
          : [...streams, result.data];
        await saveStreams(newData);
        resetForms();
      } else {
        const error = await response.json();
        alert(`Failed to save stream: ${error.error}`);
      }
    } catch (error) {
      console.error('Save stream failed:', error);
      alert('Failed to save stream. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("CONFIRM DELETION PROTOCOL: This action will permanently erase sector data. Proceed?")) return;

    try {
      switch (activeView) {
        case 'tournaments': {
          const res = await fetch(`/api/admin/tournaments/${id}`, { method: 'DELETE' });
          if (res.ok) await saveTournaments(tournaments.filter(t => t.id !== id));
          break;
        }
        case 'leaderboard': {
          const res = await fetch(`/api/admin/leaderboard/${id}`, { method: 'DELETE' });
          if (res.ok) await saveLeaderboard(leaderboard.filter(l => l.id !== id));
          break;
        }
        case 'streams': {
          const res = await fetch(`/api/admin/streams/${id}`, { method: 'DELETE' });
          if (res.ok) await saveStreams(streams.filter(s => s.id !== id));
          break;
        }
        case 'registrations': {
          const res = await fetch(`/api/admin/registrations/${id}`, { method: 'DELETE' });
          if (res.ok) await saveRegistrations(registrations.filter(r => r.id !== id));
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.error('Delete operation failed:', error);
      alert('Delete operation failed. Please try again.');
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    if (activeView === 'tournaments') {
      setTourneyForm({
        ...initialTournament,
        ...item,
        rules: item.rules || initialTournament.rules,
        prize_breakdown: item.prize_breakdown || initialTournament.prize_breakdown
      });
    }
    if (activeView === 'leaderboard') setLbForm({ ...initialLeaderboard, ...item });
    if (activeView === 'streams') setStreamForm({ ...initialStream, ...item });
  };

  // Render the lazily-loaded AdminRequestsPanel (component loaded at module level)
  const renderRequests = () => (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading requests...</div>}>
      <AdminRequestsPanel />
    </Suspense>
  );

  const updatePrizeBreakdown = (index, field, value) => {
    const newBreakdown = [...(tourneyForm.prize_breakdown || [])];
    newBreakdown[index] = { ...newBreakdown[index], [field]: value };
    setTourneyForm({ ...tourneyForm, prize_breakdown: newBreakdown });
  };

  const addPrizeRow = () => {
    setTourneyForm({
      ...tourneyForm,
      prize_breakdown: [...(tourneyForm.prize_breakdown || []), { position: '', reward: '' }]
    });
  };

  const removePrizeRow = (index) => {
    const newBreakdown = [...(tourneyForm.prize_breakdown || [])];
    newBreakdown.splice(index, 1);
    setTourneyForm({ ...tourneyForm, prize_breakdown: newBreakdown });
  };

  const getRegistrationMessageKey = (registration) => {
    if (!registration) return '';
    return registration.id || `${registration.gameuid || ''}-${registration.playercontact || ''}`;
  };

  const sendRegistrationWhatsApp = async (registration) => {
    const rawContact = registration?.playercontact || '';
    const sanitizedNumber = rawContact.replace(/\D/g, '');

    if (!sanitizedNumber) {
      alert('WhatsApp number is missing for this player.');
      return;
    }

    const linkedTournament = tournaments.find(t => t.id === registration?.tournamentid);
    const tournamentName = registration?.tournamenttitle || linkedTournament?.title || 'your tournament';
    const tournamentDate = linkedTournament?.date || registration?.tournamentdate || null;
    const tournamentTime = linkedTournament?.time || registration?.tournamenttime || null;
    const dateLine = tournamentDate
      ? ` Tournament date: ${tournamentDate}${tournamentTime ? ` at ${tournamentTime}` : ''}.`
      : '';

    const message = `Hello ${registration.playername}, your registration is successful for ${tournamentName}. Your UID is ${registration.gameuid}.${dateLine} Welcome to Taigour E-Sports!`;
    const encodedMessage = encodeURIComponent(message);
    const webWhatsAppUrl = `https://web.whatsapp.com/send?phone=${sanitizedNumber}&text=${encodedMessage}`;
    const mobileWhatsAppUrl = `https://wa.me/${sanitizedNumber}?text=${encodedMessage}`;
    const isMobileDevice = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const whatsappUrl = isMobileDevice ? mobileWhatsAppUrl : webWhatsAppUrl;
    const messageKey = getRegistrationMessageKey(registration);

    // Mark locally as sent on user action.
    setWhatsAppSentMap(prev => ({ ...prev, [messageKey]: true }));
    const updatedRegistration = {
      ...registration,
      SMS_Status: true
    };

    // Persist SMS status in database so personnel status stays true after refresh.
    if (registration?.id) {
      try {
        const response = await fetch(`/api/admin/registrations/${registration.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedRegistration)
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to update SMS status.' }));
          throw new Error(error.error || 'Failed to update SMS status.');
        }

        const result = await response.json();
        const savedRegistration = result?.data || updatedRegistration;
        await saveRegistrations(registrations.map(r => r.id === registration.id ? savedRegistration : r));
        setViewingReg(savedRegistration);
      } catch (error) {
        console.error('Failed to persist SMS status:', error);
      }
    }

    const popupRef = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!popupRef) {
      alert('SMS Sent Successfully to the player.');
    }
  };

  const refreshRegistrations = async () => {
    setIsRefreshingRegistrations(true);
    try {
      const response = await fetch('/api/registrations');
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to refresh personnel data.' }));
        throw new Error(error.error || 'Failed to refresh personnel data.');
      }
      const data = await response.json();
      await saveRegistrations(data || []);
    } catch (error) {
      console.error('Refresh registrations failed:', error);
      alert(error.message || 'Failed to refresh personnel data.');
    } finally {
      setIsRefreshingRegistrations(false);
    }
  };

  const isSmsSent = (registration) => {
    const rawStatus = registration?.SMS_Status ?? registration?.sms_status ?? registration?.smsStatus;
    if (typeof rawStatus === 'boolean') return rawStatus;
    const normalized = (rawStatus || '').toString().trim().toLowerCase();
    return normalized === 'true' || normalized === 'sent' || normalized === 'success' || normalized === '1' || normalized === 'yes';
  };

  return (
    <div className="pt-20 md:pt-24 pb-20 md:pb-24 min-h-screen bg-bg-dark font-rajdhani">
      <div className="container mx-auto px-3 md:px-4">
        {/* Admin Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 md:mb-12 gap-4 md:gap-6 bg-bg-card p-4 md:p-6 border border-white/5 rounded-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary animate-pulse"></div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30 flex-shrink-0">
              <i className="fa-solid fa-shield-halved text-primary text-lg md:text-xl"></i>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-orbitron font-black text-white tracking-tighter uppercase">Command <span className="text-primary">Center</span></h1>
              <p className="text-[8px] md:text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] md:tracking-[0.4em] truncate">Auth Level: Supreme Administrator</p>
            </div>
          </div>

          <div className="w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 flex gap-1 md:gap-2 custom-scrollbar">
            {[
              { id: 'dashboard', label: 'Dash', icon: 'fa-chart-pie' }, 
              { id: 'players', label: 'Players', icon: 'fa-user-gear' },
              { id: 'tournaments', label: 'Arenas', icon: 'fa-crosshairs' },
              { id: 'leaderboard', label: 'Ranks', icon: 'fa-crown' },
              { id: 'streams', label: 'Feeds', icon: 'fa-bolt' }, 
              { id: 'registrations', label: 'Teams', icon: 'fa-users' },
              { id: 'requests', label: 'Requests', icon: 'fa-inbox' },
              { id: 'logs', label: 'Logs', icon: 'fa-list-ul' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveView(tab.id); resetForms(); }}
                className={`px-3 md:px-4 py-2 md:py-2.2 rounded-lg font-orbitron font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all flex items-center gap-1 md:gap-2 border flex-shrink-0 ${activeView === tab.id ? 'bg-primary text-dark border-primary shadow-[0_0_15px_rgba(0,212,255,0.4)]' : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/20'}`}
              >
                <i className={`fa-solid ${tab.icon}`}></i> <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <div className="lg:col-span-7 xl:col-span-8 space-y-6 md:space-y-8 min-w-0">
            {activeView === 'dashboard' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-fade-in">
                <div className="bg-bg-card p-6 md:p-8 rounded-2xl border border-white/5 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <i className="fa-solid fa-users text-6xl md:text-8xl"></i>
                  </div>
                  <div className="text-gray-500 font-bold text-[9px] md:text-xs uppercase tracking-widest mb-2">Personnel Enlisted</div>
                  <div className="text-4xl md:text-5xl font-orbitron font-black text-white">{stats.totalPlayers}</div>
                  <div className="mt-4 text-[9px] md:text-[10px] text-tertiary font-bold uppercase tracking-widest">Active Database Records</div>
                </div>
                <div className="bg-bg-card p-6 md:p-8 rounded-2xl border border-white/5 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <i className="fa-solid fa-trophy text-6xl md:text-8xl"></i>
                  </div>
                  <div className="text-gray-500 font-bold text-[9px] md:text-xs uppercase tracking-widest mb-2">Total Prize Vault</div>
                  <div className="text-4xl md:text-5xl font-orbitron font-black text-primary">◈ {stats.totalPrize.toLocaleString()}</div>
                  <div className="mt-4 text-[9px] md:text-[10px] text-primary font-bold uppercase tracking-widest">Combat Rewards Assigned</div>
                </div>
                <div className="bg-bg-card p-6 md:p-8 rounded-2xl border border-white/5 relative overflow-hidden group sm:col-span-2 lg:col-span-1">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <i className="fa-solid fa-satellite-dish text-6xl md:text-8xl"></i>
                  </div>
                  <div className="text-gray-500 font-bold text-[9px] md:text-xs uppercase tracking-widest mb-2">Active Arenas</div>
                  <div className="text-4xl md:text-5xl font-orbitron font-black text-pink">{stats.activeTourneys}</div>
                  <div className="mt-4 text-[9px] md:text-[10px] text-pink font-bold uppercase tracking-widest">Sectors Operational</div>
                </div>

                <div className="sm:col-span-2 lg:col-span-3 bg-bg-card p-6 md:p-8 rounded-2xl border border-white/5">
                  <h3 className="text-lg md:text-xl font-orbitron font-black text-white mb-4 md:mb-6 uppercase tracking-widest">Global Matrix Backup</h3>
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                    <button
                      onClick={() => {
                        const blob = new Blob([JSON.stringify({ tournaments, leaderboard, streams, registrations })], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `nexus_sector_state_${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                      }}
                      className="flex-1 py-3 md:py-4 glass border border-primary/20 text-primary font-orbitron font-black text-[9px] md:text-xs uppercase tracking-widest hover:bg-primary hover:text-dark transition-all"
                    >
                      DOWNLOAD STATE <i className="fa-solid fa-download ml-2 hidden sm:inline"></i>
                    </button>
                    <label className="flex-1">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            try {
                              const data = JSON.parse(ev.target?.result || '{}');
                              const success = await onRestore(data);
                              if (success) alert("CORE RESTORED: Nexus state has been updated to provided parameters.");
                            } catch (err) { alert("RESTORE FAILED: Data corruption detected in uploaded matrix."); }
                          };
                          reader.readAsText(file);
                        }}
                      />
                      <div className="h-full py-3 md:py-4 glass border border-pink/20 text-pink font-orbitron font-black text-[9px] md:text-xs uppercase tracking-widest hover:bg-pink hover:text-white transition-all text-center cursor-pointer flex items-center justify-center gap-2">
                        RESTORE STATE <i className="fa-solid fa-upload hidden sm:inline"></i>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeView !== 'dashboard' && activeView !== 'logs' && activeView !== 'players' && (
              <div className="bg-bg-card rounded-2xl border border-white/5 overflow-hidden animate-fade-in shadow-2xl">
                <div className="p-4 md:p-6 border-b border-white/5 flex flex-col gap-4">
                  <div className="relative w-full flex-grow">
                    <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
                    <input
                      type="text"
                      placeholder={`Search nexus ${activeView}...`}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white font-medium focus:border-primary outline-none transition-all placeholder:text-gray-700 text-sm"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-wrap">
                    {activeView === 'registrations' && (
                      <button
                        onClick={refreshRegistrations}
                        disabled={isRefreshingRegistrations}
                        className={`px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-orbitron font-bold uppercase tracking-widest transition-all border flex-shrink-0 ${isRefreshingRegistrations ? 'bg-white/10 text-gray-400 border-white/10 cursor-not-allowed' : 'bg-tertiary/20 text-tertiary border-tertiary/30 hover:bg-tertiary hover:text-dark'}`}
                      >
                        <i className={`fa-solid ${isRefreshingRegistrations ? 'fa-spinner fa-spin' : 'fa-rotate-right'} mr-1`}></i>
                        {isRefreshingRegistrations ? 'Refreshing...' : 'Refresh'}
                      </button>
                    )}
                    {['all', 'freefire', 'pubg', 'ludo'].map(g => (
                      <button
                        key={g}
                        onClick={() => setFilterGame(g)}
                        className={`px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-orbitron font-bold uppercase tracking-widest transition-all flex-shrink-0 ${filterGame === g ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-gray-500 border border-transparent hover:border-white/20'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {activeView === 'registrations' && (
                  <div className="p-4 md:p-6 bg-white/2 border-b border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/10">
                      <div className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Teams</div>
                      <div className="text-2xl md:text-3xl font-orbitron font-black text-primary">{registrations.length}</div>
                    </div>
                    <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/10">
                      <div className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">After Filters</div>
                      <div className="text-2xl md:text-3xl font-orbitron font-black text-tertiary">{filteredList.length}</div>
                    </div>
                    {(search || filterGame !== 'all') && (
                      <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/10">
                        <div className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Hidden Records</div>
                        <div className="text-2xl md:text-3xl font-orbitron font-black text-gray-400">{registrations.length - filteredList.length}</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-white/2 text-[9px] md:text-[10px] font-orbitron text-gray-500 uppercase tracking-widest">
                        <th className="p-4 md:p-6">Nexus Entity</th>
                        <th className="p-4 md:p-6">Sector Metadata</th>
                        <th className="p-4 md:p-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredList.map((item) => (
                        <tr key={item.id} className="hover:bg-white/2 transition-colors">
                          <td className="p-4 md:p-6">
                            <div className="flex items-center gap-2 md:gap-4">
                              {item.image || item.avatar || item.team_logo ? (
                                <img src={item.image || item.avatar || item.team_logo} className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover border border-white/10 flex-shrink-0" alt="" />
                              ) : (
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 flex-shrink-0">
                                  <i className="fa-solid fa-id-badge text-gray-700"></i>
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-white font-bold text-sm md:text-base line-clamp-1">{item.title || item.team_name || item.teamname || item.playername}</div>
                                <div className="text-gray-500 text-[8px] md:text-[10px] font-bold uppercase tracking-widest truncate">
                                  {item.game || item.type || (activeView === 'registrations' ? `Sector: ${item.tournamenttitle}` : 'System Data')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 md:p-6">
                            <div className="text-[8px] md:text-xs space-y-0.5 md:space-y-1">
                              {item.prize && <div className="text-primary font-bold">Reward: {item.prize}</div>}
                              {item.maxSlots && <div className="text-gray-400">Slots: {item.max_slots}</div>}
                              {activeView === 'leaderboard' && <div className="text-accent font-bold">Rank: {item.rank || '-'} | Points: {item.points || 0} | K: {item.kills || 0} | W: {item.wins || 0}</div>}
                              {item.date && <div className="text-gray-400">Deploy: {item.date}</div>}
                              {(item.gameuid || item.team_tag) && (
                                <div className="space-y-0.5">
                                  <div className="text-white font-bold">{item.team_tag ? `Tag: ${item.team_tag}` : `UID: ${item.gameuid}`}</div>
                                  <div className="text-gray-500 text-[7px] md:text-[9px] truncate max-w-[150px]">{item.registrar_email || item.playeremail}</div>
                                </div>
                              )}
                              {item.manager_contact && (
                                <div className="text-gray-300">
                                  Contact: <span className="text-white font-bold">{item.manager_contact}</span>
                                </div>
                              )}
                              {item.youtubeid && <div className="text-accent font-bold flex items-center gap-1"><i className="fab fa-youtube"></i> {item.youtubeid}</div>}
                              {activeView === 'registrations' && (
                                <div className={`font-bold flex items-center gap-1 ${isSmsSent(item) ? 'text-[#25D366]' : 'text-yellow-400'}`}>
                                  <i className={`fa-solid ${isSmsSent(item) ? 'fa-circle-check' : 'fa-signal'}`}></i>
                                  SMS: {isSmsSent(item) ? 'SENT' : 'PENDING'}
                                </div>
                              )}
                              {activeView === 'registrations' && (
                                <div className="text-gray-300">
                                  Age: <span className="text-white font-bold">{item.Player_Age || item.playerage || 'N/A'}</span>
                                </div>
                              )}
                              {activeView === 'registrations' && (
                                <div className="text-gray-300">
                                  Promo: <span className="text-primary font-bold">{item.Promo_Code || item.promo_code || 'N/A'}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 md:p-6 text-right">
                            <div className="flex justify-end gap-1 md:gap-2">
                              {activeView === 'tournaments' && (
                                <button
                                  onClick={() => { setActiveView('registrations'); setSearch(item.title); }}
                                  title="View Enlistments"
                                  className="w-8 h-8 md:w-10 md:h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-tertiary hover:bg-tertiary hover:text-dark transition-all flex-shrink-0"
                                >
                                  <i className="fa-solid fa-users-viewfinder text-xs md:text-sm"></i>
                                </button>
                              )}
                              {activeView === 'registrations' && (
                                <button
                                  onClick={() => setViewingReg(item)}
                                  title="View Dossier"
                                  className="w-8 h-8 md:w-10 md:h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-primary hover:bg-primary hover:text-dark transition-all flex-shrink-0"
                                >
                                  <i className="fa-solid fa-address-card text-xs md:text-sm"></i>
                                </button>
                              )}
                              {activeView !== 'registrations' && (
                                <button onClick={() => startEdit(item)} className="w-8 h-8 md:w-10 md:h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-primary hover:bg-primary hover:text-dark transition-all flex-shrink-0">
                                  <i className="fa-solid fa-pen-to-square text-xs md:text-sm"></i>
                                </button>
                              )}
                              <button onClick={() => handleDelete(item.id)} className="w-8 h-8 md:w-10 md:h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-pink hover:bg-pink hover:text-white transition-all flex-shrink-0">
                                <i className="fa-solid fa-trash-can text-xs md:text-sm"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeView === 'players' && (
              <PlayerStatsAdmin registrations={registrations} />
            )}

            {activeView === 'requests' && (
              renderRequests()
            )}

            {activeView === 'logs' && (
              <div className="bg-bg-card rounded-2xl border border-white/5 p-4 md:p-8 animate-fade-in shadow-2xl">
                <h3 className="text-lg md:text-xl font-orbitron font-black text-white uppercase tracking-widest mb-6">Nexus System Logs</h3>
                <div className="space-y-2 md:space-y-4 max-h-[400px] md:max-h-[600px] overflow-y-auto pr-4 custom-scrollbar font-mono text-[9px] md:text-[10px]">
                  {systemLogs.length === 0 && (
                    <div className="p-4 bg-white/2 border border-white/5 rounded-lg text-gray-500 uppercase tracking-widest text-center">
                      No logs available yet
                    </div>
                  )}
                  {systemLogs.map(log => {
                    const logTimestamp = log.timestamp || log.created_at || 'N/A';
                    const logMethod = log.method || log.http_method || 'INFO';
                    const logEndpoint = log.endpoint || log.path || log.route || 'Unknown endpoint';

                    return (
                      <div key={log.id} className="p-3 md:p-4 bg-white/2 border-l-4 border-primary/40 rounded-r-lg flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-4 group hover:bg-white/5 transition-all">
                        <div className="flex flex-col gap-1 md:gap-0 md:flex-row md:items-center md:gap-4 min-w-0">
                          <span className="text-gray-600 truncate">[{logTimestamp}]</span>
                          <span className={`font-black uppercase tracking-wider flex-shrink-0 ${logMethod === 'POST' ? 'text-tertiary' : logMethod === 'PUT' ? 'text-primary' : 'text-accent'}`}>{logMethod}</span>
                          <span className="text-white truncate">{logEndpoint}</span>
                        </div>
                        <span className="text-tertiary font-bold flex-shrink-0">200_OK</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 xl:col-span-4">
            {['tournaments', 'leaderboard', 'streams'].includes(activeView) && (
              <div className="bg-bg-card p-6 md:p-8 rounded-2xl border border-primary/20 lg:sticky lg:top-24 shadow-2xl animate-fade-in max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6 md:mb-8 gap-4">
                  <h2 className="text-lg md:text-xl font-orbitron font-black text-white uppercase tracking-widest">
                    {editingId ? 'Modify Record' : 'Create Record'}
                  </h2>
                  {editingId && (
                    <button onClick={resetForms} className="text-pink font-bold text-[9px] md:text-[10px] uppercase hover:underline tracking-widest flex-shrink-0">ABORT EDIT</button>
                  )}
                </div>

                {activeView === 'tournaments' && (
                  <form onSubmit={handleSaveTournament} className="space-y-4 md:space-y-6">
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Sector Game</label>
                        <select
                          className="w-full bg-black border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-[9px] md:text-[10px] font-bold uppercase"
                          value={tourneyForm.type}
                          onChange={e => {
                            const newType = e.target.value;
                            const defaultSize = newType === 'pubg' ? 5 : (newType === 'freefire' ? 4 : 1);
                            setTourneyForm({ ...tourneyForm, type: newType, team_size: defaultSize });
                          }}
                        >
                          <option value="freefire">Free Fire</option>
                          <option value="pubg">PUBG Mobile</option>
                          <option value="ludo">Ludo King</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Max Slots</label>
                        <input
                          type="number"
                          className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs"
                          value={tourneyForm.max_slots}
                          onChange={e => setTourneyForm({ ...tourneyForm, max_slots: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Team Size</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs"
                          value={tourneyForm.team_size || 4}
                          onChange={e => setTourneyForm({ ...tourneyForm, team_size: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Operational Title</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs font-bold"
                        placeholder="Mission Name..."
                        value={tourneyForm.title}
                        onChange={e => setTourneyForm({ ...tourneyForm, title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Tournament Banner URL</label>
                      <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-[9px] md:text-[10px] mb-2 font-mono"
                        placeholder="https://image-link.com/banner.jpg"
                        value={tourneyForm.image}
                        onChange={e => setTourneyForm({ ...tourneyForm, image: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Mission Date</label>
                        <input
                          type="date"
                          className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs"
                          placeholder="Dec 15, 2025"
                          value={tourneyForm.date}
                          onChange={e => setTourneyForm({ ...tourneyForm, date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Time (PST/NST)</label>
                        <input
                          type="text"
                          className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs"
                          placeholder="07:00 PM"
                          value={tourneyForm.time}
                          onChange={e => setTourneyForm({ ...tourneyForm, time: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Reg Start Date</label>
                        <input
                          type="date"
                          className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs"
                          value={tourneyForm.registration_start_date || ''}
                          onChange={e => setTourneyForm({ ...tourneyForm, registration_start_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Reg End Date</label>
                        <input
                          type="date"
                          className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs"
                          value={tourneyForm.registration_end_date || ''}
                          onChange={e => setTourneyForm({ ...tourneyForm, registration_end_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Sector Location</label>
                      <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs"
                        placeholder="Nepal / Bermuda"
                        value={tourneyForm.location}
                        onChange={e => setTourneyForm({ ...tourneyForm, location: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Sector Intel (Description)</label>
                      <textarea
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs font-rajdhani"
                        placeholder="Mission Briefing..."
                        value={tourneyForm.description}
                        onChange={e => setTourneyForm({ ...tourneyForm, description: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Total Prize</label>
                        <input
                          type="text"
                          className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs"
                          value={tourneyForm.prize}
                          onChange={e => setTourneyForm({ ...tourneyForm, prize: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Entry Fee</label>
                        <input
                          type="text"
                          className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs"
                          value={tourneyForm.entry_fee}
                          onChange={e => setTourneyForm({ ...tourneyForm, entry_fee: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-5 space-y-4">
                      <h4 className="text-sm font-orbitron font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <i className="fa-solid fa-lock-open text-primary"></i> Registration Configuration
                      </h4>

                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <div>
                          <div className="text-white font-bold text-xs md:text-sm uppercase tracking-widest">Login Required</div>
                          <div className="text-[8px] md:text-[9px] text-gray-500 uppercase font-bold tracking-widest mt-0.5">Users must authenticate before registration</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTourneyForm({ ...tourneyForm, login_required: !tourneyForm.login_required })}
                          className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${tourneyForm.login_required ? 'bg-primary shadow-[0_0_10px_rgba(0,212,255,0.5)]' : 'bg-gray-800'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${tourneyForm.login_required ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Payment Method</label>
                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                          <button
                            type="button"
                            onClick={() => setTourneyForm({ ...tourneyForm, payment_type: 'tgc_coin', login_required: true })}
                            className={`p-3 md:p-4 rounded-xl border transition-all text-center ${
                              tourneyForm.payment_type === 'tgc_coin'
                                ? 'bg-primary/20 border-primary text-primary'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                          >
                            <i className="fa-solid fa-coins text-lg md:text-2xl mb-2 block"></i>
                            <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest">TGC Coin</div>
                            <div className="text-[7px] md:text-[8px] text-gray-500 mt-1">Requires Login</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTourneyForm({ ...tourneyForm, payment_type: 'direct_payment' })}
                            className={`p-3 md:p-4 rounded-xl border transition-all text-center ${
                              tourneyForm.payment_type === 'direct_payment'
                                ? 'bg-pink/20 border-pink text-pink'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                          >
                            <i className="fa-solid fa-credit-card text-lg md:text-2xl mb-2 block"></i>
                            <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Direct Payment</div>
                            <div className="text-[7px] md:text-[8px] text-gray-500 mt-1">Guest OK</div>
                          </button>
                        </div>
                      </div>

                      <div className="p-2 md:p-3 bg-white/2 rounded-lg border border-white/5">
                        <p className="text-[7px] md:text-[8px] text-gray-400 leading-relaxed">
                          <i className="fa-solid fa-circle-info text-primary mr-1"></i>
                          <strong>Rules:</strong> If <strong>TGC Coin</strong> is selected, login is enforced. If <strong>Direct Payment</strong> is selected, login can be disabled for guest registration.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">External Registration URL</label>
                      <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs font-mono"
                        placeholder="https://docs.google.com/..."
                        value={tourneyForm.registration_url}
                        onChange={e => setTourneyForm({ ...tourneyForm, registration_url: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Primary Stream ID</label>
                      <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs font-mono"
                        placeholder="YouTube Video ID"
                        value={tourneyForm.stream_id}
                        onChange={e => setTourneyForm({ ...tourneyForm, stream_id: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Prize Breakdown</label>
                      {(tourneyForm.prize_breakdown || []).map((row, idx) => (
                        <div key={idx} className="flex gap-2 mb-2 group/row">
                          <input
                            placeholder="Position"
                            className="flex-1 bg-white/5 border border-white/10 p-2 rounded text-[9px] md:text-[10px] text-white outline-none focus:border-primary"
                            value={row.position}
                            onChange={(e) => updatePrizeBreakdown(idx, 'position', e.target.value)}
                          />
                          <input
                            placeholder="Reward"
                            className="flex-1 bg-white/5 border border-white/10 p-2 rounded text-[9px] md:text-[10px] text-white outline-none focus:border-primary"
                            value={row.reward}
                            onChange={(e) => updatePrizeBreakdown(idx, 'reward', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removePrizeRow(idx)}
                            className="text-pink hover:text-white transition-colors px-2"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={addPrizeRow} className="text-[8px] md:text-[9px] text-primary uppercase font-bold hover:underline tracking-widest">+ Add Reward Tier</button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Deployment Rules (One per line)</label>
                      <textarea
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs custom-scrollbar"
                        value={tourneyForm.rules?.join('\n')}
                        onChange={e => setTourneyForm({ ...tourneyForm, rules: e.target.value.split('\n') })}
                      />
                    </div>

                    <button type="submit" className="w-full py-4 md:py-5 bg-primary text-dark font-orbitron font-black text-xs md:text-sm uppercase tracking-[0.3em] cyber-button shadow-[0_0_20px_rgba(0,212,255,0.2)]">
                      {editingId ? 'COMMIT UPDATES' : 'DEPLOY SECTOR'}
                    </button>
                  </form>
                )}

                {activeView === 'leaderboard' && (
                  <form onSubmit={handleSaveLeaderboard} className="space-y-4 md:space-y-6">
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Target Game</label>
                        <select
                          className="w-full bg-black border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-[9px] md:text-[10px] font-bold uppercase"
                          value={lbForm.game}
                          onChange={e => setLbForm({ ...lbForm, game: e.target.value })}
                        >
                          <option value="freefire">Free Fire</option>
                          <option value="pubg">PUBG Mobile</option>
                          <option value="ludo">Ludo King</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Squad Identity</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs font-bold"
                          placeholder="Team Name..."
                          value={lbForm.teamname}
                          onChange={e => setLbForm({ ...lbForm, teamname: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Player Image / Avatar URL</label>
                      <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-[9px] md:text-[10px] mb-2 font-mono"
                        placeholder="https://i.pravatar.cc/150?u=team"
                        value={lbForm.avatar}
                        onChange={e => setLbForm({ ...lbForm, avatar: e.target.value })}
                      />
                      {lbForm.avatar && (
                        <div className="flex justify-center">
                          <img src={lbForm.avatar} className="w-14 h-14 md:w-16 md:h-16 rounded-lg border border-white/10 object-cover" alt="Avatar Preview" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Rank</label>
                        <input
                          type="number"
                          className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs"
                          value={lbForm.rank === 0 ? '' : lbForm.rank}
                          onChange={e => setLbForm({ ...lbForm, rank: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Neutralized</label>
                        <input
                          type="number"
                          className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs"
                          value={lbForm.kills}
                          onChange={e => setLbForm({ ...lbForm, kills: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Wins</label>
                        <input
                          type="number"
                          className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs"
                          value={lbForm.wins}
                          onChange={e => setLbForm({ ...lbForm, wins: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Total XP</label>
                        <input
                          type="number"
                          className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs"
                          value={lbForm.points}
                          onChange={e => setLbForm({ ...lbForm, points: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <button type="submit" className="w-full py-4 md:py-5 bg-primary text-dark font-orbitron font-black text-xs md:text-sm uppercase tracking-[0.3em] cyber-button">
                      {editingId ? 'UPDATE RANKING' : 'INITIALIZE RANKING'}
                    </button>
                  </form>
                )}

                {activeView === 'streams' && (
                  <form onSubmit={handleSaveStream} className="space-y-4 md:space-y-6">
                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">Feed Title</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs"
                        placeholder="LIVE: Nexus Finals..."
                        value={streamForm.title}
                        onChange={e => setStreamForm({ ...streamForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">YouTube ID or Full Link</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white/5 border border-white/10 p-2 md:p-3 rounded-xl text-white outline-none focus:border-primary transition-all text-xs font-mono"
                        placeholder="e.g. bCcaErhe8as or full URL"
                        value={streamForm.youtubeid}
                        onChange={e => setStreamForm({ ...streamForm, youtubeid: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-4 p-3 md:p-4 glass rounded-xl border border-white/5">
                      <div className="flex-grow">
                        <div className="text-white font-bold text-xs uppercase tracking-widest">Deployment Status</div>
                        <div className="text-[8px] md:text-[9px] text-gray-500 uppercase font-black tracking-widest">{streamForm.islive ? 'Online Broadcast' : 'Archived Feed'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStreamForm({ ...streamForm, islive: !streamForm.islive })}
                        className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${streamForm.islive ? 'bg-tertiary shadow-[0_0_10px_#00ff80]' : 'bg-gray-800'}`}
                      >
                        <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${streamForm.islive ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>

                    <button type="submit" className="w-full py-4 md:py-5 bg-primary text-dark font-orbitron font-black text-xs md:text-sm uppercase tracking-[0.3em] cyber-button">
                      {editingId ? 'UPDATE BROADCAST' : 'ESTABLISH FEED'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Viewing Registration Modal */}
      {viewingReg && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-bg-dark/90 backdrop-blur-md" onClick={() => setViewingReg(null)}></div>
          <div className="relative w-full max-w-lg bg-bg-card p-6 md:p-12 rounded-2xl border border-primary/30 shadow-[0_0_50px_rgba(0,212,255,0.2)] animate-fade-in my-8">
            <button onClick={() => setViewingReg(null)} className="absolute top-4 md:top-6 right-4 md:right-6 text-gray-500 hover:text-white transition-colors">
              <i className="fa-solid fa-xmark text-lg md:text-xl"></i>
            </button>

            <div className="text-center mb-8 md:mb-10">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <i className="fa-solid fa-user-ninja text-2xl md:text-3xl text-primary"></i>
              </div>
              <h2 className="text-xl md:text-2xl font-orbitron font-black text-white uppercase tracking-tight">Personnel <span className="text-primary">Dossier</span></h2>
              <p className="text-[9px] md:text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Classification: Confidential</p>
            </div>

            <div className="space-y-4 md:space-y-6 font-rajdhani">
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1">
                  <span className="text-[8px] md:text-[9px] text-gray-600 font-black uppercase tracking-widest block">Warrior Alias</span>
                  <span className="text-white text-base md:text-lg font-bold break-words">{viewingReg.playername}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] md:text-[9px] text-gray-600 font-black uppercase tracking-widest block">System UID</span>
                  <span className="text-white text-sm md:text-lg font-mono font-bold break-all">{viewingReg.gameuid}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1">
                  <span className="text-[8px] md:text-[9px] text-gray-600 font-black uppercase tracking-widest block">Player Age</span>
                  <span className="text-white text-base md:text-lg font-bold">{viewingReg.Player_Age || viewingReg.playerage || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] md:text-[9px] text-gray-600 font-black uppercase tracking-widest block">Promo Code</span>
                  <span className="text-white text-sm md:text-lg font-mono font-bold break-all">{viewingReg.Promo_Code || viewingReg.promo_code || 'N/A'}</span>
                </div>
              </div>

              <div className="p-3 md:p-4 bg-white/2 border border-white/5 rounded-xl space-y-3 md:space-y-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                  <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest">Comm-Link</span>
                  <span className="text-primary font-bold text-sm break-all">{viewingReg.playeremail}</span>
                </div>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                  <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest">WhatsApp Uplink</span>
                  <span className="text-accent font-bold text-sm break-all">{viewingReg.playercontact}</span>
                </div>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                  <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest">SMS Signal</span>
                  <span className={`font-bold flex items-center gap-2 ${isSmsSent(viewingReg) ? 'text-[#25D366]' : 'text-yellow-400'}`}>
                    <i className={`fa-solid ${isSmsSent(viewingReg) ? 'fa-circle-check' : 'fa-signal'}`}></i>
                    {isSmsSent(viewingReg) ? 'SENT' : 'PENDING'}
                  </span>
                </div>
              </div>

              <div className="p-3 md:p-4 bg-white/2 border border-white/5 rounded-xl space-y-3 md:space-y-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                  <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest">Assigned Arena</span>
                  <span className="text-white font-bold text-sm break-words">{viewingReg.tournamenttitle}</span>
                </div>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                  <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest">Enlistment Date</span>
                  <span className="text-gray-400 text-sm break-words">{new Date(viewingReg.registrationdate).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 md:mt-10">
              {whatsAppSentMap[getRegistrationMessageKey(viewingReg)] && (
                <div className="mb-3 text-[9px] md:text-[10px] text-[#25D366] font-orbitron font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  <i className="fa-solid fa-circle-check"></i>
                  MESSAGE MARKED AS SENT
                </div>
              )}
              <div className="flex flex-col gap-3 mb-3">
                <button
                  onClick={() => sendRegistrationWhatsApp(viewingReg)}
                  className={`w-full py-3 md:py-4 text-white font-orbitron font-black text-[9px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${whatsAppSentMap[getRegistrationMessageKey(viewingReg)] ? 'bg-[#1daa50]' : 'bg-[#25D366] hover:brightness-110'}`}
                >
                  <i className={`${whatsAppSentMap[getRegistrationMessageKey(viewingReg)] ? 'fa-solid fa-circle-check' : 'fa-brands fa-whatsapp'} text-base md:text-lg`}></i>
                  {whatsAppSentMap[getRegistrationMessageKey(viewingReg)] ? 'WA SENT' : 'WHATSAPP MSG'}
                </button>
              </div>
              <button
                onClick={() => setViewingReg(null)}
                className="w-full py-3 md:py-4 bg-primary text-dark font-orbitron font-black text-[9px] md:text-xs uppercase tracking-widest hover:bg-white transition-all"
              >
                ACKNOWLEDGE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default AdminPanel;
