import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

// Shown right after login when the user has no profile yet (or an incomplete one).
// Collects the mandatory warrior credentials before they can use the platform.
const OnboardingModal = () => {
  const { user, profile, loading, reloadProfile } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    game_uid: '',
    contact_info: ''
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const profileIncomplete =
    !profile ||
    !profile.full_name ||
    !profile.age ||
    !profile.game_uid ||
    !profile.contact_info;

  if (loading || !user || !profileIncomplete) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.full_name.trim() || !formData.age || !formData.game_uid.trim() || !formData.contact_info.trim()) {
      setErrorMsg('All fields are mandatory.');
      return;
    }

    const ageNum = parseInt(formData.age);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      setErrorMsg('Please enter a valid age (10-100).');
      return;
    }

    setSaving(true);
    const { error } = await authService.createProfile(user.id, {
      email: user.email,
      full_name: formData.full_name.trim(),
      avatar_url: user.user_metadata?.avatar_url || '',
      age: ageNum,
      game_uid: formData.game_uid.trim(),
      contact_info: formData.contact_info.trim(),
      rank: profile?.rank || 'UNRANKED',
      total_kills: profile?.total_kills || 0,
      combat_score: profile?.combat_score || 0,
      promo_code: profile?.promo_code || '',
      player_id: profile?.player_id
    });

    if (error) {
      setErrorMsg('Failed to save profile: ' + error.message);
      setSaving(false);
    } else {
      await reloadProfile();
      setSaving(false);
    }
  };

  const inputClass =
    'w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm';
  const labelClass =
    'text-gray-400 font-orbitron text-[10px] uppercase tracking-widest block';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div
        className="glass w-full max-w-lg p-6 md:p-8 rounded-2xl border border-white/10 relative overflow-hidden my-8"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 19, 0.97) 0%, rgba(7, 7, 9, 0.99) 100%)'
        }}
      >
        <div className="absolute top-0 right-0 w-60 h-60 bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            {user.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                className="w-14 h-14 rounded-xl object-cover border border-primary/20 ring-2 ring-primary/10"
                alt="Avatar"
              />
            )}
            <div>
              <h2 className="font-orbitron font-black text-lg md:text-xl text-white uppercase tracking-tight">
                Complete Your Profile
              </h2>
              <p className="text-gray-400 font-rajdhani text-sm">
                One last step, warrior — we need your credentials before you enter the arena.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 font-rajdhani">
            <div className="space-y-1.5">
              <label className={labelClass}>Full Name / Gamertag</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className={inputClass}
                placeholder="e.g. Aayush 'Reaper' Karki"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Age (Years)</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className={inputClass}
                  min="10"
                  max="100"
                  placeholder="18"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Game UID</label>
                <input
                  type="text"
                  value={formData.game_uid}
                  onChange={(e) => setFormData({ ...formData, game_uid: e.target.value })}
                  className={inputClass}
                  placeholder="Your in-game UID"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Contact Information (Discord tag / Phone)</label>
              <input
                type="text"
                value={formData.contact_info}
                onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                className={inputClass}
                placeholder="e.g. reaper#4212 or 98XXXXXXXX"
                required
              />
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm font-medium">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-dark font-orbitron font-black text-sm uppercase tracking-wider py-3.5 rounded-lg transition-all"
            >
              {saving ? 'Saving...' : 'Enter The Arena'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
