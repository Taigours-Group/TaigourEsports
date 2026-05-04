
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { user, profile, loading, loginWithGoogle, loginWithApple, loginWithFacebook, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { name: 'Home', path: '/', icon: 'fa-house' },
    { name: 'Arena', path: '/tournaments', icon: 'fa-crosshairs' },
    { name: 'Ranks', path: '/leaderboard', icon: 'fa-crown' },
    { name: 'Live', path: '/streams', icon: 'fa-bolt' },
  ];

  return (
    <>
      {/* Top Bar */}
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-300 ${isScrolled ? 'bg-bg-dark/80 backdrop-blur-lg border-b border-primary/10 py-3 shadow-2xl' : 'bg-transparent py-5'}`}>
        <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 md:gap-3 group">
            <div className="relative">
              <img 
                src="https://res.cloudinary.com/dbjjzyrr3/image/upload/v1768567786/tiger-logo_jcf2zj.png" 
                className="w-10 h-10 md:w-12 md:h-12 group-hover:rotate-[360deg] transition-transform duration-1000" 
                alt="Taigour" 
              />
              <div className="absolute -inset-1 bg-primary/20 blur-lg rounded-full animate-pulse"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-orbitron font-black text-white text-lg md:text-xl tracking-tighter leading-none flex items-center gap-1.5">
                TAIGOUR <span className="w-1.5 h-1.5 bg-tertiary rounded-full animate-pulse shadow-[0_0_8px_#00ff80]"></span>
              </span>
              <span className="text-primary font-orbitron font-bold text-[8px] md:text-[10px] tracking-[0.4em] uppercase leading-none mt-1">E-Sports</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-orbitron font-bold text-[11px] uppercase tracking-widest transition-all relative py-1 ${isActive(link.path) ? 'text-primary' : 'text-gray-400 hover:text-white'}`}
              >
                {link.name}
                {isActive(link.path) && (
                  <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-primary shadow-[0_0_10px_#00d4ff]"></span>
                )}
              </Link>
            ))}
          </div>

          
                  
                </div>

      </nav>

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
