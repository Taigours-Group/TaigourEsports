import React, { useState, useEffect } from 'react';
import { balanceService } from '../services/balanceService';
import { MEMBERSHIP_BENEFITS, MEMBERSHIP_TIERS, RECHARGE_PACKAGES, ADMIN_WHATSAPP, REQUEST_TYPES, REQUEST_STATUS } from '../constants/balanceConstants';
import { useAuth } from '../context/AuthContext';

const PlayerBalance = () => {
  const { user } = useAuth();
  const [playerBalance, setPlayerBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('balance');
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedMembership, setSelectedMembership] = useState(null);

  useEffect(() => {
    if (user) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchBalance = async () => {
    if (!user) return;
    try {
      const { data, error } = await balanceService.getPlayerBalance(user.id);
      if (!error && data) {
        setPlayerBalance(data);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRechargeClick = (pkg) => {
    setSelectedPackage(pkg);
    setShowRechargeModal(true);
  };

  const submitRechargeRequest = async () => {
    if (!selectedPackage || !user) return;
    
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
          description: `Recharge request for ◈${selectedPackage.amount} + ◈${selectedPackage.bonus} bonus`
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
          description: `Membership request for ${MEMBERSHIP_BENEFITS[selectedMembership].name} (◈${MEMBERSHIP_BENEFITS[selectedMembership].price})`
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
            <div className="text-2xl md:text-4xl font-orbitron font-black text-primary">
              ◈ {playerBalance?.balance?.toLocaleString() || '0'} TGC
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-400 text-[12px] md:text-sm uppercase md:tracking-widest tracking-[0.4px]">Membership Status</div>
            <div className={`text-lg font-bold ${
              playerBalance?.membership_tier === 'none' 
                ? 'text-gray-400' 
                : 'text-yellow-400'
            }`}>
              {MEMBERSHIP_BENEFITS[playerBalance?.membership_tier]?.name || 'Free Player'}
            </div>
            {playerBalance?.membership_expires_at && playerBalance?.membership_tier !== 'none' && (
              <div className="text-xs text-gray-500 mt-1">
                Expires: {getMembershipExpiry()}
              </div>
            )}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2 md:gap-4">
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
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
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
              {RECHARGE_PACKAGES.map((pkg, idx) => (
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
              {Object.entries(MEMBERSHIP_BENEFITS).map(([key, benefit]) => (
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
                  {MEMBERSHIP_BENEFITS[selectedMembership].name}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price:</span>
                  <span className="font-orbitron font-black text-primary">
                    ◈ {MEMBERSHIP_BENEFITS[selectedMembership].price}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="text-sm font-bold text-gray-300 mb-2">Benefits:</div>
                  {MEMBERSHIP_BENEFITS[selectedMembership].benefits.map((b, idx) => (
                    <div key={idx} className="text-sm text-gray-400 mb-1">
                      <i className="fa-solid fa-check text-primary mr-2"></i>{b}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
