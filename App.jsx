
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import AdminGate from './components/AdminGate.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import Preloader from './components/Preloader.jsx';
import OnboardingModal from './components/OnboardingModal.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { dbService } from './services/dbService.js';

// Lazy load page components
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const TournamentsPage = lazy(() => import('./pages/TournamentsPage.jsx'));
const TournamentDetailsPage = lazy(() => import('./pages/TournamentDetailsPage.jsx'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage.jsx'));
const StreamsPage = lazy(() => import('./pages/StreamsPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));

const App = () => {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // App State - Initialized as empty arrays to prevent slice errors
  const [tournaments, setTournaments] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [streams, setStreams] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [logs, setLogs] = useState([]);

  // Single shared data-fetch function — no duplication
  const refetchAllData = useCallback(async () => {
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
      console.error('Failed to load data:', error);
    }
  }, []);

  // Initial load + Capacitor deep-link / OAuth error handling
  useEffect(() => {
    // Handle native mobile deep links (Capacitor)
    if (window.Capacitor?.Plugins?.App) {
      window.Capacitor.Plugins.App.addListener('appUrlOpen', (data) => {
        if (data.url?.includes('access_token=')) {
          window.location.hash = new URL(data.url).hash;
        }
      });
    }

    // Alert on mobile OAuth state errors
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'invalid_request' && params.get('error_code') === 'bad_oauth_state') {
      alert("Mobile Login Error: Please ensure your computer's local IP address is added to your Supabase project's 'Allowed Redirect URLs'.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const initialLoad = async () => {
      await refetchAllData();
      setLoading(false);
    };
    initialLoad();
  }, [refetchAllData]);

  // Re-fetch data when the logged-in user changes (login / logout)
  useEffect(() => {
    if (!loading) {
      refetchAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Admin handlers ──────────────────────────────────────────────

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
    setRegistrations(data);
    const updatedLogs = await dbService.getLogs();
    setLogs(updatedLogs);
    return true;
  }, []);

  const handleRegister = useCallback(async () => {
    const updatedRegistrations = await dbService.getRegistrations();
    setRegistrations(updatedRegistrations);
    const updatedLogs = await dbService.getLogs();
    setLogs(updatedLogs);
  }, []);

  const handleRestore = useCallback(async (data) => {
    const success = await dbService.restoreDatabase(data);
    if (success) {
      await refetchAllData();
    }
    return success;
  }, [refetchAllData]);

  if (loading) return <Preloader />;

  return (
    <Router>
      <div className="min-h-screen relative bg-bg-dark">
        <Header />
        <OnboardingModal />

        <main className="min-h-[80vh]">
          {/* Suspense is required to support lazy-loaded pages */}
          <Suspense fallback={<Preloader />}>
            <Routes>
              <Route path="/" element={<HomePage tournaments={tournaments} leaderboard={leaderboard} registrations={registrations} />} />
              <Route path="/tournaments" element={<TournamentsPage tournaments={tournaments} registrations={registrations} />} />
              <Route path="/tournament/:id" element={<TournamentDetailsPage tournaments={tournaments} onRegister={handleRegister} registrations={registrations} />} />
              <Route path="/leaderboard" element={<LeaderboardPage leaderboard={leaderboard} />} />
              <Route path="/streams" element={<StreamsPage streams={streams} />} />
              <Route path="/profile" element={<ProfilePage tournaments={tournaments} registrations={registrations} leaderboard={leaderboard} />} />

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
          </Suspense>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;
