import React, { useState } from 'react';
import { X, Play, Droplets, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { ProvenanceBadge } from './ProvenanceBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SimulatorModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [eventType, setEventType] = useState<'leak' | 'spike'>('leak');
  const [flowRate, setFlowRate] = useState<number>(18.5);
  const [loading, setLoading] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setLoading(true);
    setResultMessage(null);
    try {
      const res = await api.simulateEvent(eventType, flowRate);
      setResultMessage(res.message);
      setTimeout(() => {
        onSuccess();
        onClose();
        setResultMessage(null);
      }, 1500);
    } catch (err: any) {
      setResultMessage(err?.response?.data?.detail || 'Simulation injection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Play className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Live Telemetry & Anomaly Simulator</h3>
            <p className="text-xs text-slate-400">Inject synthetic meter streams to test detection & alerting algorithms</p>
          </div>
        </div>

        <div className="mb-5 p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl flex items-center justify-between">
          <span className="text-xs text-amber-300">Generated Data Provenance:</span>
          <ProvenanceBadge provenance="simulated" size="sm" />
        </div>

        {resultMessage && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{resultMessage}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Scenario to Inject
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setEventType('leak'); setFlowRate(18.5); }}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  eventType === 'leak'
                    ? 'bg-rose-500/15 border-rose-500 text-white'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className={`w-4 h-4 ${eventType === 'leak' ? 'text-rose-400' : 'text-slate-500'}`} />
                  <span className="text-sm font-semibold text-white">Continuous Night Leak</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Simulates a 24/7 toilet flapper or unsealed valve loss (15-25 L/h).
                </p>
              </button>

              <button
                type="button"
                onClick={() => { setEventType('spike'); setFlowRate(45.0); }}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  eventType === 'spike'
                    ? 'bg-amber-500/15 border-amber-500 text-white'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={`w-4 h-4 ${eventType === 'spike' ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="text-sm font-semibold text-white">High Flow Surge</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Simulates an open hose or burst fixture spike (&gt;100 Liters in 1 hr).
                </p>
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span className="font-semibold uppercase tracking-wider">
                {eventType === 'leak' ? 'Continuous Leak Flow Rate (Liters/Hour)' : 'Surge Base Flow (Liters/Hour)'}
              </span>
              <span className="font-mono text-cyan-400 font-bold">{flowRate.toFixed(1)} L/h</span>
            </div>
            <input
              type="range"
              min={eventType === 'leak' ? 4 : 20}
              max={eventType === 'leak' ? 40 : 150}
              step="0.5"
              value={flowRate}
              onChange={(e) => setFlowRate(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>{eventType === 'leak' ? '4 L/h (Trickle)' : '20 L/h'}</span>
              <span>{eventType === 'leak' ? '40 L/h (Severe)' : '150 L/h (Burst)'}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
            <span className="text-slate-300 font-semibold">Immediate Effect:</span> Clicking inject will add simulated readings to the database, trigger the anomaly detector, record an active alert, and update the dashboard KPIs in real-time.
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
              type="button"
              onClick={handleSimulate}
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-cyan-600/30 transition flex items-center gap-2"
            >
              {loading ? 'Injecting Telemetry...' : 'Inject Event Live'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
