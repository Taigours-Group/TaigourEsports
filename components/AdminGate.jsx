
import React, { useState, useEffect, useCallback } from 'react';

const ADMIN_PASSWORD = 'Taigours2026';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export default function AdminGate({ children }) {
  const [input, setInput] = useState('');
  
  // Logic to verify if session is still valid
  const isSessionValid = useCallback(() => {
    const loginTime = localStorage.getItem('admin_login_time');
    if (!loginTime) return false;

    const now = new Date().getTime();
    const isExpired = now - parseInt(loginTime) > SESSION_TIMEOUT;

    if (isExpired) {
      localStorage.removeItem('admin_login_time');
      return false;
    }
    return true;
  }, []);

  const [isUnlocked, setIsUnlocked] = useState(isSessionValid());

  // Auto-logout effect: checks every minute if session expired
  useEffect(() => {
    if (!isUnlocked) return;

    const interval = setInterval(() => {
      if (!isSessionValid()) {
        setIsUnlocked(false);
      }
    }, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, [isUnlocked, isSessionValid]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      const now = new Date().getTime();
      localStorage.setItem('admin_login_time', now.toString());
      setIsUnlocked(true);
      setInput(''); // Clear input
    } else {
      alert("Incorrect Password");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_login_time');
    setIsUnlocked(false);
    // Optional: force a page reload to ensure all admin states are wiped
    window.location.href = '#/'; 
  };

  if (!isUnlocked) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#070709',
        color: '#fff',
        gap: '20px',
        fontFamily: 'Orbitron, sans-serif'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <i className="fa-solid fa-lock text-primary text-5xl mb-4 animate-pulse"></i>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            Restricted <span className="text-primary">Access</span>
          </h2>
          <p style={{ fontSize: '10px', color: '#555', marginTop: '5px', letterSpacing: '0.4em' }}>ENCRYPTED SECTOR</p>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="password" 
            autoFocus
            placeholder="ADMIN_PASS_KEY" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ 
              padding: '14px 20px', 
              borderRadius: '4px', 
              border: '1px solid #00d4ff33', 
              backgroundColor: '#0f0f13', 
              color: '#fff',
              outline: 'none',
              fontSize: '12px',
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: '700'
            }}
          />
          <button 
            type="submit" 
            className="cyber-button"
            style={{ 
              padding: '10px 25px', 
              backgroundColor: '#00d4ff', 
              color: '#000', 
              fontWeight: '900',
              cursor: 'pointer',
              border: 'none',
              fontSize: '10px',
              fontFamily: 'Orbitron, sans-serif'
            }}
          >
            DECRYPT
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={handleLogout} 
        className="font-orbitron font-black text-[9px] uppercase tracking-widest"
        style={{ 
          position: 'fixed', 
          top: '100px', 
          right: '24px', 
          zIndex: 9999,
          padding: '10px 20px',
          backgroundColor: '#ff0080',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          boxShadow: '0 0 15px rgba(255, 0, 128, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <i className="fa-solid fa-power-off"></i>
        Logout Admin
      </button>
      {children}
    </div>
  );
}
