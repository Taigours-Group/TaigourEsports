import React, { useState, useEffect, useMemo } from 'react';
import { balanceService } from '../services/balanceService';
import { MEMBERSHIP_BENEFITS, MEMBERSHIP_TIERS } from '../constants/balanceConstants';

const PlayerStatsAdmin = ({ registrations }) => {
  const [playerStats, setPlayerStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [tempBalance, setTempBalance] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  const [tempMembership, setTempMembership] = useState('none');
  const [tempDuration, setTempDuration] = useState('30');
   
  // New profile edit fields
  const [tempProfile, setTempProfile] = useState({
    full_name: '',
    age: '',
    contact_info: '',
    game_uid: '',
    promo_code: '',
    rank: 'Unranked',
    combat_score: 0,
    total_kills: 0,
    achievements: []
  });

  const [sortBy, setSortBy] = useState('created_at');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [ledgerWalletId, setLedgerWalletId] = useState(null);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Fetch player statistics
  useEffect(() => {
    fetchPlayerStats();
  }, [page]);

  const fetchPlayerStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await balanceService.getAllPlayerBalances(pageSize, page * pageSize);
      if (!error && data) {
        setPlayerStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch player stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const openLedger = async (walletId) => {
    if (!walletId) return;
    setLedgerWalletId(walletId);
    setLedgerLoading(true);
    try {
      const response = await fetch(`/api/admin/ledger/${encodeURIComponent(walletId)}?limit=50`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch ledger');
      setLedgerRows(result.data || []);
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to fetch ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    const searchLower = (searchTerm || '').toString().toLowerCase().trim();

    let result = playerStats.filter((player) => {
      const playerProfile = player?.profiles || {};
      const username = (playerProfile?.full_name || '').toString().toLowerCase();
      const playerId = (playerProfile?.player_id || '').toString().toLowerCase();
      const userId = (player?.user_id || '').toString().toLowerCase();

      return (
        username.includes(searchLower) ||
        playerId.includes(searchLower) ||
        userId.includes(searchLower)
      );
    });

    // Sort
    result.sort((a, b) => {
      const aBalance = Number(a?.balance ?? 0);
      const bBalance = Number(b?.balance ?? 0);
      const aSpent = Number(a?.total_spent ?? 0);
      const bSpent = Number(b?.total_spent ?? 0);

      switch (sortBy) {
        case 'balance':
          return bBalance - aBalance;
        case 'spent':
          return bSpent - aSpent;
        case 'created_at':
        default: {
          const aDate = a?.created_at ? new Date(a.created_at).getTime() : 0;
          const bDate = b?.created_at ? new Date(b.created_at).getTime() : 0;
          return bDate - aDate;
        }
      }
    });

    return result;
  }, [playerStats, searchTerm, sortBy]);


  // Start editing player
  const startEdit = (player) => {
    setEditingPlayer(player);
    setTempBalance(player.balance.toString());
    setTempMembership(player.membership_tier);
    setTempDuration('30');
    
    // Load profile fields
    const p = player.profiles || {};
    setTempProfile({
      full_name: p.full_name || '',
      age: p.age || '',
      contact_info: p.contact_info || '',
      game_uid: p.game_uid || '',
      promo_code: p.promo_code || '',
      rank: p.rank || 'Unranked',
      combat_score: p.combat_score || 0,
      total_kills: p.total_kills || 0,
      achievements: Array.isArray(p.achievements) ? p.achievements : []
    });
  };

  // Save player changes
  const savePlayerChanges = async () => {
    if (!editingPlayer) return;

    try {
      // Update balance
      const newBalance = parseInt(tempBalance) || 0;
      if (newBalance !== editingPlayer.balance) {
        await balanceService.adminUpdateBalance(editingPlayer.user_id, newBalance, 'Admin adjustment: ' + tempDescription);
      }

      // Update membership
      if (tempMembership !== editingPlayer.membership_tier) {
        await balanceService.adminUpdateMembership(editingPlayer.user_id, tempMembership, parseInt(tempDuration));
      }

      // Update profile stats & achievements
      await balanceService.adminUpdatePlayerStats(editingPlayer.user_id, {
        full_name: tempProfile.full_name,
        age: parseInt(tempProfile.age) || null,
        contact_info: tempProfile.contact_info,
        game_uid: tempProfile.game_uid,
        promo_code: tempProfile.promo_code,
        rank: tempProfile.rank,
        combat_score: parseInt(tempProfile.combat_score) || 0,
        total_kills: parseInt(tempProfile.total_kills) || 0,
        achievements: tempProfile.achievements
      });

      // Refresh data
      await fetchPlayerStats();
      setEditingPlayer(null);
      alert('Player stats updated successfully!');
    } catch (error) {
      console.error('Error saving player changes:', error);
      alert('Failed to update player stats');
    }
  };

  const handleAchievementToggle = (achievementId) => {
    setTempProfile(prev => {
      const current = prev.achievements;
      if (current.includes(achievementId)) {
        return { ...prev, achievements: current.filter(a => a !== achievementId) };
      } else {
        return { ...prev, achievements: [...current, achievementId] };
      }
    });
  };

  const getMembershipColor = (tier) => {
    const colors = {
      none: 'text-gray-400',
      bronze: 'text-amber-500',
      silver: 'text-slate-400',
      gold: 'text-yellow-500',
      platinum: 'text-cyan-400'
    };
    return colors[tier] || 'text-gray-400';
  };

  const getMembershipBadgeColor = (tier) => {
    const colors = {
      none: 'bg-gray-900 border-gray-700',
      bronze: 'bg-amber-900/30 border-amber-700',
      silver: 'bg-slate-900/30 border-slate-700',
      gold: 'bg-yellow-900/30 border-yellow-700',
      platinum: 'bg-cyan-900/30 border-cyan-700'
    };
    return colors[tier] || 'bg-gray-900 border-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-bg-card p-6 rounded-2xl border border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h2 className="text-2xl font-orbitron font-black text-white uppercase tracking-widest">
            <i className="fa-solid fa-chart-line text-primary mr-3"></i>Player Statistics
          </h2>
          <button
            onClick={fetchPlayerStats}
            disabled={loading}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-bold hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
            Refresh Data
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Search by username, player ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
          >
            <option value="created_at">Sort by: Newest</option>
            <option value="balance">Sort by: Balance (High)</option>
            <option value="spent">Sort by: Total Spent</option>
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-bg-card p-4 rounded-lg border border-white/5">
          <div className="text-gray-500 text-xs uppercase tracking-widest mb-2">Total Players</div>
          <div className="text-3xl font-orbitron font-black text-white">{playerStats.length}</div>
        </div>
        <div className="bg-bg-card p-4 rounded-lg border border-white/5">
          <div className="text-gray-500 text-xs uppercase tracking-widest mb-2">Total Balance</div>
          <div className="text-3xl font-orbitron font-black text-primary">
            ◈ {playerStats.reduce((acc, p) => acc + p.balance, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-bg-card p-4 rounded-lg border border-white/5">
          <div className="text-gray-500 text-xs uppercase tracking-widest mb-2">Total Spent</div>
          <div className="text-3xl font-orbitron font-black text-pink">
            ◈ {playerStats.reduce((acc, p) => acc + p.total_spent, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-bg-card rounded-2xl border border-white/5 overflow-x">
        {/* Keep this section height-limited so the Admin page doesn't grow endlessly */}
        <div className="overflow-x-auto max-h-[520px] w-full pr-2 custom-scrollbar">
          <table className="min-w-max w-full">

            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-orbitron font-black uppercase text-gray-400 tracking-widest">Player</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron font-black uppercase text-gray-400 tracking-widest">Stats</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron font-black uppercase text-gray-400 tracking-widest">Membership</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron font-black uppercase text-gray-400 tracking-widest">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron font-black uppercase text-gray-400 tracking-widest">Locked</th>
                <th className="px-4 py-3 text-left text-xs font-orbitron font-black uppercase text-gray-400 tracking-widest">Total Spent</th>
                <th className="px-4 py-3 text-center text-xs font-orbitron font-black uppercase text-gray-400 tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading...
                  </td>
                </tr>
              ) : filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                    No players found
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => (
                  <tr key={player.user_id || player.profiles?.player_id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-bold text-white">{player.profiles?.full_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{player.profiles?.player_id || player.user_id.slice(0, 8)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <span className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-300">
                          <i className="fa-solid fa-medal text-primary mr-1"></i> {player.profiles?.rank || 'Unranked'}
                        </span>
                        <span className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-300">
                          <i className="fa-solid fa-skull text-red-500 mr-1"></i> {player.profiles?.total_kills || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold border ${getMembershipBadgeColor(player.membership_tier)}`}>
                        <i className={`fa-solid fa-crown ${getMembershipColor(player.membership_tier)} mr-1`}></i>
                        {MEMBERSHIP_BENEFITS[player.membership_tier]?.name || 'None'}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-orbitron font-black text-primary">
                      ◈ {player.balance.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 font-orbitron font-bold text-accent">
                      ◈ {Number(player.locked_balance || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 font-orbitron font-bold text-pink">
                      ◈ {player.total_spent.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openLedger(player.profiles?.player_id)}
                          className="px-3 py-1 bg-white/5 border border-white/10 text-white rounded text-xs font-bold hover:bg-white/10 transition-colors"
                          title="View ledger"
                        >
                          <i className="fa-solid fa-receipt mr-1"></i>Ledger
                        </button>
                        <button
                          onClick={() => startEdit(player)}
                          className="px-3 py-1 bg-primary text-dark rounded text-xs font-bold hover:bg-primary/80 transition-colors"
                        >
                          <i className="fa-solid fa-edit mr-1"></i>Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center p-4 border-t border-white/5">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1 bg-white/5 text-white rounded text-xs disabled:opacity-50 hover:bg-white/10"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">Page {page + 1}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={filteredPlayers.length < pageSize}
            className="px-3 py-1 bg-white/5 text-white rounded text-xs disabled:opacity-50 hover:bg-white/10"
          >
            Next
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000]">
          <div className="relative w-full h-[90vh] max-w-4xl p-4 bg-bg-card rounded-2xl border border-white/10 shadow-2xl animate-fade-in my-8 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-orbitron font-black text-white">
                Edit Player: {tempProfile.full_name || 'Unknown'}
              </h3>
              <button onClick={() => setEditingPlayer(null)} className="text-gray-400 hover:text-white">
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Financial & Membership */}
              <div className="space-y-4">
                <h4 className="text-primary font-orbitron font-bold border-b border-white/10 pb-2 mb-4">Financial & Status</h4>
                {/* Balance */}
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Balance (◈)</label>
                  <input
                    type="number"
                    value={tempBalance}
                    onChange={(e) => setTempBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-primary"
                  />
                  <label className="block text-sm font-bold text-gray-400 mb-2">Description</label>
                  <input
                    type="text"
                    value={tempDescription}
                    onChange={(e) => setTempDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-primary"
                  />
                </div>


                {/* Membership Tier */}
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Membership Tier</label>
                  <select
                    value={tempMembership}
                    onChange={(e) => setTempMembership(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-primary"
                  >
                    {Object.entries(MEMBERSHIP_BENEFITS).map(([key, value]) => (
                      <option className='bg-black' key={key} value={key}>
                        {value.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Membership Duration Extension (Days)</label>
                  <input
                    type="number"
                    value={tempDuration}
                    onChange={(e) => setTempDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-primary"
                  />
                </div>
                
                <h4 className="text-primary font-orbitron font-bold border-b border-white/10 pb-2 mt-8 mb-4">Game Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Total Kills</label>
                    <input
                      type="number"
                      value={tempProfile.total_kills}
                      onChange={(e) => setTempProfile({...tempProfile, total_kills: e.target.value})}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Combat Score</label>
                    <input
                      type="number"
                      value={tempProfile.combat_score}
                      onChange={(e) => setTempProfile({...tempProfile, combat_score: e.target.value})}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Current Rank</label>
                  <select
                    value={tempProfile.rank}
                    onChange={(e) => setTempProfile({...tempProfile, rank: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-primary"
                  >
                    <option className='bg-black' value="Unranked">Unranked</option>
                    <option className='bg-black' value="Bronze">Bronze</option>
                    <option className='bg-black' value="Silver">Silver</option>
                    <option className='bg-black' value="Gold">Gold</option>
                    <option className='bg-black' value="Platinum">Platinum</option>
                    <option className='bg-black' value="Diamond">Diamond</option>
                    <option className='bg-black' value="Crown">Crown</option>
                    <option className='bg-black' value="Ace">Ace</option>
                    <option className='bg-black' value="Conqueror">Conqueror</option>
                  </select>
                </div>
              </div>

              {/* Right Column: Profile & Achievements */}
              <div className="space-y-4">
                <h4 className="text-primary font-orbitron font-bold border-b border-white/10 pb-2 mb-4">Profile Details</h4>
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Full Name / Gamertag</label>
                  <input
                    type="text"
                    value={tempProfile.full_name}
                    onChange={(e) => setTempProfile({...tempProfile, full_name: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Age</label>
                    <input
                      type="number"
                      value={tempProfile.age}
                      onChange={(e) => setTempProfile({...tempProfile, age: e.target.value})}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Phone / Discord</label>
                    <input
                      type="text"
                      value={tempProfile.contact_info}
                      onChange={(e) => setTempProfile({...tempProfile, contact_info: e.target.value})}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Game UID</label>
                    <input
                      type="text"
                      value={tempProfile.game_uid}
                      onChange={(e) => setTempProfile({...tempProfile, game_uid: e.target.value})}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Promo Code</label>
                    <input
                      type="text"
                      value={tempProfile.promo_code}
                      onChange={(e) => setTempProfile({...tempProfile, promo_code: e.target.value})}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <h4 className="text-primary font-orbitron font-bold border-b border-white/10 pb-2 mt-8 mb-4">Achievements</h4>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {[
                    { id: 'FIRST_BLOOD', name: 'First Blood (10 Kills)' },
                    { id: 'ASSASSIN', name: 'Assassin (50 Kills)' },
                    { id: 'VETERAN', name: 'Veteran (100 Kills)' },
                    { id: 'TERMINATOR', name: 'Terminator (500 Kills)' },
                    { id: 'GLADIATOR', name: 'Gladiator (1k Combat)' },
                    { id: 'WARLORD', name: 'Warlord (5k Combat)' },
                    { id: 'ELITE_RANK', name: 'Elite Rank (Diamond+)' },
                  ].map(ach => (
                    <label key={ach.id} className="flex items-center gap-2 text-sm text-gray-300 bg-white/5 p-2 rounded border border-white/5 hover:bg-white/10 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={tempProfile.achievements.includes(ach.id)}
                        onChange={() => handleAchievementToggle(ach.id)}
                        className="accent-primary"
                      />
                      <span>{ach.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 italic mt-2">* Achievements automatically unlock based on stats when you save.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-white/10">
                <button
                  onClick={() => setEditingPlayer(null)}
                  className="flex-1 px-4 py-2 bg-white/5 text-white rounded font-bold hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={savePlayerChanges}
                  className="flex-1 px-4 py-2 bg-primary text-dark rounded font-bold hover:bg-primary/80"
                >
                  Save Changes
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {ledgerWalletId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-bg-card border border-white/10 rounded-2xl p-6 max-w-3xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-widest">Wallet Ledger</div>
                <div className="text-white font-orbitron font-black">{ledgerWalletId}</div>
              </div>
              <button onClick={() => setLedgerWalletId(null)} className="text-gray-400 hover:text-white">
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>

            {ledgerLoading ? (
              <div className="text-gray-400"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</div>
            ) : ledgerRows.length === 0 ? (
              <div className="text-gray-500">No ledger entries.</div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
                {ledgerRows.map((tx) => {
                  const isOut = tx.from_wallet_id === ledgerWalletId && tx.to_wallet_id !== ledgerWalletId;
                  return (
                    <div key={tx.tx_id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-white font-bold text-sm truncate">{(tx.type || '').replaceAll('_', ' ')}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {tx.description || '—'} • {tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}
                        </div>
                        {(tx.reference_id || tx.idempotency_key) && (
                          <div className="text-[10px] text-gray-600 font-mono truncate">
                            {tx.reference_id ? `ref:${tx.reference_id}` : ''}{tx.reference_id && tx.idempotency_key ? ' • ' : ''}{tx.idempotency_key ? `idem:${tx.idempotency_key}` : ''}
                          </div>
                        )}
                      </div>
                      <div className={`font-orbitron font-black ${isOut ? 'text-pink' : 'text-tertiary'}`}>
                        {isOut ? '-' : '+'}◈ {Number(tx.amount || 0).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerStatsAdmin;
