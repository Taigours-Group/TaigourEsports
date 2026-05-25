import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const OnboardingModal = () => {
  const { user, profile, loading, reloadProfile } = useAuth();
  
  // Show onboarding if there's a user, not loading, and NO profile yet
  // Or if profile exists but somehow missing age or contact info
  const needsOnboarding = !loading && user && (!profile || !profile.age || !profile.contact_info);
  
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    contact_info: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !profile) {
      setFormData({
        full_name: user?.user_metadata?.full_name || '',
        age: '',
        contact_info: ''
      });
    } else if (profile) {
      setFormData({
        full_name: profile.full_name || user?.user_metadata?.full_name || '',
        age: profile.age || '',
        contact_info: profile.contact_info || ''
      });
    }
  }, [user, profile]);

  if (!needsOnboarding) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.full_name.trim() || !formData.age || !formData.contact_info.trim()) {
      setError('Please fill in all fields to register your warrior credentials.');
      return;
    }

    const ageNum = parseInt(formData.age);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      setError('Please enter a valid age between 10 and 100.');
      return;
    }
    
    setSubmitting(true);
    
    const profileData = {
      email: user.email,
      full_name: formData.full_name.trim(),
      avatar_url: user.user_metadata?.avatar_url || '',
      age: ageNum,
      contact_info: formData.contact_info.trim()
    };
    
    const { error: submitError } = await authService.createProfile(user.id, profileData);
    
    if (submitError) {
      setError('System Error: ' + submitError.message);
      setSubmitting(false);
    } else {
      await reloadProfile(); // Refresh profile state to hide modal
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#000]/85 backdrop-blur-md px-4 animate-fade-in">
      <div 
        className="bg-bg-dark border rounded-2xl p-8 max-w-md w-full relative overflow-hidden shadow-2xl"
        style={{
          borderColor: 'rgba(0, 212, 255, 0.25)',
          boxShadow: '0 0 50px rgba(0, 212, 255, 0.15), inset 0 0 20px rgba(0, 212, 255, 0.05)',
        }}
      >
        {/* Futuristic Cyber Top Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse-slow"></div>
        
        {/* Glow Accent */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header Icon */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/30 relative">
            <i className="fa-solid fa-shield-halved text-primary text-lg animate-pulse"></i>
            <div className="absolute -inset-0.5 bg-primary/20 blur-md rounded-lg -z-10"></div>
          </div>
          <div>
            <h2 className="font-orbitron font-black text-xl text-white uppercase tracking-wider leading-none">
              Forge Profile
            </h2>
            <p className="text-[10px] font-orbitron font-bold text-primary uppercase tracking-[0.2em] mt-1">
              Warrior Credentials
            </p>
          </div>
        </div>

        <p className="text-gray-400 font-rajdhani text-sm mb-6 leading-relaxed">
          Welcome to the Arena. We need a few core details to establish your competitive rank and verify your entry.
        </p>

        {error && (
          <div 
            className="border text-xs font-semibold p-3.5 rounded-lg mb-5 flex items-start gap-2.5 bg-red-950/20 border-red-500/35 text-red-400 animate-slide-up"
          >
            <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 font-orbitron text-[10px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <span>Player Name / Gamertag</span>
              <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white font-rajdhani font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm placeholder:text-gray-600"
                placeholder="e.g. Neo_Striker"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">
                <i className="fa-solid fa-signature"></i>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-gray-400 font-orbitron text-[10px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span>Age</span>
                <span className="text-primary">*</span>
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white font-rajdhani font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm placeholder:text-gray-600"
                placeholder="21"
                min="10"
                max="100"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-gray-400 font-orbitron text-[10px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span>Contact (Discord/WhatsApp)</span>
                <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="contact_info"
                  value={formData.contact_info}
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white font-rajdhani font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm placeholder:text-gray-600"
                  placeholder="Discord#0000 or Phone"
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">
                  <i className="fa-brands fa-discord"></i>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-6 py-3 px-4 bg-primary text-dark font-orbitron font-black text-xs uppercase tracking-widest transition-all duration-300 relative overflow-hidden group cursor-pointer disabled:opacity-50"
            style={{
              clipPath: 'polygon(8% 0, 100% 0, 100% 75%, 92% 100%, 0 100%, 0 25%)',
              boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)',
            }}
          >
            {/* Hover glare effect */}
            <span className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
            
            <span className="flex items-center justify-center gap-2">
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  <span>Initializing...</span>
                </>
              ) : (
                <>
                  <span>ENTER THE ARENA</span>
                  <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                </>
              )}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default OnboardingModal;
