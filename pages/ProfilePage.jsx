import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import PlayerBalance from '../components/PlayerBalance';

const ProfilePage = ({ tournaments, registrations, leaderboard }) => {
  const { user, profile, loading, loginWithGoogle, logout, reloadProfile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('deployments');
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    game_uid: '',
    promo_code: '',
    contact_info: ''
  });
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Sync profile details with form inputs
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        age: profile.age || '',
        game_uid: profile.game_uid || '',
        promo_code: profile.promo_code || '',
        contact_info: profile.contact_info || ''
      });
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="pt-32 pb-24 text-center min-h-[80vh] flex flex-col justify-center items-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4"></div>
        <p className="font-orbitron font-black text-gray-500 uppercase tracking-widest text-sm animate-pulse">Syncing Player Data...</p>
      </div>
    );
  }

  // Not Logged In View
  if (!user) {
    return (
      <div className="pt-32 pb-24 px-4 bg-bg-dark min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div
          className="glass p-8 md:p-12 rounded-2xl max-w-lg w-full text-center relative border border-primary/10"
          style={{ boxShadow: '0 0 50px rgba(0,212,255,0.05)' }}
        >
          <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-center mx-auto mb-6 relative">
            <i className="fa-solid fa-lock text-2xl text-primary animate-pulse"></i>
            <div className="absolute -inset-1 bg-primary/20 blur-md rounded-2xl -z-10"></div>
          </div>

          <h1 className="text-2xl md:text-3xl font-orbitron font-black text-white uppercase tracking-tight mb-3">
            SECTOR <span className="text-primary">RESTRICTED</span>
          </h1>
          <p className="text-gray-400 font-rajdhani text-base md:text-lg mb-8 leading-relaxed uppercase tracking-wider">
            Warrior authentication is required to access the profile dashboard. Connect your account to enter.
          </p>

          <button
            onClick={loginWithGoogle}
            className="w-full py-4 px-6 bg-primary text-dark font-orbitron font-black text-sm uppercase tracking-widest transition-all duration-300 relative overflow-hidden group cursor-pointer"
            style={{
              clipPath: 'polygon(6% 0, 100% 0, 100% 70%, 94% 100%, 0 100%, 0 30%)',
              boxShadow: '0 0 25px rgba(0, 212, 255, 0.3)',
            }}
          >
            <span className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
            <span className="flex items-center justify-center gap-3">
              <i className="fa-brands fa-google text-lg"></i>
              <span>AUTHENTICATE WITH GOOGLE</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Get user's registered tournaments (matching email or full name)
  const userEmail = user.email ? user.email.toLowerCase() : '';
  const myRegistrations = (Array.isArray(registrations) ? registrations : []).filter(reg => {
    return reg.playeremail?.toLowerCase() === userEmail;
  });

  // Calculate stats
  const totalTournaments = myRegistrations.length;
  const activeSectors = myRegistrations.filter(reg => {
    const parentT = (tournaments || []).find(t => String(t.id) === String(reg.tournamentid));
    if (!parentT) return false;
    const now = new Date();
    const endD = parentT.registration_end_date ? new Date(parentT.registration_end_date) : null;
    return !endD || now <= endD;
  }).length;

  // Lookup in leaderboard to see achievements/points
  const leaderEntry = (Array.isArray(leaderboard) ? leaderboard : []).find(entry => {
    return entry.teamname?.toLowerCase() === profile?.full_name?.toLowerCase() ||
      entry.teamname?.toLowerCase() === user?.user_metadata?.full_name?.toLowerCase();
  });

  const playerPoints = profile?.combat_score || leaderEntry?.points || 0;
  const playerRank = profile?.rank || leaderEntry?.rank || 'N/A';
  const playerKills = profile?.total_kills || leaderEntry?.kills || 0;
  const playerID = profile?.player_id || 'N/A';



  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setSuccessMsg('');
    setErrorMsg('');

    if (!formData.full_name.trim() || !formData.age || !formData.contact_info.trim()) {
      setErrorMsg('All credential fields are mandatory.');
      setUpdating(false);
      return;
    }


    const ageNum = parseInt(formData.age);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      setErrorMsg('Please enter a valid age (10-100).');
      setUpdating(false);
      return;
    }

    const profileData = {
      email: user.email,
      full_name: formData.full_name.trim(),
      avatar_url: user.user_metadata?.avatar_url || '',
      age: ageNum,
      game_uid: profile?.game_uid || '',
      rank: profile?.rank || 'UNRANKED',
      total_kills: profile?.total_kills || 0,
      combat_score: profile?.combat_score || 0,
      promo_code: formData.promo_code.trim() || '',
      contact_info: formData.contact_info.trim()
    };



    const { error } = await authService.createProfile(user.id, profileData);
    if (error) {
      setErrorMsg('Failed to update credentials: ' + error.message);
    } else {
      setSuccessMsg('Warrior credentials saved successfully!');
      await reloadProfile();
    }
    setUpdating(false);
  };

  const generatepromo_code = () => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const generatedCode = `TAIG${randomCode}`;
    console.log('Generated Promo Code:', generatedCode);
    setFormData({ ...formData, promo_code: generatedCode });
  };



  return (
    <div className="pt-24 md:pt-32 pb-24 bg-bg-dark min-h-screen">
      <div className="container mx-auto px-4 max-w-6xl">

        {/* ─── Profile Header / Hero ─── */}
        <div
          className="glass p-6 md:p-10 rounded-2xl border border-white/5 relative overflow-hidden mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 19, 0.95) 0%, rgba(7, 7, 9, 0.98) 100%)',
          }}
        >
          {/* Cyber accents */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 relative z-10">
            {/* Avatar block */}
            <div className="relative">
              {profile?.avatar_url || user.user_metadata?.avatar_url ? (
                <img
                  src={profile?.avatar_url || user.user_metadata?.avatar_url}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border border-primary/20 ring-4 ring-primary/10 shadow-2xl"
                  alt="Avatar"
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center font-orbitron font-black text-3xl text-primary bg-primary/10 border border-primary/20 ring-4 ring-primary/10 shadow-2xl">
                  {profile?.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Online pulse */}
              <div
                className="absolute -bottom-1 -right-1 bg-tertiary px-2 py-0.5 rounded text-[8px] font-orbitron font-bold text-dark flex items-center gap-1 border-2 border-bg-dark"
                style={{ boxShadow: '0 0 10px #00ff80' }}
              >
                <span className="w-1.5 h-1.5 bg-dark rounded-full animate-ping"></span>
                ACTIVE
              </div>
            </div>

            {/* Profile Info details */}
            <div className="flex-1 text-center md:text-left space-y-2 mt-2">
              <span className="text-primary font-orbitron font-bold text-xs uppercase tracking-[0.3em] block">
                PLAYER STATUS SHEET
              </span>
              <h1 className="text-3xl md:text-5xl font-orbitron font-black text-white uppercase tracking-tighter">
                {profile?.full_name || user.user_metadata?.full_name || 'Player One'}
              </h1>
              <p className="text-gray-400 font-rajdhani text-sm md:text-base flex flex-wrap justify-center md:justify-start items-center gap-2">
                <span>{user.email}</span>
                <span className="text-white/10 hidden md:inline">|</span>
                <span className="text-gray-500 uppercase tracking-widest font-orbitron text-xs">
                  Age: {profile?.age || 'Unset'}
                </span>
              </p>

              {/* Player ID */}

              <div className="flex items-center gap-1 mt-1 justify-center md:justify-start">
                <div className="px-3 py-2 bg-white/5 border border-primary/20 rounded-lg inline-block">
                  <span className="text-[9px] font-orbitron font-bold uppercase tracking-wider text-gray-400">Player ID: </span>
                  <span className="text-[10px] font-mono font-bold text-primary">{playerID}</span>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(playerID)}
                  className=" text-[9px] px-3 py-2 bg-white/5 border-primary/20 rounded hover:bg-primary hover:text-gray-900 font-orbitron font-bold uppercase tracking-wider text-gray-400 hover:text-primary transition-colors"
                >
                  Copy <i className="fa-regular fa-copy"></i>
                </button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-3">
                <span className="px-3 py-1 bg-white/5 border border-white/10 text-[9px] font-orbitron font-bold uppercase tracking-wider text-gray-300 rounded">
                  <i className="fa-solid fa-crown text-accent mr-1.5"></i> Rank {playerRank}
                </span>
                <span className="px-3 py-1 bg-white/5 border border-white/10 text-[9px] font-orbitron font-bold uppercase tracking-wider text-gray-300 rounded">
                  <i className="fa-solid fa-award text-primary mr-1.5"></i> {playerPoints} pts
                </span>
                <span className="px-3 py-1 bg-white/5 border border-white/10 text-[9px] font-orbitron font-bold uppercase tracking-wider text-gray-300 rounded">
                  <i className="fa-solid fa-gun text-pink mr-1.5"></i> {playerKills} Kills
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Profile Stats Dashboard grid ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'ARENA ENTRIES', val: totalTournaments, icon: 'fa-trophy', color: 'text-primary' },
            { label: 'ACTIVE SECTORS', val: activeSectors, icon: 'fa-crosshairs', color: 'text-tertiary' },
            { label: 'LEADERBOARD RANK', val: playerRank === 'N/A' ? '-' : `#${playerRank}`, icon: 'fa-crown', color: 'text-accent' },
            { label: 'COMBAT POINTS', val: playerPoints, icon: 'fa-bolt', color: 'text-pink' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="glass p-5 rounded-xl border border-white/5 flex items-center justify-between group hover:border-white/10 transition-colors"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-orbitron font-bold text-gray-500 uppercase tracking-widest block">
                  {stat.label}
                </span>
                <span className="text-xl md:text-xl font-orbitron font-black text-white block leading-none">
                  {stat.val}
                </span>
              </div>
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform`}>
                <i className={`fa-solid ${stat.icon} ${stat.color} text-base md:text-lg`}></i>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Main Content Tabs ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Tab buttons / selector sidebar */}
          <div className="lg:col-span-3 space-y-2">
            {[
              { id: 'wallet', label: 'Wallet', desc: 'Balance & membership', icon: 'fa-wallet' },
              { id: 'deployments', label: 'Deployments', desc: 'Registered scrims', icon: 'fa-shield-halved' },
              { id: 'credentials', label: 'Credentials', desc: 'Update profile sheet', icon: 'fa-sliders' },
              { id: 'achievements', label: 'Achievements', desc: 'Acquired rank titles', icon: 'fa-medal' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSuccessMsg(''); setErrorMsg(''); }}
                className="w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 group cursor-pointer"
                style={{
                  background: activeTab === tab.id
                    ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 212, 255, 0.02) 100%)'
                    : 'rgba(255, 255, 255, 0.02)',
                  borderColor: activeTab === tab.id ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  boxShadow: activeTab === tab.id ? '0 0 20px rgba(0, 212, 255, 0.05)' : 'none',
                }}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${activeTab === tab.id
                    ? 'bg-primary/20 border border-primary/30 text-primary shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                    : 'bg-white/5 border border-white/10 text-gray-500 group-hover:text-gray-300'
                    }`}
                >
                  <i className={`fa-solid ${tab.icon} text-sm`}></i>
                </div>
                <div className="flex-1">
                  <span className={`font-orbitron font-bold text-xs uppercase tracking-wider block transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-gray-300 group-hover:text-white'
                    }`}>
                    {tab.label}
                  </span>
                  <span className="text-[9px] font-rajdhani text-gray-500 uppercase tracking-widest block mt-0.5">
                    {tab.desc}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Tab content panel */}
          <div className="lg:col-span-9 glass p-6 md:p-10 rounded-2xl border border-white/5 min-h-[400px]">

            {/* ─── TAB 0: Wallet / Balance ─── */}
            {activeTab === 'wallet' && (
              <PlayerBalance />
            )}

            {/* ─── TAB 1: Deployments ─── */}
            {activeTab === 'deployments' && (
              <div className="space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <h3 className="font-orbitron font-bold text-xl text-white uppercase tracking-tight">
                    ACTIVE SCRIMS & TOURNAMENTS
                  </h3>
                  <p className="text-gray-500 font-rajdhani text-xs uppercase tracking-widest mt-1">
                    Your active sectors in competitive brackets
                  </p>
                </div>

                {myRegistrations.length === 0 ? (
                  <div className="py-16 text-center">
                    <i className="fa-solid fa-gamepad text-gray-600 text-4xl mb-4 block animate-bounce"></i>
                    <p className="font-orbitron font-bold text-gray-400 uppercase tracking-wide">NO ACTIVE DEPLOYMENTS</p>
                    <p className="text-gray-500 font-rajdhani text-sm mt-1 max-w-sm mx-auto leading-relaxed">
                      You are currently not deployed in any arena sectors. Enter the arena index and secure your slot!
                    </p>
                    <Link
                      to="/tournaments"
                      className="mt-6 inline-block px-8 py-3 bg-primary text-dark font-orbitron font-black text-xs uppercase tracking-widest cyber-button"
                    >
                      ENTER TOURNAMENTS
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myRegistrations.map((reg) => {
                      const parentT = (tournaments || []).find(t => String(t.id) === String(reg.tournamentid));

                      return (
                        <div
                          key={reg.id}
                          className="bg-bg-dark border border-white/5 p-4 rounded-xl relative overflow-hidden flex flex-col justify-between group hover:border-primary/20 transition-all duration-300"
                        >
                          <div className="space-y-3">
                            {parentT?.image && (
                              <div className="h-24 w-full rounded-lg overflow-hidden relative">
                                <img src={parentT.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="scrim" />
                                <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent"></div>
                                <span className="absolute top-2 left-2 px-2.5 py-0.5 bg-primary/10 border border-primary/20 text-primary font-orbitron text-[8px] uppercase tracking-wider rounded">
                                  {parentT.game}
                                </span>
                              </div>
                            )}

                            <div>
                              <h4 className="font-orbitron font-black text-white text-sm uppercase tracking-tight truncate">
                                {reg.tournamenttitle}
                              </h4>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                UID: <span className="font-mono text-primary">{reg.gameuid}</span>
                              </p>
                            </div>
                          </div>

                          <div className="border-t border-white/5 pt-3.5 mt-4 flex items-center justify-between text-xs font-rajdhani">
                            <div className="flex items-center gap-2 text-gray-400 font-bold">
                              <i className="fa-solid fa-clock text-primary"></i>
                              <span>{parentT ? `${parentT.date} @ ${parentT.time}` : 'TBA'}</span>
                            </div>
                            <Link
                              to={`/tournament/${reg.tournamentid}`}
                              className="text-primary font-orbitron font-black text-[9px] uppercase tracking-widest hover:underline"
                            >
                              SECTOR INFO <i className="fa-solid fa-arrow-right ml-1"></i>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB 2: Warrior Credentials Form ─── */}
            {activeTab === 'credentials' && (
              <div className="space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <h3 className="font-orbitron font-bold text-xl text-white uppercase tracking-tight">
                    WARRIOR SHEET CREDENTIALS
                  </h3>
                  <p className="text-gray-500 font-rajdhani text-xs uppercase tracking-widest mt-1">
                    Manage your competitive metadata and contact channels
                  </p>
                </div>

                {successMsg && (
                  <div className="border text-xs font-semibold p-3.5 rounded-lg flex items-center gap-2.5 bg-green-950/20 border-green-500/35 text-green-400 animate-fade-in">
                    <i className="fa-solid fa-circle-check"></i>
                    <span>{successMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="border text-xs font-semibold p-3.5 rounded-lg flex items-center gap-2.5 bg-red-950/20 border-red-500/35 text-red-400 animate-fade-in">
                    <i className="fa-solid fa-circle-xmark"></i>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-5 font-rajdhani">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-gray-400 font-orbitron text-[10px] uppercase tracking-widest block">
                        Full Name / Gamertag
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-gray-400 font-orbitron text-[10px] uppercase tracking-widest block">
                        Age (Years)
                      </label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm"
                        min="10"
                        max="100"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-gray-400 font-orbitron text-[10px] uppercase tracking-widest block">
                        Game UID (For match registrations)
                      </label>
                      <input
                        type="text"
                        name="game_uid"
                        value={profile?.game_uid || 'Enter Your In-Game UID'}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-gray-500 font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm"
                        readOnly
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-gray-400 font-orbitron text-[10px] uppercase tracking-widest block">
                        Promo Code
                      </label>
                      <div className="flex gap-2 items-end">
                        <input
                          type="text"
                          name="promo_code"
                          value={formData.promo_code}
                          onChange={(e) => setFormData({ ...formData, promo_code: e.target.value })}
                          className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-gray-500 font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm"
                          readOnly
                        />
                        {!formData.promo_code && (
                          <button
                            type="button"
                            onClick={generatepromo_code}
                            className="bg-primary hover:bg-primary/80 text-dark font-orbitron font-black text-xs uppercase tracking-wider py-3 px-4 rounded-lg transition-all whitespace-nowrap"
                          >
                            Generate
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-gray-400 font-orbitron text-[10px] uppercase tracking-widest block">
                        Contact Information (Discord tag / Phone)
                      </label>
                      <input
                        type="text"
                        name="contact_info"
                        value={formData.contact_info}
                        onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm"
                        required
                      />
                    </div>
                  </div>


                  {/* Player Stats Section */}
                  <div className="border-t border-white/5 pt-5 mt-5">
                    <h4 className="font-orbitron font-bold text-sm text-primary uppercase tracking-tight mb-4">Combat Statistics</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-3">
                        <label className="text-gray-400 font-orbitron text-[9px] uppercase tracking-widest block">
                          Current Rank
                        </label>
                        <div className="text-lg md:text-xl font-orbitron font-black text-accent mt-1">
                          {playerRank || 'UNRANKED'}
                        </div>
                      </div>
                      <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-3">
                        <label className="text-gray-400 font-orbitron text-[9px] uppercase tracking-widest block">
                          Combat Points
                        </label>
                        <div className="text-lg md:text-xl font-orbitron font-black text-primary mt-1">
                          {playerPoints}
                        </div>
                      </div>
                      <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-3">
                        <label className="text-gray-400 font-orbitron text-[9px] uppercase tracking-widest block">
                          Total Kills
                        </label>
                        <div className="text-lg md:text-xl font-orbitron font-black text-pink mt-1">
                          {playerKills}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={updating}
                    className="py-3 px-8 bg-primary text-dark font-orbitron font-black text-xs uppercase tracking-widest transition-all duration-300 relative overflow-hidden group cursor-pointer disabled:opacity-50"
                    style={{
                      clipPath: 'polygon(8% 0, 100% 0, 100% 75%, 92% 100%, 0 100%, 0 25%)',
                      boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)',
                    }}
                  >
                    <span className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                    <span className="flex items-center gap-2">
                      {updating ? (
                        <>
                          <i className="fa-solid fa-spinner animate-spin"></i>
                          <span>SAVING METADATA...</span>
                        </>
                      ) : (
                        <>
                          <span>SAVE CHANGES</span>
                          <i className="fa-solid fa-check"></i>
                        </>
                      )}
                    </span>
                  </button>

                </form>
              </div>
            )}

            {/* ─── TAB 3: Achievements ─── */}
            {activeTab === 'achievements' && (
              <div className="space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <h3 className="font-orbitron font-bold text-xl text-white uppercase tracking-tight">
                    WARRIOR MEDAL & BADGES
                  </h3>
                  <p className="text-gray-500 font-rajdhani text-xs uppercase tracking-widest mt-1">
                    Acquired combat levels and rankings in official Taigour tournaments
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: 'Arena Rookie', desc: 'Registered in your first match sector', unlocked: totalTournaments >= 1, icon: 'fa-shield', color: 'text-primary' },
                    { title: 'Veteran Warrior', desc: 'Participated in 5+ tournament sectors', unlocked: totalTournaments >= 5, icon: 'fa-medal', color: 'text-pink' },
                    { title: 'Top Challenger', desc: 'Earned a spot on the competitive rankings leaderboard', unlocked: leaderEntry !== undefined, icon: 'fa-crown', color: 'text-accent' },
                  ].map((badge, idx) => (
                    <div
                      key={idx}
                      className={`p-6 rounded-xl border flex flex-col justify-between items-center text-center relative overflow-hidden transition-all duration-300 ${badge.unlocked
                        ? 'bg-bg-dark border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.02)]'
                        : 'bg-black/40 border-white/5 opacity-40'
                        }`}
                    >
                      <div className="space-y-4">
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border transition-transform duration-500 ${badge.unlocked
                            ? 'bg-white/5 border-white/20'
                            : 'bg-white/5 border-white/5'
                            }`}
                        >
                          <i className={`fa-solid ${badge.icon} ${badge.unlocked ? badge.color : 'text-gray-600'} text-xl`}></i>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-orbitron font-black text-sm uppercase text-white tracking-wide">
                            {badge.title}
                          </h4>
                          <p className="font-rajdhani text-xs text-gray-500 leading-relaxed max-w-[180px] mx-auto">
                            {badge.desc}
                          </p>
                        </div>
                      </div>

                      <div className="pt-5 mt-6 border-t border-white/5 w-full flex justify-center">
                        <span className={`font-orbitron font-bold text-[9px] uppercase tracking-widest ${badge.unlocked ? 'text-tertiary' : 'text-gray-500'}`}>
                          {badge.unlocked ? 'UNLOCKED' : 'LOCKED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );

};

export default ProfilePage;
