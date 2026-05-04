
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import AdminGate from './components/AdminGate.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import Preloader from './components/Preloader.jsx';
import OnboardingModal from './components/OnboardingModal.jsx';
import { dbService } from './services/dbService.js';

// Lazy load page components
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const TournamentsPage = lazy(() => import('./pages/TournamentsPage.jsx'));
const TournamentDetailsPage = lazy(() => import('./pages/TournamentDetailsPage.jsx'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage.jsx'));
const StreamsPage = lazy(() => import('./pages/StreamsPage.jsx'));

const App = () => {
  const [loading, setLoading] = useState(true);
  
  // App State - Initialized as empty arrays to prevent slice errors
  const [tournaments, setTournaments] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [streams, setStreams] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Catch successful Mobile App returning logins (Deep Links)
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.addListener('appUrlOpen', (data) => {
        // When the mobile OS forces the app open, we check if it has the Supabase login token
        if (data.url && data.url.includes('access_token=')) {
          // Pass the hidden token hash from the OS directly into the web view!
          // Supabase's JS automatically detects this and logs the user in instantly.
          window.location.hash = new URL(data.url).hash;
        }
      });
    }

    // Check for mobile OAuth state errors
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'invalid_request' && params.get('error_code') === 'bad_oauth_state') {
      alert("Mobile Login Error: Please ensure your computer's local IP address (e.g., http://192.168.x.x:3000) is added to your Supabase project's 'Allowed Redirect URLs' instead of just localhost.");
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const loadInitialData = async () => {
      try {
        const [tournamentsData, leaderboardData, streamsData, registrationsData, logsData] = await Promise.all([
          dbService.getTournaments(),
          dbService.getLeaderboard(),
          dbService.getStreams(),
          dbService.getRegistrations(),
          dbService.getLogs()
        ]);
        setTournaments(tournamentsData);
        setLeaderboard(leaderboardData);
        setStreams(streamsData);
        setRegistrations(registrationsData);
        setLogs(logsData);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Handlers wrapped in useCallback and calling API
  const handleSaveTournaments = useCallback(async (data) => {
    try {
      const response = await fetch('/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setTournaments(data);
        const updatedLogs = await dbService.getLogs();
        setLogs(updatedLogs);
        return true;
      }
    } catch (error) {
      console.error('Failed to save tournaments:', error);
    }
    return false;
  }, []);

  const refetchTournaments = useCallback(async () => {
    const data = await dbService.getTournaments();
    setTournaments(data);
  }, []);

  const handleSaveLeaderboard = useCallback(async (data) => {
    try {
      const response = await fetch('/api/admin/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setLeaderboard(data);
        const updatedLogs = await dbService.getLogs();
        setLogs(updatedLogs);
        return true;
      }
    } catch (error) {
      console.error('Failed to save leaderboard:', error);
    }
    return false;
  }, []);

  const handleSaveStreams = useCallback(async (data) => {
    try {
      const response = await fetch('/api/admin/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setStreams(data);
        const updatedLogs = await dbService.getLogs();
        setLogs(updatedLogs);
        return true;
      }
    } catch (error) {
      console.error('Failed to save streams:', error);
    }
    return false;
  }, []);

  const handleSaveRegistrations = useCallback(async (data) => {
    // For registrations, we don't have a bulk update endpoint, so just update local state
    setRegistrations(data);
    const updatedLogs = await dbService.getLogs();
    setLogs(updatedLogs);
    return true;
  }, []);

  const handleRegister = useCallback(async (reg) => {
    // Registration is handled by the server endpoint, just update local state
    const updatedRegistrations = await dbService.getRegistrations();
    setRegistrations(updatedRegistrations);
    const updatedLogs = await dbService.getLogs();
    setLogs(updatedLogs);
  }, []);

  const handleRestore = useCallback(async (data) => {
    const success = await dbService.restoreDatabase(data);
    if (success) {
      const [tournamentsData, leaderboardData, streamsData, registrationsData, logsData] = await Promise.all([
        dbService.getTournaments(),
        dbService.getLeaderboard(),
        dbService.getStreams(),
        dbService.getRegistrations(),
        dbService.getLogs()
      ]);
      setTournaments(tournamentsData);
      setLeaderboard(leaderboardData);
      setStreams(streamsData);
      setRegistrations(registrationsData);
      setLogs(logsData);
    }
    return success;
  }, []);

  if (loading) return <Preloader />;

  return (
    <Router>
      <div className="min-h-screen relative bg-bg-dark">
        <Header />
        <OnboardingModal />
        
        <main className="min-h-[80vh]">
          <Routes>
            <Route path="/" element={<HomePage tournaments={tournaments} leaderboard={leaderboard} registrations={registrations} />} />
            <Route path="/tournaments" element={<TournamentsPage tournaments={tournaments} registrations={registrations} />} />
            <Route path="/tournament/:id" element={<TournamentDetailsPage tournaments={tournaments} onRegister={handleRegister} registrations={registrations} />} />
            <Route path="/leaderboard" element={<LeaderboardPage leaderboard={leaderboard} />} />
            <Route path="/streams" element={<StreamsPage streams={streams} />} />
            
            {/* Admin Route */}
            <Route path="/admin" element={
              <AdminGate>
                <AdminPanel
                  tournaments={tournaments}
                  saveTournaments={handleSaveTournaments}
                  refetchTournaments={refetchTournaments}
                  leaderboard={leaderboard}
                  saveLeaderboard={handleSaveLeaderboard}
                  streams={streams}
                  saveStreams={handleSaveStreams}
                  registrations={registrations}
                  saveRegistrations={handleSaveRegistrations}
                  systemLogs={logs}
                  onRestore={handleRestore}
                />
              </AdminGate>
            } />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;
