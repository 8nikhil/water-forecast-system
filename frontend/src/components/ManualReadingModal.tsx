import React, { useState } from 'react';
import { X, Gauge, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { ProvenanceBadge } from './ProvenanceBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManualReadingModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [dialValue, setDialValue] = useState<string>('148.650');
  const [notes, setNotes] = useState<string>('Monthly basement meter dial verification');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const val = parseFloat(dialValue);
    if (isNaN(val) || val <= 0) {
      setError('Please provide a valid positive meter reading number.');
      return;
    }

    setLoading(true);
    try {
      await api.logManualDialReading(val, notes);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit manual reading.');
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

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Log Manual Dial Reading</h3>
            <p className="text-xs text-slate-400">Record physical meter reading directly from utility dial</p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl flex items-center justify-between">
          <div className="text-xs text-purple-300">
            Recorded provenance:
          </div>
          <ProvenanceBadge provenance="user_entered" size="sm" />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Manual reading logged successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Cumulative Dial Reading (m³ or Total Liters)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0"
                value={dialValue}
                onChange={(e) => setDialValue(e.target.value)}
                required
                placeholder="e.g. 148.650"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-750 rounded-xl text-white font-mono text-base focus:outline-none focus:border-purple-500 transition"
              />
              <span className="absolute right-4 top-2.5 text-xs text-slate-400 font-mono">m³</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Read all black and red digits displayed on your mechanical meter dial.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Verification Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Basement main meter check"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-750 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
            >
              {loading ? 'Submitting...' : 'Confirm & Log Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

