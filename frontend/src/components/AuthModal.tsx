import React, { useState } from 'react';
import { X, LogIn, UserPlus, Shield, User, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { User as UserType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [occupants, setOccupants] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isRegister) {
        const res = await api.register({
          email,
          password,
          full_name: fullName,
          occupants,
          address: '142 Cedar Heights',
          district: 'Green Valley District',
        });
        onAuthSuccess(res.user);
        onClose();
      } else {
        const res = await api.login(email, password);
        onAuthSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'resident' | 'utility_admin') => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.demoLogin(role);
      onAuthSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            {isRegister ? <UserPlus className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {isRegister ? 'Create Resident Account' : 'Sign In to AquaPulse'}
            </h3>
            <p className="text-xs text-slate-400">Intelligent Water Consumption Forecasting System</p>
          </div>
        </div>

        {/* Quick Demo Login Buttons */}
        <div className="mb-6 p-3.5 bg-gradient-to-r from-cyan-950/40 via-blue-950/40 to-slate-900 border border-cyan-800/40 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Instant Demo Evaluation</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoLogin('resident')}
              className="px-3 py-2 text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg transition flex items-center justify-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Resident Demo</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoLogin('utility_admin')}
              className="px-3 py-2 text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg transition flex items-center justify-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Utility Admin Demo</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jordan Smith"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Household Occupants
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={occupants}
                  onChange={(e) => setOccupants(parseInt(e.target.value) || 3)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="resident@aquapulse.io"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-600/30 transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegister ? 'Create Resident Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
            className="text-xs text-slate-400 hover:text-cyan-400 transition"
          >
            {isRegister
              ? 'Already registered? Sign in here'
              : "Don't have an account? Register a new residence"}
          </button>
        </div>
      </div>
    </div>
  );
};

