
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import AdminGate from './components/AdminGate.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import OnboardingModal from './components/OnboardingModal.jsx';
import Preloader from './components/Preloader.jsx';
import LegalLayout from './pages/LegalLayout.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { dbService } from './services/dbService.js';
import { balanceService } from './services/balanceService.js';
import { hydrateCatalogFromSupabase } from './constants/balanceConstants.js';

// Lazy load page components
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const TournamentsPage = lazy(() => import('./pages/TournamentsPage.jsx'));
const TournamentDetailsPage = lazy(() => import('./pages/TournamentDetailsPage.jsx'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage.jsx'));
const StreamsPage = lazy(() => import('./pages/StreamsPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const BecomePartnerPage = lazy(() => import('./pages/BecomePartnerPage.jsx'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage.jsx'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage.jsx'));
const LegalLandingPage = lazy(() => import('./pages/LegalLandingPage.jsx'));
const LegalPage = lazy(() => import('./pages/LegalLayout.jsx'));

const App = () => {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // App State - Initialized as empty arrays to prevent slice errors
  const [tournaments, setTournaments] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [streams, setStreams] = useState([]);
  const [registrations, setRegistrations] = useState([]); 
  const [logs, setLogs] = useState([]);

  const loadCatalog = useCallback(async () => {
    try {
      const { data, error } = await balanceService.getCatalog();
      if (!error && data) {
        hydrateCatalogFromSupabase(data);
      }
    } catch (error) {
      console.error('Failed to load catalog:', error);
    }
  }, []);

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
      await loadCatalog();
      await refetchAllData();
      setLoading(false);
    };
    initialLoad();
  }, [loadCatalog, refetchAllData]);

  // Re-fetch data when the logged-in user changes (login / logout)
  useEffect(() => {
    if (!loading) {
      refetchAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const RouteMeta = () => {
    const location = useLocation();

    useEffect(() => {
      const path = location.pathname.replace(/\/$/, '') || '/';
      const defaultMeta = {
        title: 'Taigour E-Sports | Nepal Esports Tournaments',
        description: 'Taigour E-Sports is Nepal’s premier esports tournament platform for PUBG Mobile, Free Fire, Ludo, live streams, leaderboards, and competitive gaming events.'
      };

      const routeMeta = {
        '/': defaultMeta,
        '/tournaments': {
          title: 'Find Nepal Esports Tournaments | Taigour E-Sports',
          description: 'Browse and register for PUBG Mobile, Free Fire, and Ludo tournaments across Nepal with Taigour E-Sports.'
        },
        '/leaderboard': {
          title: 'Leaderboard Rankings | Taigour E-Sports',
          description: 'Track top players and teams in Nepal esports tournaments with live leaderboard rankings.'
        },
        '/streams': {
          title: 'Live Esports Streams | Taigour E-Sports',
          description: 'Watch live competitive esports streams from Nepal gaming events and stay updated on current matches.'
        },
        '/profile': {
          title: 'Player Profile | Taigour E-Sports',
          description: 'Manage your player account and tournament registrations on Taigour E-Sports.'
        },
        '/admin': {
          title: 'Admin Dashboard | Taigour E-Sports',
          description: 'Manage tournaments, leaderboards, streams, and registrations on Taigour E-Sports.'
        },
        '/privacy-policy': {
          title: 'Privacy Policy | Taigour E-Sports',
          description: 'Read Taigour E-Sports privacy practices for our website, app, tournaments, and community services.'
        },
        '/terms-of-service': {
          title: 'Terms of Service | Taigour E-Sports',
          description: 'Review the rules and responsibilities for using Taigour E-Sports services and tournament platforms.'
        }
      };

      const meta = path.startsWith('/tournament')
        ? {
            title: 'Tournament Details | Taigour E-Sports',
            description: 'View tournament details and register for competitive esports events in Nepal.'
          }
        : routeMeta[path] || defaultMeta;

      const setMeta = (selector, value) => {
        const element = document.querySelector(selector);
        if (element) {
          element.setAttribute('content', value);
        }
      };

      document.title = meta.title;
      setMeta("meta[name='description']", meta.description);
      setMeta("meta[property='og:title']", meta.title);
      setMeta("meta[property='og:description']", meta.description);
      setMeta("meta[name='twitter:title']", meta.title);
      setMeta("meta[name='twitter:description']", meta.description);
    }, [location.pathname]);

    return null;
  };

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
      <RouteMeta />
      <div className="min-h-screen relative bg-bg-dark">
        {/* Hide global site header on admin route (admin has its own header) */}
        {window.location.pathname !== '/admin' && <Header />}

        {/* New-account onboarding: collect full name, age, game UID & contact right after login */}
        <OnboardingModal />

        <main className="min-h-[80vh]">
          <Routes>

              <Route path="/" element={<HomePage tournaments={tournaments} leaderboard={leaderboard} registrations={registrations} />} />
              <Route path="/tournaments" element={<TournamentsPage tournaments={tournaments} registrations={registrations} />} />
              <Route path="/tournament/:id" element={<TournamentDetailsPage tournaments={tournaments} onRegister={handleRegister} registrations={registrations} />} />
              <Route path="/leaderboard" element={<LeaderboardPage leaderboard={leaderboard} />} />
              <Route path="/streams" element={<StreamsPage streams={streams} />} />
              <Route path="/profile" element={<ProfilePage tournaments={tournaments} registrations={registrations} leaderboard={leaderboard} />} />
              <Route path="/become-partner" element={<BecomePartnerPage />} />
              <Route path="/legal" element={<LegalLandingPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms-of-service" element={<TermsOfServicePage />} />
              <Route path="/legal-layout" element={<LegalLayout />} />

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
