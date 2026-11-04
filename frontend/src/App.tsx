import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingView } from './views/LandingView';
import { DashboardView } from './views/DashboardView';
import { AnalyticsView } from './views/AnalyticsView';
import { ForecastingView } from './views/ForecastingView';
import { AnomaliesView } from './views/AnomaliesView';
import { RecommendationsView } from './views/RecommendationsView';
import { CommunityView } from './views/CommunityView';
import { ReportsView } from './views/ReportsView';
import { AdminView } from './views/AdminView';
import { WeatherImpactView } from './views/WeatherImpactView';
import { ModelMetricsView } from './views/ModelMetricsView';
import { ConservationView } from './views/ConservationView';

import { ManualReadingModal } from './components/ManualReadingModal';
import { SimulatorModal } from './components/SimulatorModal';
import { CsvImportModal } from './components/CsvImportModal';
import { AuthModal } from './components/AuthModal';

import { api } from './services/api';
import {
  User,
  DashboardSummary,
  TrendPoint,
  HourlyPoint,
  EndUseResponse,
  ForecastResponse,
  AnomalyEvent,
  Recommendation,
  ComparisonReport,
} from './types';
import { Droplets, Sparkles, Heart } from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'landing';
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setCurrentView(hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('aquapulse_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  // App core data states
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [endUse, setEndUse] = useState<EndUseResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);

  // Modals
  const [manualModalOpen, setManualModalOpen] = useState<boolean>(false);
  const [simulatorModalOpen, setSimulatorModalOpen] = useState<boolean>(false);
  const [csvModalOpen, setCsvModalOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  // Initial load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Try getting existing session or auto-demo login as resident
        const token = localStorage.getItem('aquapulse_token');
        if (token) {
          try {
            const me = await api.getMe();
            setCurrentUser(me);
            await loadAllUserData();
            return;
          } catch (e) {
            localStorage.removeItem('aquapulse_token');
          }
        }
        
        // Auto initialize as demo resident so all screens work immediately out of the box
        const demoAuth = await api.demoLogin('resident');
        setCurrentUser(demoAuth.user);
        await loadAllUserData();
      } catch (err) {
        console.error('Initialization error', err);
      }
    };

    initializeAuth();
  }, []);

  const loadAllUserData = async () => {
    try {
      const [sumRes, trendsRes, hourlyRes, endUseRes, fcastRes, anomRes, recsRes, compRes] =
        await Promise.allSettled([
          api.getDashboardSummary(),
          api.getTrends(30),
          api.getHourlyProfile(),
          api.getEndUse(),
          api.getForecast(14),
          api.getAnomalies(),
          api.getRecommendations(),
          api.getComparison(),
        ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (trendsRes.status === 'fulfilled') setTrends(trendsRes.value);
      if (hourlyRes.status === 'fulfilled') setHourly(hourlyRes.value);
      if (endUseRes.status === 'fulfilled') setEndUse(endUseRes.value);
      if (fcastRes.status === 'fulfilled') setForecast(fcastRes.value);
      if (anomRes.status === 'fulfilled') setAnomalies(anomRes.value);
      if (recsRes.status === 'fulfilled') setRecommendations(recsRes.value);
      if (compRes.status === 'fulfilled') setComparison(compRes.value);
    } catch (err) {
      console.error('Failed to load user data bundle', err);
    }
  };

  const handleQuickSwitchRole = async (role: 'resident' | 'utility_admin') => {
    try {
      const authRes = await api.demoLogin(role);
      setCurrentUser(authRes.user);
      await loadAllUserData();
      if (role === 'utility_admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('dashboard');
      }
    } catch (err) {
      console.error('Role switch failed', err);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setCurrentView('landing');
  };

  // Theme synchronization
  useEffect(() => {
    try {
      localStorage.setItem('aquapulse_theme', theme);
      const root = document.documentElement;
      if (theme === 'light') {
        root.classList.remove('dark', 'theme-dark');
        root.classList.add('light', 'theme-light');
      } else {
        root.classList.remove('light', 'theme-light');
        root.classList.add('dark', 'theme-dark');
      }
    } catch (e) {
      console.error('Failed to sync theme', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const activeAlertsCount = anomalies.filter(
    (a) => a.status === 'active' || a.status === 'investigating'
  ).length;

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-cyan-500 selection:text-white transition-colors duration-150 ${
        theme === 'light'
          ? 'theme-light bg-slate-50 text-slate-800'
          : 'theme-dark bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenManualReading={() => setManualModalOpen(true)}
        onOpenSimulator={() => setSimulatorModalOpen(true)}
        onLogout={handleLogout}
        onQuickSwitchRole={handleQuickSwitchRole}
        activeAlertsCount={activeAlertsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'landing' && (
          <LandingView
            onExploreApp={(role) => {
              handleQuickSwitchRole(role);
            }}
            onOpenSimulator={() => setSimulatorModalOpen(true)}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardView
            summary={summary}
            trends={trends}
            anomalies={anomalies}
            recommendations={recommendations}
            currentUser={currentUser}
            onNavigate={setCurrentView}
            onOpenManualReading={() => setManualModalOpen(true)}
            onOpenSimulator={() => setSimulatorModalOpen(true)}
            onScanLeaks={loadAllUserData}
          />
        )}

        {currentView === 'analytics' && (
          <AnalyticsView
            trends={trends}
            hourly={hourly}
            endUse={endUse}
            onRefresh={loadAllUserData}
          />
        )}

        {currentView === 'forecasting' && (
          <ForecastingView
            initialForecast={forecast}
            onRefreshForecast={loadAllUserData}
          />
        )}

        {currentView === 'conservation' && <ConservationView />}

        {currentView === 'anomalies' && (
          <AnomaliesView
            anomalies={anomalies}
            onRefresh={loadAllUserData}
          />
        )}

        {currentView === 'recommendations' && (
          <RecommendationsView
            recommendations={recommendations}
            onRefresh={loadAllUserData}
          />
        )}

        {currentView === 'community' && (
          <CommunityView initialComparison={comparison} />
        )}

        {currentView === 'reports' && (
          <ReportsView onOpenCsvImport={() => setCsvModalOpen(true)} />
        )}

        {currentView === 'weather' && <WeatherImpactView />}

        {currentView === 'model-metrics' && <ModelMetricsView />}

        {currentView === 'admin' && <AdminView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-300">AquaPulse</span>
            <span>— Water Consumption Forecasting & Conservation Analytics Platform</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Municipal Utility Works</span>
            <span>•</span>
            <span>Residential Water Intelligence</span>
            <span>•</span>
            <span>Green Valley District</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ManualReadingModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onSuccess={loadAllUserData}
      />

      <SimulatorModal
        isOpen={simulatorModalOpen}
        onClose={() => setSimulatorModalOpen(false)}
        onSuccess={loadAllUserData}
      />

      <CsvImportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onSuccess={loadAllUserData}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          loadAllUserData();
          setCurrentView(user.role === 'utility_admin' ? 'admin' : 'dashboard');
        }}
      />
    </div>
  );
}

export default App;
