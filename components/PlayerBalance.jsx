import React, { useState, useEffect } from 'react';
import { balanceService } from '../services/balanceService';
import { MEMBERSHIP_BENEFITS, MEMBERSHIP_TIERS, RECHARGE_PACKAGES, ADMIN_WHATSAPP, REQUEST_TYPES, REQUEST_STATUS } from '../constants/balanceConstants';
import { useAuth } from '../context/AuthContext';

const PlayerBalance = () => {
  const { user, profile } = useAuth();
  const [playerBalance, setPlayerBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('balance');
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [catalogMemberships, setCatalogMemberships] = useState(MEMBERSHIP_BENEFITS);
  const [catalogRechargePackages, setCatalogRechargePackages] = useState(RECHARGE_PACKAGES);
  const [transferForm, setTransferForm] = useState({ to_player_id: '', amount: '' });
  const [transferLoading, setTransferLoading] = useState(false);
  const [requestInfo, setRequestInfo] = useState({
    whatsapp_number: '',
    payment_method: 'esewa',
    payment_account_number: '',
    payment_account_owner: '',
    players_id: profile?.player_id || ''
  });

  useEffect(() => {
    setCatalogMemberships(MEMBERSHIP_BENEFITS);
    setCatalogRechargePackages(RECHARGE_PACKAGES);
  }, []);

  useEffect(() => {
    if (user) {
      fetchBalance();
    }
  }, [user]);

  useEffect(() => {
    // Pre-fill WhatsApp from profile contact if available (best effort)
    if (profile?.contact_info && !requestInfo.whatsapp_number) {
      setRequestInfo(prev => ({ ...prev, whatsapp_number: profile.contact_info }));
    }
  }, [profile]);

  const fetchBalance = async (manual = false) => {
    if (!user) return;
    if (manual) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await balanceService.getPlayerBalance(user.id);
      if (!error && data) {
        setPlayerBalance(data);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      if (manual) setRefreshing(false);
      else setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const { data, error } = await balanceService.getTransactionHistory(user.id, 30);
      if (!error) setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const handleRechargeClick = (pkg) => {
    setSelectedPackage(pkg);
    setShowRechargeModal(true);
  };

  const submitRechargeRequest = async () => {
    if (!selectedPackage || !user) return;
    if (!requestInfo.whatsapp_number || !requestInfo.payment_account_number || !requestInfo.payment_account_owner || !requestInfo.players_id) {
      return alert('Please enter WhatsApp number, payment account number, and owner name.');
    }
    
    try {
      const response = await fetch('/api/purchase-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          user_email: user.email,
          user_name: user.user_metadata?.full_name || 'Player',
          type: REQUEST_TYPES.RECHARGE,
          // Backend expects amount (total credited) + package_amount/bonus_amount
          amount: selectedPackage.amount + selectedPackage.bonus,
          package_amount: selectedPackage.amount,
          bonus_amount: selectedPackage.bonus,
          cost: selectedPackage.cost,
          description: `Recharge request for ◈${selectedPackage.amount} + ◈${selectedPackage.bonus} bonus`,
          whatsapp_number: requestInfo.whatsapp_number,
          payment_method: requestInfo.payment_method,
          payment_account_number: requestInfo.payment_account_number,
          payment_account_owner: requestInfo.payment_account_owner,
          players_id: requestInfo.players_id
        })
      });

      if (!response.ok) throw new Error('Failed to submit request');

      alert('Request submitted!\n\nPlease contact us on WhatsApp to confirm payment.\nOur admin will verify and add your balance shortly.');
      setShowRechargeModal(false);
      setSelectedPackage(null);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit request. Please try again.');
    }
  };

  const submitMembershipRequest = async () => {
    if (!selectedMembership || !user) return;
    if (!requestInfo.whatsapp_number || !requestInfo.payment_account_number || !requestInfo.payment_account_owner || !requestInfo.players_id) {
      return alert('Please enter WhatsApp number, payment account number, and owner name.');
    }

    try {
      const response = await fetch('/api/purchase-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          user_email: user.email,
          user_name: user.user_metadata?.full_name || 'Player',
          type: REQUEST_TYPES.MEMBERSHIP,
          tier: selectedMembership,
          amount: MEMBERSHIP_BENEFITS[selectedMembership].price,
          duration_days: 30,
          description: `Membership request for ${MEMBERSHIP_BENEFITS[selectedMembership].name} (◈${MEMBERSHIP_BENEFITS[selectedMembership].price})`,
          whatsapp_number: requestInfo.whatsapp_number,
          payment_method: requestInfo.payment_method,
          payment_account_number: requestInfo.payment_account_number,
          payment_account_owner: requestInfo.payment_account_owner,
          players_id: requestInfo.players_id
        })
      });

      if (!response.ok) throw new Error('Failed to submit request');

      alert(`✓ Request submitted!\n\nPlease contact us on WhatsApp to confirm payment.\nOur admin will verify and activate ${MEMBERSHIP_BENEFITS[selectedMembership].name} for you shortly.`);
      setShowMembershipModal(false);
      setSelectedMembership(null);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit request. Please try again.');
    }
  };

  const openWhatsAppChat = () => {
    const message = encodeURIComponent(
      `Hi! I'm interested in purchasing recharge/membership packages. Please assist me.`
    );
    window.open(`https://wa.me/${ADMIN_WHATSAPP.number.replace('+', '')}?text=${message}`, '_blank');
  };

  const getMembershipExpiry = () => {
    if (!playerBalance?.membership_expires_at) return null;
    const date = new Date(playerBalance.membership_expires_at);
    return date.toLocaleDateString();
  };

  const submitTransfer = async () => {
    if (!user) return;
    const fromPlayerId = profile?.player_id;
    const toPlayerId = (transferForm.to_player_id || '').trim();
    const amt = Number(transferForm.amount);

    if (!fromPlayerId) return alert('Your Player ID is missing. Please update your profile first.');
    if (!toPlayerId) return alert('Receiver Player ID is required.');
    if (!Number.isFinite(amt) || amt <= 0) return alert('Enter a valid amount.');

    setTransferLoading(true);
    try {
      const response = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_player_id: fromPlayerId,
          to_player_id: toPlayerId,
          amount: amt,
          request_id: `${fromPlayerId}:${toPlayerId}:${Date.now()}`,
          description: 'Player transfer'
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Transfer failed');

      alert('Transfer successful!');
      setTransferForm({ to_player_id: '', amount: '' });
      await fetchBalance();
      if (activeTab === 'history') await fetchHistory();
    } catch (e) {
      console.error(e);
      alert(e.message || 'Transfer failed');
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 md:p-8">
        <i className="fa-solid fa-spinner fa-spin text-primary text-2xl mr-3"></i>
        <span className="text-gray-400">Loading balance...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Balance Card */}
      <div className="bg-gradient-to-br from-primary/20 to-pink/10 border border-primary/30 rounded-2xl p-3 md:p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-gray-400 text-[12px] md:text-sm uppercase md:tracking-widest tracking-[0.4px]">Available Balance</h3>
            <div className="flex flex-row center text-[16px] md:text-4xl font-orbitron font-black text-primary">
              ◈ {playerBalance?.balance?.toLocaleString() || '0'} TGC
          <button
            onClick={() => fetchBalance(true)}
            disabled={refreshing || loading}
            className={`text-white ml-1 md:ml-3 rounded-lg transition-all text-[15px] md:text-sm ${refreshing || loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <i className={`fa-solid fa-sync mr-2 ${refreshing ? 'animate-spin' : ''}`}></i>
          </button>
          </div>
            
          </div>
          <div className="text-right">
            <div className="text-gray-400 text-[12px] md:text-sm uppercase md:tracking-widest tracking-[0.4px]">Membership Status</div>
            <div className={`text-lg font-bold ${
              playerBalance?.membership_tier === 'none' 
                ? 'text-gray-400' 
                : 'text-yellow-400'
            }`}>
              {catalogMemberships[playerBalance?.membership_tier]?.name || 'Free Player'}
            </div>
            {playerBalance?.membership_expires_at && playerBalance?.membership_tier !== 'none' && (
              <div className="text-xs text-gray-500 mt-1">
                Expires: {getMembershipExpiry()}
              </div>
            )}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
          <button
            onClick={() => setShowRechargeModal(true)}
            className="px-3 py-2 md:px-4 md:py-3 bg-primary text-dark rounded-lg font-bold hover:bg-primary/80 transition-all text-[13px] md:text-sm"
          >
            <i className="fa-solid fa-wallet mr-2"></i>Recharge Account
          </button>
          <button
            onClick={() => setShowMembershipModal(true)}
            className="px-3 py-2 md:px-4 md:py-3 bg-pink text-white rounded-lg font-bold hover:bg-pink/80 transition-all text-[13px] md:text-sm"
          >
            <i className="fa-solid fa-crown mr-2"></i>Get Membership
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className="px-3 py-2 md:px-4 md:py-3 bg-white/5 text-white rounded-lg font-bold hover:bg-white/10 transition-all text-[13px] md:text-sm hidden md:block"
          >
            <i className="fa-solid fa-paper-plane mr-2"></i>Transfer
          </button>
          
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 overflow-x-auto">
        <button
          onClick={() => setActiveTab('balance')}
          className={`px-3 py-2 font-bold text-[12px] md:text-sm uppercase tracking-widest border-b-2 transition-colors ${
            activeTab === 'balance'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-money-bill mr-2"></i>Balance
        </button>
        <button
          onClick={() => setActiveTab('membership')}
          className={`px-3 py-2 font-bold text-[12px] md:text-sm uppercase tracking-widest border-b-2 transition-colors ${
            activeTab === 'membership'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-crown mr-2"></i>Membership
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-3 py-2 font-bold text-[12px] md:text-sm uppercase tracking-widest border-b-2 transition-colors ${
            activeTab === 'stats'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-chart-pie mr-2"></i>Stats
        </button>

        <button
          onClick={() => setActiveTab('transfer')}
          className={`px-3 py-2 font-bold text-[12px] md:text-sm uppercase tracking-widest border-b-2 transition-colors ${
            activeTab === 'transfer'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-paper-plane mr-2"></i>Transfer
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-3 py-2 font-bold text-[12px] md:text-sm uppercase tracking-widest border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-clock-rotate-left mr-2"></i>History
        </button>

        <button
          onClick={() => setActiveTab('store')}
          className={`px-3 py-2 font-bold text-[12px] md:text-sm uppercase tracking-widest border-b-2 transition-colors ${
            activeTab === 'store'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-store mr-2"></i>Store
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[100px]">
        {/* Balance Tab */}
        {activeTab === 'balance' && (
          <div className="space-y-4">
            <h4 className="text-lg font-orbitron font-black text-white uppercase tracking-widest mb-4">
              Recharge Packages
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogRechargePackages.map((pkg, idx) => (
                <div
                  key={idx}
                  className="bg-bg-card border border-white/10 rounded-lg p-4 hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => handleRechargeClick(pkg)}
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                    <i className={`fa-solid ${pkg.icon}`}></i>
                  </div>
                  <div className="text-gray-400 text-xs uppercase tracking-widest mb-2">Package</div>
                  <div className="text-[15px] md:text-2xl font-orbitron font-black text-white">
                    ◈ {pkg.amount} TGC
                  </div>
                  <div className="text-primary font-bold text-[13px] md:text-xs mb-3">
                    <i className="fa-solid fa-gift mr-2"></i>+◈ {pkg.bonus} Bonus
                  </div>
                  <div className="text-xs text-gray-400 bg-white/5 p-2 rounded">
                    Total Cost: <span className="text-yellow-400 font-bold">रु {pkg.cost}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Membership Tab */}
        {activeTab === 'membership' && (
          <div className="space-y-4">
            <h4 className="text-lg font-orbitron font-black text-white uppercase tracking-widest mb-4">
              Membership Plans
            </h4>
            <div className="space-y-3">
              {Object.entries(catalogMemberships).map(([key, benefit]) => (
                <div
                  key={key}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    playerBalance?.membership_tier === key
                      ? 'bg-primary/10 border-primary'
                      : 'bg-bg-card border-white/10 hover:border-primary/50'
                  }`}
                  onClick={() => {
                    if (playerBalance?.membership_tier !== key) {
                      setSelectedMembership(key);
                      setShowMembershipModal(true);
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="font-bold text-white text-lg">{benefit.name}</h5>
                      <div className="text-primary font-bold">रु {benefit.price}</div>
                    </div>
                    {playerBalance?.membership_tier === key && (
                      <div className="px-3 py-1 bg-primary text-dark text-xs font-bold rounded">
                        <i className="fa-solid fa-check mr-1"></i>Active
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    {benefit.benefits.map((b, idx) => (
                      <div key={idx} className="mb-1">
                        <i className="fa-solid fa-star text-yellow-500 mr-2"></i>{b}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-bg-card border border-white/10 rounded-lg p-4">
              <div className="text-gray-500 text-xs uppercase tracking-widest mb-2">Total Spent</div>
              <div className="text-2xl font-orbitron font-black text-pink">
                ◈ {playerBalance?.total_spent?.toLocaleString() || '0'}
              </div>
            </div>
            <div className="bg-bg-card border border-white/10 rounded-lg p-4">
              <div className="text-gray-500 text-xs uppercase tracking-widest mb-2">Member Since</div>
              <div className="text-sm text-white font-bold">
                {new Date(playerBalance?.created_at).toLocaleDateString()} 
              </div>
            </div>
            <div className="bg-bg-card border border-white/10 rounded-lg p-4">
              <div className="text-gray-500 text-xs uppercase tracking-widest mb-2">Account Status</div>
              <div className="text-green-400 font-bold">
                <i className="fa-solid fa-circle-check mr-1"></i>Active
              </div>
            </div>
          </div>
        )}

        {/* Transfer Tab */}
        {activeTab === 'transfer' && (
          <div className="space-y-4">
            <div className="bg-bg-card border border-white/10 rounded-xl p-4">
              <div className="text-gray-400 text-xs uppercase tracking-widest mb-1">Send balance to another player</div>
              <div className="text-white font-bold text-sm mb-4">
                Sender Wallet ID: <span className="font-mono text-primary">{profile?.player_id || 'N/A'}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-widest">Receiver Player ID</label>
                  <input
                    value={transferForm.to_player_id}
                    onChange={(e) => setTransferForm({ ...transferForm, to_player_id: e.target.value })}
                    placeholder="PLAYER_XXXX_XXXX"
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-widest">Amount (◈)</label>
                  <input
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    placeholder="100"
                    type="number"
                    min="1"
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm"
                  />
                </div>
              </div>

              <button
                disabled={transferLoading}
                onClick={submitTransfer}
                className="mt-4 w-full px-4 py-3 bg-primary text-dark rounded-lg font-bold hover:bg-primary/80 transition-all disabled:opacity-60"
              >
                {transferLoading ? 'Transferring...' : 'Send Transfer'}
              </button>
              <div className="text-[11px] text-gray-500 mt-2">
                Tip: Double-check the receiver Player ID. Transfers are final.
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {historyLoading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <i className="fa-solid fa-spinner fa-spin"></i> Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="text-gray-500 text-sm">No transactions yet.</div>
            ) : (
              <div className="space-y-2">
                {history.map((tx) => {
                  const amount = Number(tx.amount || 0);
                  const isOut = amount < 0;
                  return (
                    <div key={tx.tx_id || tx.created_at} className="bg-bg-card border border-white/10 rounded-lg p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-white font-bold text-sm truncate">
                          {(tx.type || '').toUpperCase().replaceAll('_', ' ')}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {tx.description || '—'} • {tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}
                        </div>
                      </div>
                      <div className={`font-orbitron font-black ${isOut ? 'text-pink' : 'text-tertiary'}`}>
                        {isOut ? '-' : '+'}◈ {Math.abs(amount).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/*Store Tab*/}
      {activeTab === 'store' && (
        <div className="flex items-center justify-center p-10">
          <div className="text-gray-400 text-center">
            <i className="fa-solid fa-store text-4xl mb-4"></i>
            <div className="text-lg font-bold">Store Coming Soon!</div>
            <div className="text-sm mt-1">Exciting items and offers will be available here soon. Stay tuned!</div>
          </div>
        </div>
      )}


      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-orbitron font-black text-white mb-2">
              <i className="fa-brands fa-whatsapp text-green-400 mr-2"></i>Recharge Account
            </h3>
            <p className="text-gray-400 text-sm mb-4">Please contact us via WhatsApp to complete your purchase</p>
            
            {selectedPackage && (
              <div className="space-y-4 mb-6 p-4 bg-white/5 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-gray-400">Package amount:</span>
                  <span className="font-bold text-white">◈ {selectedPackage.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Bonus:</span>
                  <span className="font-bold text-primary">+◈ {selectedPackage.bonus}</span>
                </div>
                <div className="border-t border-white/10 pt-4 flex justify-between">
                  <span className="font-bold text-white">Total:</span>
                  <span className="font-orbitron font-black text-yellow-400 text-lg">
                    ◈ {selectedPackage.amount + selectedPackage.bonus}
                  </span>
                </div>
              </div>
            )}

            {/* Payment details (required) */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-widest">WhatsApp Number</label>
                <input
                  value={requestInfo.whatsapp_number}
                  onChange={(e) => setRequestInfo(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                  placeholder="+97798XXXXXXXX"
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-widest">Payment Method</label>
                <select
                  value={requestInfo.payment_method}
                  onChange={(e) => setRequestInfo(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm"
                >
                  <option value="esewa" className="bg-black text-white">eSewa</option>
                  <option value="khalti" className="bg-black text-white">Khalti</option>
                  <option value="bank" className="bg-black text-white">Bank</option>
                </select>
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-widest">Account Number</label>
                <input
                  value={requestInfo.payment_account_number}
                  onChange={(e) => setRequestInfo(prev => ({ ...prev, payment_account_number: e.target.value }))}
                  placeholder="98XXXXXXXX / 01-XXXXXX / etc"
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-widest">Account Owner Name</label>
                <input
                  value={requestInfo.payment_account_owner}
                  onChange={(e) => setRequestInfo(prev => ({ ...prev, payment_account_owner: e.target.value }))}
                  placeholder="Owner full name"
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm"
                />
              </div>
            </div>

            {/* WhatsApp Contact Info */}
            <div className="bg-green-400/10 border border-green-400/30 rounded-lg p-4 mb-4">
              <div className="text-sm text-white mb-2">
                <i className="fa-solid fa-phone mr-2 text-green-400"></i>
                <span className="font-bold">{ADMIN_WHATSAPP.displayNumber}</span>
              </div>
              <p className="text-xs text-gray-400">Click below to start WhatsApp chat</p>
            </div>

            <div className="flex gap-3 flex-col">
              <button
                onClick={openWhatsAppChat}
                className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-brands fa-whatsapp text-lg"></i>
                Contact on WhatsApp
              </button>
              <button
                onClick={submitRechargeRequest}
                className="w-full px-4 py-2 bg-primary text-dark rounded font-bold hover:bg-primary/80"
              >
                Submit Request
              </button>
              <button
                onClick={() => {
                  setShowRechargeModal(false);
                  setSelectedPackage(null);
                }}
                className="w-full px-4 py-2 bg-white/5 text-white rounded font-bold hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Membership Modal */}
      {showMembershipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-orbitron font-black text-white mb-2">
              <i className="fa-brands fa-whatsapp text-green-400 mr-2"></i>Get Membership
            </h3>
            <p className="text-gray-400 text-sm mb-4">Please contact us via WhatsApp to complete your purchase</p>

            {selectedMembership && (
              <div className="space-y-4 mb-6 p-4 bg-white/5 rounded-lg">
                <div className="text-lg font-bold text-white">
                  {catalogMemberships[selectedMembership]?.name || 'Membership'}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price:</span>
                  <span className="font-orbitron font-black text-primary">
                    ◈ {catalogMemberships[selectedMembership]?.price || 0}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="text-sm font-bold text-gray-300 mb-2">Benefits:</div>
                  {(catalogMemberships[selectedMembership]?.benefits || []).map((b, idx) => (
                    <div key={idx} className="text-sm text-gray-400 mb-1">
                      <i className="fa-solid fa-check text-primary mr-2"></i>{b}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment details (required) */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-widest">WhatsApp Number</label>
                <input
                  value={requestInfo.whatsapp_number}
                  onChange={(e) => setRequestInfo(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                  placeholder="+97798XXXXXXXX"
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-widest">Payment Method</label>
                <select
                  value={requestInfo.payment_method}
                  onChange={(e) => setRequestInfo(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm"
                >
                  <option value="esewa">eSewa</option>
                  <option value="khalti">Khalti</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-widest">Account Number</label>
                <input
                  value={requestInfo.payment_account_number}
                  onChange={(e) => setRequestInfo(prev => ({ ...prev, payment_account_number: e.target.value }))}
                  placeholder="98XXXXXXXX / 01-XXXXXX / etc"
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-widest">Account Owner Name</label>
                <input
                  value={requestInfo.payment_account_owner}
                  onChange={(e) => setRequestInfo(prev => ({ ...prev, payment_account_owner: e.target.value }))}
                  placeholder="Owner full name"
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm"
                />
              </div>
            </div>

            {/* WhatsApp Contact Info */}
            <div className="bg-green-400/10 border border-green-400/30 rounded-lg p-4 mb-4">
              <div className="text-sm text-white mb-2">
                <i className="fa-solid fa-phone mr-2 text-green-400"></i>
                <span className="font-bold">{ADMIN_WHATSAPP.displayNumber}</span>
              </div>
              <p className="text-xs text-gray-400">Click below to start WhatsApp chat</p>
            </div>

            <div className="flex gap-3 flex-col">
              <button
                onClick={openWhatsAppChat}
                className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-brands fa-whatsapp text-lg"></i>
                Contact on WhatsApp
              </button>
              <button
                onClick={submitMembershipRequest}
                className="w-full px-4 py-2 bg-primary text-dark rounded font-bold hover:bg-primary/80"
              >
                Submit Request
              </button>
              <button
                onClick={() => {
                  setShowMembershipModal(false);
                  setSelectedMembership(null);
                }}
                className="w-full px-4 py-2 bg-white/5 text-white rounded font-bold hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerBalance;
