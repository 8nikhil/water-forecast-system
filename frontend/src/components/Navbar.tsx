import React, { useState } from 'react';
import {
  Droplets,
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Users,
  FileSpreadsheet,
  ShieldAlert,
  Play,
  Gauge,
  User,
  LogOut,
  Menu,
  X,
  Compass,
  CloudSun,
  Sun,
  Moon,
  Cpu,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { User as UserType } from '../types';

interface Props {
  currentView: string;
  onSelectView: (view: string) => void;
  currentUser: UserType | null;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onOpenAuth: () => void;
  onOpenManualReading: () => void;
  onOpenSimulator: () => void;
  onLogout: () => void;
  onQuickSwitchRole: (role: 'resident' | 'utility_admin') => void;
  activeAlertsCount: number;
}

export const Navbar: React.FC<Props> = ({
  currentView,
  onSelectView,
  currentUser,
  theme = 'light',
  onToggleTheme,
  onOpenAuth,
  onOpenManualReading,
  onOpenSimulator,
  onLogout,
  onQuickSwitchRole,
  activeAlertsCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Live Monitor', icon: LayoutDashboard },
    { id: 'analytics', label: 'Usage Trends', icon: BarChart3 },
    { id: 'forecasting', label: 'Demand Forecasting', icon: TrendingUp },
    { id: 'conservation', label: 'Conservation Analytics', icon: ShieldCheck },
    { id: 'model-metrics', label: 'Model Diagnostics', icon: Cpu },
    { id: 'anomalies', label: 'Leak Alerts', icon: AlertTriangle, badge: activeAlertsCount > 0 ? activeAlertsCount : undefined },
    { id: 'weather', label: 'Weather Impact', icon: CloudSun },
    { id: 'recommendations', label: 'Conservation Tips', icon: Lightbulb },
    { id: 'reports', label: 'Audit Reports', icon: FileSpreadsheet },
    { id: 'admin', label: 'Admin & Datasets', icon: ShieldAlert },
  ];

  const handleNavClick = (viewId: string) => {
    onSelectView(viewId);
    setMobileMenuOpen(false);
  };

  const handleScrollToSection = (sectionId: string) => {
    if (currentView !== 'landing') {
      onSelectView('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const landingNavItems = [
    { id: 'solutions', label: 'Solutions' },
    { id: 'technology', label: 'Technology' },
    { id: 'impact', label: 'Impact' },
    { id: 'resources', label: 'Resources' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo & Platform Title */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => handleNavClick('landing')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-400 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Droplets className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-lg tracking-tight">AquaPulse</span>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Municipal Grid
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block truncate max-w-[280px]">
                Water Consumption Monitoring & Forecasting Platform
              </p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          {currentView === 'landing' ? (
            <nav className="hidden lg:flex items-center gap-2">
              {landingNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleScrollToSection(item.id)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          ) : (
            <nav className="hidden lg:flex items-center gap-1">
              <button
                onClick={() => handleNavClick('landing')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition flex items-center gap-1 mr-1"
                title="Return to Site Overview"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`relative px-2.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Action buttons & User Menu */}
          <div className="flex items-center gap-2.5">
            {currentView === 'landing' ? (
              <>
                {/* Theme Toggle Button */}
                {onToggleTheme && (
                  <button
                    onClick={onToggleTheme}
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    className="p-2 rounded-xl transition flex items-center justify-center bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-amber-400 hover:text-amber-300"
                    aria-label="Toggle theme"
                  >
                    {theme === 'light' ? (
                      <Sun className="w-4 h-4 fill-amber-400 text-amber-500" />
                    ) : (
                      <Moon className="w-4 h-4 fill-cyan-400/20 text-cyan-300" />
                    )}
                  </button>
                )}

                <button
                  onClick={() => handleNavClick('dashboard')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition flex items-center gap-2"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Launch Platform</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                {/* Live simulator trigger */}
                <button
                  onClick={onOpenSimulator}
                  title="Open Live Sensor & Leak Simulator"
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition"
                >
                  <Play className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simulator</span>
                </button>

                {/* Manual dial reading trigger */}
                <button
                  onClick={onOpenManualReading}
                  title="Record Homeowner Manual Meter Dial"
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition"
                >
                  <Gauge className="w-3.5 h-3.5 text-purple-400" />
                  <span>Log Dial</span>
                </button>

                {/* Quick Demo Switcher */}
                <div className="hidden md:flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-[11px]">
                  <button
                    onClick={() => onQuickSwitchRole('resident')}
                    className={`px-2 py-1 rounded-lg font-medium transition ${
                      currentUser?.role === 'resident'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Resident
                  </button>
                  <button
                    onClick={() => onQuickSwitchRole('utility_admin')}
                    className={`px-2 py-1 rounded-lg font-medium transition ${
                      currentUser?.role === 'utility_admin' || currentUser?.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Admin
                  </button>
                </div>

                {/* Theme Toggle Button */}
                {onToggleTheme && (
                  <button
                    onClick={onToggleTheme}
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    className="p-2 rounded-xl transition flex items-center justify-center bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-amber-400 hover:text-amber-300"
                    aria-label="Toggle theme"
                  >
                    {theme === 'light' ? (
                      <Sun className="w-4 h-4 fill-amber-400 text-amber-500" />
                    ) : (
                      <Moon className="w-4 h-4 fill-cyan-400/20 text-cyan-300" />
                    )}
                  </button>
                )}

                {/* User profile / Auth button */}
                {currentUser ? (
                  <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
                    <div className="hidden xl:block text-right">
                      <p className="text-xs font-semibold text-white leading-tight">{currentUser.full_name}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        {currentUser.role === 'utility_admin' ? 'Utility Director' : 'Elena Rostova'}
                      </p>
                    </div>
                    <button
                      onClick={onLogout}
                      title="Sign Out"
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onOpenAuth}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-md shadow-cyan-600/30 transition flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )}
              </>
            )}

            {/* Mobile menu hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-6 space-y-2 animate-fadeIn">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => { onOpenSimulator(); setMobileMenuOpen(false); }}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Simulator</span>
            </button>
            <button
              onClick={() => { onOpenManualReading(); setMobileMenuOpen(false); }}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-2"
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>Log Dial</span>
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-800 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Role:</span>
              <button
                onClick={() => { onQuickSwitchRole('resident'); setMobileMenuOpen(false); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${currentUser?.role === 'resident' ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
              >
                Resident
              </button>
              <button
                onClick={() => { onQuickSwitchRole('utility_admin'); setMobileMenuOpen(false); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${currentUser?.role === 'utility_admin' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
              >
                Admin
              </button>
            </div>

            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-slate-800 text-amber-400 border border-slate-700"
              >
                {theme === 'light' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 fill-amber-400" />
                    <span>Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 fill-cyan-400/20 text-cyan-300" />
                    <span>Dark</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Quick jump to sections */}
          <div className="grid grid-cols-4 gap-1.5 py-1.5 border-b border-slate-800 mb-2">
            {landingNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleScrollToSection(item.id)}
                className="py-1.5 px-2 text-[11px] font-semibold text-center rounded-lg text-slate-300 hover:bg-slate-800 bg-slate-950/80 border border-slate-800"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition ${isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};

