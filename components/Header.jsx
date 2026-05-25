
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { user, profile, loading, loginWithGoogle, loginWithApple, loginWithFacebook, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { name: 'Home', path: '/', icon: 'fa-house' },
    { name: 'Arena', path: '/tournaments', icon: 'fa-crosshairs' },
    { name: 'Ranks', path: '/leaderboard', icon: 'fa-crown' },
    { name: 'Live', path: '/streams', icon: 'fa-bolt' },
  ];

  const getUserDisplayName = () => {
    if (profile?.username) return profile.username;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Player';
  };

  const getUserAvatar = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    if (user?.user_metadata?.avatar_url) return user.user_metadata.avatar_url;
    return null;
  };

  return (
    <>
      {/* ─── Desktop Top Bar ─── */}
      <nav
        id="desktop-navbar"
        className={`fixed top-0 w-full z-[100] transition-all duration-500 hidden md:block ${
          isScrolled
            ? 'py-2'
            : 'py-4'
        }`}
        style={{
          background: isScrolled
            ? 'rgba(7, 7, 9, 0.82)'
            : 'linear-gradient(180deg, rgba(7,7,9,0.7) 0%, transparent 100%)',
          backdropFilter: isScrolled ? 'blur(24px) saturate(180%)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(24px) saturate(180%)' : 'none',
          borderBottom: isScrolled ? '1px solid rgba(0, 212, 255, 0.08)' : '1px solid transparent',
        }}
      >
        <div className="container mx-auto px-6 flex items-center justify-between">
          {/* ─── Logo ─── */}
          <Link to="/" className="flex items-center gap-3 group relative z-10" id="nav-logo">
            <div className="relative">
              <img
                src="https://res.cloudinary.com/dbjjzyrr3/image/upload/v1768567786/tiger-logo_jcf2zj.png"
                className="w-10 h-10 group-hover:rotate-[360deg] transition-transform duration-1000 relative z-10"
                alt="Taigour"
              />
              <div className="absolute -inset-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.25) 0%, transparent 70%)' }}
              ></div>
            </div>
            <div className="flex flex-col">
              <span className="font-orbitron font-black text-white text-lg tracking-tighter leading-none flex items-center gap-1.5">
                TAIGOUR
                <span className="w-1.5 h-1.5 bg-tertiary rounded-full shadow-[0_0_8px_#00ff80]"
                  style={{ animation: 'navPulse 2s ease-in-out infinite' }}
                ></span>
              </span>
              <span className="font-orbitron font-bold text-[9px] tracking-[0.4em] uppercase leading-none mt-0.5"
                style={{ color: '#00d4ff' }}
              >
                E-Sports
              </span>
            </div>
          </Link>

          {/* ─── Center Navigation Pill ─── */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              className="flex items-center gap-1 px-2 py-1.5 rounded-full relative"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3)',
              }}
              id="nav-pill"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="relative px-5 py-2 rounded-full transition-all duration-300 group"
                  id={`nav-link-${link.name.toLowerCase()}`}
                  style={{
                    background: isActive(link.path)
                      ? 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(0,212,255,0.05) 100%)'
                      : 'transparent',
                    boxShadow: isActive(link.path)
                      ? '0 0 20px rgba(0,212,255,0.1), inset 0 1px 0 rgba(0,212,255,0.1)'
                      : 'none',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <i className={`fa-solid ${link.icon} text-[10px] transition-all duration-300 ${
                      isActive(link.path)
                        ? 'text-primary drop-shadow-[0_0_6px_rgba(0,212,255,0.5)]'
                        : 'text-gray-500 group-hover:text-gray-300'
                    }`}></i>
                    <span className={`font-orbitron font-bold text-[11px] uppercase tracking-widest transition-all duration-300 ${
                      isActive(link.path)
                        ? 'text-primary'
                        : 'text-gray-400 group-hover:text-white'
                    }`}>
                      {link.name}
                    </span>
                  </div>
                  {/* Active indicator dot */}
                  {isActive(link.path) && (
                    <span
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{
                        background: '#00d4ff',
                        boxShadow: '0 0 8px #00d4ff, 0 0 16px rgba(0,212,255,0.3)',
                      }}
                    ></span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* ─── Right Side: User / Auth ─── */}
          <div className="flex items-center gap-3 relative z-10">
            {loading ? (
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 pl-3 pr-1.5 py-1.5 rounded-full transition-all duration-300 group cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                  id="user-menu-button"
                >
                  <span className="font-orbitron font-bold text-[10px] text-gray-300 uppercase tracking-wider group-hover:text-white transition-colors">
                    {getUserDisplayName()}
                  </span>
                  <div className="relative">
                    {getUserAvatar() ? (
                      <img
                        src={getUserAvatar()}
                        alt="avatar"
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-orbitron font-black text-xs text-primary ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all"
                        style={{ background: 'rgba(0,212,255,0.1)' }}
                      >
                        {getUserDisplayName().charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-tertiary rounded-full border-2 border-bg-dark"
                      style={{ boxShadow: '0 0 6px #00ff80' }}
                    ></span>
                  </div>
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <div
                    className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden animate-fade-in"
                    style={{
                      background: 'rgba(15, 15, 19, 0.95)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,255,0.05)',
                    }}
                    id="user-dropdown"
                  >
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="font-orbitron font-bold text-xs text-white truncate">{getUserDisplayName()}</p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{user.email}</p>
                    </div>
                    <div className="py-1 border-b border-white/5">
                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-3 text-gray-400 hover:text-primary hover:bg-white/5 transition-all cursor-pointer"
                        id="profile-button"
                      >
                        <i className="fa-solid fa-circle-user text-xs"></i>
                        <span className="font-orbitron font-bold text-[10px] uppercase tracking-wider">My Profile</span>
                      </Link>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { logout(); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-3 text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all cursor-pointer"
                        id="logout-button"
                      >
                        <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                        <span className="font-orbitron font-bold text-[10px] uppercase tracking-wider">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 group cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(0,212,255,0.05) 100%)',
                  border: '1px solid rgba(0,212,255,0.2)',
                  boxShadow: '0 0 20px rgba(0,212,255,0.08)',
                }}
                id="sign-in-button"
              >
                <i className="fa-brands fa-google text-xs text-primary group-hover:scale-110 transition-transform"></i>
                <span className="font-orbitron font-bold text-[10px] text-primary uppercase tracking-wider">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Mobile Top Bar (minimal, just logo) ─── */}
      <nav
        className={`fixed top-0 w-full z-[100] transition-all duration-300 md:hidden ${
          isScrolled ? 'bg-bg-dark/80 backdrop-blur-lg border-b border-primary/10 py-3 shadow-2xl' : 'bg-transparent py-5'
        }`}
      >
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <img
                src="https://res.cloudinary.com/dbjjzyrr3/image/upload/v1768567786/tiger-logo_jcf2zj.png"
                className="w-10 h-10 group-hover:rotate-[360deg] transition-transform duration-1000"
                alt="Taigour"
              />
              <div className="absolute -inset-1 bg-primary/20 blur-lg rounded-full animate-pulse"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-orbitron font-black text-white text-lg tracking-tighter leading-none flex items-center gap-1.5">
                TAIGOUR <span className="w-1.5 h-1.5 bg-tertiary rounded-full animate-pulse shadow-[0_0_8px_#00ff80]"></span>
              </span>
              <span className="text-primary font-orbitron font-bold text-[8px] tracking-[0.4em] uppercase leading-none mt-1">E-Sports</span>
            </div>
          </Link>

          {/* Mobile Auth Menu */}
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
            ) : user ? (
              <Link to="/profile" className="relative group block">
                {getUserAvatar() ? (
                  <img
                    src={getUserAvatar()}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-orbitron font-black text-[10px] text-primary ring-2 ring-primary/30"
                    style={{ background: 'rgba(0,212,255,0.1)' }}
                  >
                    {getUserDisplayName().charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-tertiary rounded-full border-2 border-bg-dark animate-pulse"
                  style={{ boxShadow: '0 0 6px #00ff80' }}
                ></span>
              </Link>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all duration-300 group cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(0,212,255,0.05) 100%)',
                  border: '1px solid rgba(0,212,255,0.2)',
                  boxShadow: '0 0 10px rgba(0,212,255,0.08)',
                }}
              >
                <i className="fa-brands fa-google text-[9px] text-primary"></i>
                <span className="font-orbitron font-bold text-[8px] text-primary uppercase tracking-widest">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Mobile Bottom Navigation ─── */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-[100] bottom-nav-glass mobile-safe-bottom">
        <div className="flex justify-around items-center h-16">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex flex-col items-center justify-center w-full h-full relative transition-all duration-300 ${isActive(link.path) ? 'text-primary' : 'text-gray-500'}`}
            >
              {isActive(link.path) && (
                <div className="absolute top-0 w-12 h-[3px] bg-primary rounded-b-full shadow-[0_0_15px_#00d4ff]"></div>
              )}
              <i className={`fa-solid ${link.icon} text-lg mb-1 ${isActive(link.path) ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]' : ''}`}></i>
              <span className="text-[9px] font-orbitron font-black uppercase tracking-widest">{link.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default Header;
