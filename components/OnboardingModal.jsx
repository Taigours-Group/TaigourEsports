import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const OnboardingModal = () => {
  const { user, profile, loading, reloadProfile } = useAuth();
  
  // Show onboarding if there's a user, not loading, and NO profile yet
  // Or if profile exists but somehow missing age
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
    
    if (!formData.full_name || !formData.age || !formData.contact_info) {
      setError('Please fill in all fields');
      return;
    }
    
    setSubmitting(true);
    
    const profileData = {
      email: user.email,
      full_name: formData.full_name,
      avatar_url: user.user_metadata?.avatar_url || '',
      age: parseInt(formData.age),
      contact_info: formData.contact_info
    };
    
    const { error: submitError } = await authService.createProfile(user.id, profileData);
    
    if (submitError) {
      setError('Failed to save profile: ' + submitError.message);
      setSubmitting(false);
    } else {
      await reloadProfile(); // Refresh profile state to hide modal
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-bg-dark border border-primary/20 rounded-xl p-8 max-w-md w-full shadow-[0_0_30px_rgba(0,212,255,0.1)] relative overflow-hidden">
        
        {/* Decor */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
        
        <h2 className="font-orbitron font-bold text-2xl text-white mb-2 uppercase tracking-wide">
          Complete Profile
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Welcome! We need a few more details to set up your player profile.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-primary/80 font-orbitron text-xs uppercase tracking-wider mb-1">
              Player Name
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full bg-black/50 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
              placeholder="Your Gamertag / Name"
            />
          </div>

          <div>
            <label className="block text-primary/80 font-orbitron text-xs uppercase tracking-wider mb-1">
              Age
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="w-full bg-black/50 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
              placeholder="Your Age (e.g., 21)"
              min="10"
              max="100"
            />
          </div>

          <div>
            <label className="block text-primary/80 font-orbitron text-xs uppercase tracking-wider mb-1">
              Contact Info (Phone/Discord)
            </label>
            <input
              type="text"
              name="contact_info"
              value={formData.contact_info}
              onChange={handleChange}
              className="w-full bg-black/50 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
              placeholder="Phone number or Discord tag"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-6 bg-primary/20 border border-primary text-primary font-orbitron font-bold py-3 rounded hover:bg-primary hover:text-bg-dark transition-all duration-300 uppercase tracking-widest disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Enter the Arena'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OnboardingModal;
