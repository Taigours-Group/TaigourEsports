import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const TeamRegistrationForm = ({ tournament, onSubmit, onCancel, isSubmitting }) => {
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    // Basic Details
    registrantEmail: '',
    // Team Information
    teamName: '',
    teamTag: '',
    teamLogo: null,
    teamLogoPreview: '',
    // Team Manager Details
    managerFullName: '',
    managerContactNumber: '',
    // Player Details (determined by team_size)
    players: Array.from(
      { length: tournament?.team_size || (tournament?.game?.includes('PUBG') ? 5 : tournament?.game?.includes('Free Fire') ? 4 : 1) },
      (_, i) => ({ id: i + 1, fullName: '', uid: '', citizenshipPhoto: null, citizenshipPhotoPreview: '' })
    )
  });

  // Auto-fill registrant email if logged in
  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({
        ...prev,
        registrantEmail: user.email
      }));
    }
    if (profile?.full_name) {
      setFormData(prev => ({
        ...prev,
        managerFullName: profile.full_name
      }));
    }
    if (profile?.contact_info) {
      setFormData(prev => ({
        ...prev,
        managerContactNumber: profile.contact_info
      }));
    }
  }, [user, profile]);

  const validateStep = (step) => {
    const errors = {};

    if (step === 1) {
      if (!formData.registrantEmail.trim()) errors.registrantEmail = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.registrantEmail)) {
        errors.registrantEmail = 'Invalid email format';
      }
    }

    if (step === 2) {
      if (!formData.teamName.trim()) errors.teamName = 'Team name is required';
      if (!formData.teamTag.trim()) errors.teamTag = 'Team tag is required';
      if (!formData.teamLogo) errors.teamLogo = 'Team logo is required';
    }

    if (step === 3) {
      if (!formData.managerFullName.trim()) errors.managerFullName = 'Manager full name is required';
      if (!formData.managerContactNumber.trim()) errors.managerContactNumber = 'Contact number is required';
      else if (!/^[+]?[\d\s-()]{7,}$/.test(formData.managerContactNumber.replace(/\s/g, ''))) {
        errors.managerContactNumber = 'Invalid phone number format';
      }
    }

    if (step === 4) {
      formData.players.forEach((player, idx) => {
        if (!player.fullName.trim()) {
          errors[`player_${idx}_name`] = `Player ${idx + 1} name is required`;
        }
        if (!player.uid.trim()) {
          errors[`player_${idx}_uid`] = `Player ${idx + 1} UID is required`;
        }
        if (!player.citizenshipPhoto) {
          errors[`player_${idx}_photo`] = `Player ${idx + 1} citizenship photo is required`;
        }
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleFileChange = (field, file) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          [field]: file,
          [field + 'Preview']: reader.result
        }));
        if (formErrors[field]) {
          setFormErrors(prev => ({
            ...prev,
            [field]: ''
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlayerChange = (playerIndex, field, value) => {
    const updatedPlayers = [...formData.players];
    updatedPlayers[playerIndex] = {
      ...updatedPlayers[playerIndex],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      players: updatedPlayers
    }));
    if (formErrors[`player_${playerIndex}_${field}`]) {
      setFormErrors(prev => ({
        ...prev,
        [`player_${playerIndex}_${field}`]: ''
      }));
    }
  };

  const handlePlayerFileChange = (playerIndex, file) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedPlayers = [...formData.players];
        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          citizenshipPhoto: file,
          citizenshipPhotoPreview: reader.result
        };
        setFormData(prev => ({
          ...prev,
          players: updatedPlayers
        }));
        if (formErrors[`player_${playerIndex}_photo`]) {
          setFormErrors(prev => ({
            ...prev,
            [`player_${playerIndex}_photo`]: ''
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // addPlayer and removePlayer functions have been removed as team size is now strictly enforced

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateStep(4)) {
      onSubmit(formData);
    }
  };

  const progressSteps = [
    { number: 1, label: 'Basic Info', icon: 'fa-envelope' },
    { number: 2, label: 'Team Details', icon: 'fa-users' },
    { number: 3, label: 'Manager Info', icon: 'fa-user' },
    { number: 4, label: 'Players', icon: 'fa-gamepad' }
  ];

  return (
    <div className="w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
      {/* Progress Indicator */}
      <div className="sticky top-0 bg-bg-dark/95 backdrop-blur-sm z-10 p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-orbitron font-black text-white uppercase">
            Team Registration - Step {currentStep}/4
          </h3>
          <span className="text-xs font-bold text-primary uppercase">{Math.round((currentStep / 4) * 100)}%</span>
        </div>
        <div className="flex gap-2">
          {progressSteps.map((step) => (
            <div key={step.number} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full h-2 rounded-full transition-all ${
                  step.number <= currentStep ? 'bg-primary' : 'bg-white/10'
                }`}
              ></div>
              <span className="text-[10px] font-bold text-gray-400 text-center">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
        {/* Step 1: Basic Details */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-orbitron font-black text-white mb-2 flex items-center gap-2">
                <i className="fa-solid fa-envelope text-primary"></i> Basic Information
              </h2>
              <p className="text-sm text-gray-400">Enter the email of the person registering the team</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2 uppercase tracking-widest">
                Email Address <span className="text-pink">*</span>
              </label>
              <input
                type="email"
                value={formData.registrantEmail}
                onChange={(e) => handleInputChange('registrantEmail', e.target.value)}
                placeholder="your.email@example.com"
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-600 focus:outline-none transition-all ${
                  formErrors.registrantEmail ? 'border-pink' : 'border-white/10 focus:border-primary'
                }`}
                disabled={!!user?.email}
              />
              {formErrors.registrantEmail && (
                <p className="mt-1 text-xs text-pink font-bold">{formErrors.registrantEmail}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Team Details */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-orbitron font-black text-white mb-2 flex items-center gap-2">
                <i className="fa-solid fa-users text-primary"></i> Team Information
              </h2>
              <p className="text-sm text-gray-400">Tell us about your team</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-white mb-2 uppercase tracking-widest">
                  Team Name <span className="text-pink">*</span>
                </label>
                <input
                  type="text"
                  value={formData.teamName}
                  onChange={(e) => handleInputChange('teamName', e.target.value)}
                  placeholder="e.g., Phoenix Warriors"
                  className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-600 focus:outline-none transition-all ${
                    formErrors.teamName ? 'border-pink' : 'border-white/10 focus:border-primary'
                  }`}
                />
                {formErrors.teamName && (
                  <p className="mt-1 text-xs text-pink font-bold">{formErrors.teamName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-2 uppercase tracking-widest">
                  Team Tag <span className="text-pink">*</span>
                </label>
                <input
                  type="text"
                  value={formData.teamTag}
                  onChange={(e) => handleInputChange('teamTag', e.target.value.toUpperCase())}
                  placeholder="e.g., PW"
                  maxLength="10"
                  className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-600 focus:outline-none transition-all ${
                    formErrors.teamTag ? 'border-pink' : 'border-white/10 focus:border-primary'
                  }`}
                />
                {formErrors.teamTag && (
                  <p className="mt-1 text-xs text-pink font-bold">{formErrors.teamTag}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2 uppercase tracking-widest">
                Team Logo <span className="text-pink">*</span>
              </label>
              <div className="relative">
                {formData.teamLogoPreview ? (
                  <div className="relative w-full h-48 bg-white/5 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center">
                    <img src={formData.teamLogoPreview} alt="Team Logo Preview" className="max-h-full max-w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => handleInputChange('teamLogo', null)}
                      className="absolute top-2 right-2 bg-pink/20 hover:bg-pink/40 text-pink px-3 py-1 rounded text-xs font-bold"
                    >
                      REMOVE
                    </button>
                  </div>
                ) : (
                  <label className={`w-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                    formErrors.teamLogo ? 'border-pink' : 'border-white/20 hover:border-primary'
                  } bg-white/5 hover:bg-white/10`}>
                    <div className="text-center">
                      <i className="fa-solid fa-cloud-arrow-up text-3xl text-primary/50 mb-2"></i>
                      <p className="text-white font-bold text-sm">Click to upload Team Logo</p>
                      <p className="text-gray-500 text-xs">PNG, JPG up to 2MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange('teamLogo', e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {formErrors.teamLogo && (
                <p className="mt-1 text-xs text-pink font-bold">{formErrors.teamLogo}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Team Manager Details */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-orbitron font-black text-white mb-2 flex items-center gap-2">
                <i className="fa-solid fa-user text-primary"></i> Team Manager Details
              </h2>
              <p className="text-sm text-gray-400">Information about the team manager/captain</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2 uppercase tracking-widest">
                Full Real Name <span className="text-pink">*</span>
              </label>
              <input
                type="text"
                value={formData.managerFullName}
                onChange={(e) => handleInputChange('managerFullName', e.target.value)}
                placeholder="e.g., John Doe"
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-600 focus:outline-none transition-all ${
                  formErrors.managerFullName ? 'border-pink' : 'border-white/10 focus:border-primary'
                }`}
              />
              {formErrors.managerFullName && (
                <p className="mt-1 text-xs text-pink font-bold">{formErrors.managerFullName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2 uppercase tracking-widest">
                Contact Number <span className="text-pink">*</span>
              </label>
              <input
                type="tel"
                value={formData.managerContactNumber}
                onChange={(e) => handleInputChange('managerContactNumber', e.target.value)}
                placeholder="+977 9800000000 or 9800000000"
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-600 focus:outline-none transition-all ${
                  formErrors.managerContactNumber ? 'border-pink' : 'border-white/10 focus:border-primary'
                }`}
              />
              {formErrors.managerContactNumber && (
                <p className="mt-1 text-xs text-pink font-bold">{formErrors.managerContactNumber}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Player Details */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-orbitron font-black text-white mb-2 flex items-center gap-2">
                <i className="fa-solid fa-gamepad text-primary"></i> Team Roster
              </h2>
              <p className="text-sm text-gray-400">Please provide details for all {formData.players.length} required players</p>
            </div>

            {formData.players.map((player, index) => (
              <div
                key={player.id}
                className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-orbitron font-bold text-white">Player {index + 1}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-white mb-2 uppercase tracking-widest">
                      Full Real Name <span className="text-pink">*</span>
                    </label>
                    <input
                      type="text"
                      value={player.fullName}
                      onChange={(e) => handlePlayerChange(index, 'fullName', e.target.value)}
                      placeholder="Player name"
                      className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-600 focus:outline-none transition-all ${
                        formErrors[`player_${index}_name`] ? 'border-pink' : 'border-white/10 focus:border-primary'
                      }`}
                    />
                    {formErrors[`player_${index}_name`] && (
                      <p className="mt-1 text-xs text-pink font-bold">{formErrors[`player_${index}_name`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-white mb-2 uppercase tracking-widest">
                      Game UID <span className="text-pink">*</span>
                    </label>
                    <input
                      type="text"
                      value={player.uid}
                      onChange={(e) => handlePlayerChange(index, 'uid', e.target.value)}
                      placeholder="Player UID/ID"
                      className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-600 focus:outline-none transition-all ${
                        formErrors[`player_${index}_uid`] ? 'border-pink' : 'border-white/10 focus:border-primary'
                      }`}
                    />
                    {formErrors[`player_${index}_uid`] && (
                      <p className="mt-1 text-xs text-pink font-bold">{formErrors[`player_${index}_uid`]}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2 uppercase tracking-widest">
                    Citizenship Photo <span className="text-pink">*</span>
                  </label>
                  {player.citizenshipPhotoPreview ? (
                    <div className="relative w-full h-40 bg-white/5 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center">
                      <img src={player.citizenshipPhotoPreview} alt="Citizenship Photo" className="max-h-full max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => handlePlayerChange(index, 'citizenshipPhoto', null)}
                        className="absolute top-2 right-2 bg-pink/20 hover:bg-pink/40 text-pink px-3 py-1 rounded text-xs font-bold"
                      >
                        REMOVE
                      </button>
                    </div>
                  ) : (
                    <label className={`w-full h-40 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                      formErrors[`player_${index}_photo`] ? 'border-pink' : 'border-white/20 hover:border-primary'
                    } bg-white/5 hover:bg-white/10`}>
                      <div className="text-center">
                        <i className="fa-solid fa-id-card text-2xl text-primary/50 mb-2"></i>
                        <p className="text-white font-bold text-sm">Upload Citizenship Photo</p>
                        <p className="text-gray-500 text-xs">PNG, JPG up to 2MB</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePlayerFileChange(index, e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  )}
                  {formErrors[`player_${index}_photo`] && (
                    <p className="mt-1 text-xs text-pink font-bold">{formErrors[`player_${index}_photo`]}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Add/Remove player buttons removed to enforce strict team size */}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 sticky bottom-0 bg-bg-dark/95 backdrop-blur-sm -mx-6 -mb-6 px-6 py-4 border-t border-white/10">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevStep}
              className="flex-1 py-3 border border-white/20 text-white font-bold rounded-lg hover:bg-white/5 transition-all"
            >
              <i className="fa-solid fa-chevron-left mr-2"></i> PREVIOUS
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-1 py-3 bg-primary text-dark font-bold rounded-lg hover:bg-primary/80 transition-all"
            >
              NEXT <i className="fa-solid fa-chevron-right ml-2"></i>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-primary text-dark font-bold rounded-lg hover:bg-primary/80 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i> REGISTERING...
                </>
              ) : (
                <>
                  COMPLETE REGISTRATION <i className="fa-solid fa-check ml-2"></i>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="py-3 px-6 border border-white/20 text-white font-bold rounded-lg hover:bg-white/5 transition-all"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeamRegistrationForm;