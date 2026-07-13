import React, { useState, useEffect, useCallback } from 'react';
import { adminLogin, adminLogout, isAdminAuthenticated } from '../services/adminAuth';

// SECURITY NOTE: this used to compare the typed password directly against
// import.meta.env.VITE_ADMIN_PASSWORD in the browser - Vite bundles VITE_
// prefixed env vars straight into the shipped JS, so that "secret" was
// readable by anyone who opened devtools, and no backend was ever actually
// checked. It now calls POST /api/admin/login, which verifies credentials
// server-side and returns a real JWT that every /api/admin/* route
// verifies via requireAdminRole.

export default function AdminGate({ children }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(isAdminAuthenticated());

  const handleSessionExpired = useCallback(() => setIsUnlocked(false), []);

  useEffect(() => {
    window.addEventListener('admin-session-expired', handleSessionExpired);
    return () => window.removeEventListener('admin-session-expired', handleSessionExpired);
  }, [handleSessionExpired]);

  // The token itself carries an expiry (checked in adminAuth.getAdminToken);
  // poll lightly just to reflect that in the UI if the tab is left open.
  useEffect(() => {
    if (!isUnlocked) return;
    const interval = setInterval(() => {
      if (!isAdminAuthenticated()) setIsUnlocked(false);
    }, 60000);
    return () => clearInterval(interval);
  }, [isUnlocked]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await adminLogin(username, password);
      setIsUnlocked(true);
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    adminLogout();
    setIsUnlocked(false);
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
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            autoFocus
            placeholder="ADMIN_USERNAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="ADMIN_PASS_KEY"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={inputStyle}
          />
          {error && (
            <p style={{ color: '#ff0080', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="cyber-button"
            style={{
              padding: '10px 25px',
              backgroundColor: '#00d4ff',
              color: '#000',
              fontWeight: '900',
              cursor: submitting ? 'wait' : 'pointer',
              border: 'none',
              fontSize: '10px',
              fontFamily: 'Orbitron, sans-serif',
              opacity: submitting ? 0.6 : 1
            }}
          >
            {submitting ? 'VERIFYING...' : 'DECRYPT'}
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

const inputStyle = {
  padding: '14px 20px',
  borderRadius: '4px',
  border: '1px solid #00d4ff33',
  backgroundColor: '#0f0f13',
  color: '#fff',
  outline: 'none',
  fontSize: '12px',
  fontFamily: 'Rajdhani, sans-serif',
  fontWeight: '700',
  width: '260px'
};
