import React, { useState } from 'react';
import {
  AlertTriangle,
  Droplets,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Sliders,
  RotateCw,
  Clock,
  DollarSign,
  Wrench,
  Search,
  Check,
  X
} from 'lucide-react';
import { AnomalyEvent } from '../types';
import { api } from '../services/api';

interface Props {
  anomalies: AnomalyEvent[];
  onRefresh: () => void;
}

export const AnomaliesView: React.FC<Props> = ({ anomalies, onRefresh }) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved' | 'dismissed'>('all');
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  
  // Threshold config state
  const [nightThreshold, setNightThreshold] = useState<number>(6.0);
  const [spikeMultiplier, setSpikeMultiplier] = useState<number>(2.5);
  const [budgetLiters, setBudgetLiters] = useState<number>(450.0);
  const [savingThresholds, setSavingThresholds] = useState<boolean>(false);
  const [thresholdSaved, setThresholdSaved] = useState<boolean>(false);

  const filtered = anomalies.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'active') return a.status === 'active' || a.status === 'investigating';
    return a.status === filter;
  });

  const handleUpdateStatus = async (anomalyId: number, status: string) => {
    try {
      await api.updateAnomalyStatus(anomalyId, status);
      onRefresh();
    } catch (err) {
      console.error('Failed to update anomaly status', err);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await api.scanAnomalies();
      setScanResult(`Scan complete: Analyzed ${res.scanned_readings} hourly readings. ${res.newly_detected_anomalies} new anomaly events logged.`);
      onRefresh();
      setTimeout(() => setScanResult(null), 5000);
    } catch (err: any) {
      setScanResult('Scan encountered an issue.');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingThresholds(true);
    try {
      await api.updateThresholds({
        night_flow_threshold_liters_per_hour: nightThreshold,
        spike_multiplier_threshold: spikeMultiplier,
        daily_budget_liters: budgetLiters,
      });
      setThresholdSaved(true);
      setTimeout(() => setThresholdSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save thresholds', err);
    } finally {
      setSavingThresholds(false);
    }
  };

  const activeCount = anomalies.filter((a) => a.status === 'active' || a.status === 'investigating').length;
  const totalWastedLiters = anomalies.reduce((acc, a) => acc + (a.status === 'active' ? a.wasted_liters : 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Alerts & Leak Intelligence Center</span>
            </h1>
            {activeCount > 0 ? (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {activeCount} Active Issues
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                All Normal
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated continuous night flow baseline detection, sudden volumetric surges, and plumbing diagnostics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white shadow-md shadow-cyan-600/30 transition flex items-center gap-1.5"
          >
            <Search className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Scanning Telemetry...' : 'Scan Telemetry Now'}</span>
          </button>
        </div>
      </div>

      {scanResult && (
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{scanResult}</span>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Unresolved Leaks</span>
          <p className="text-2xl font-black text-rose-400 font-mono mt-0.5">{activeCount}</p>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Current Wastage Loss</span>
          <p className="text-2xl font-black text-amber-400 font-mono mt-0.5">
            {totalWastedLiters.toLocaleString()} <span className="text-xs font-sans text-slate-400">Liters</span>
          </p>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Night Baseline Protocol</span>
          <p className="text-2xl font-black text-cyan-400 font-mono mt-0.5">
            &gt; 6.0 <span className="text-xs font-sans text-slate-400">L/h (01:00-05:00)</span>
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            filter === 'all' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          All Events ({anomalies.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            filter === 'active' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          Active / Investigating ({activeCount})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            filter === 'resolved' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          Resolved
        </button>
        <button
          onClick={() => setFilter('dismissed')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            filter === 'dismissed' ? 'bg-slate-800 text-slate-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          Dismissed
        </button>
      </div>

      {/* Anomalies List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-white">No anomalies matching this filter</h3>
            <p className="text-xs text-slate-400 mt-1">Smart meter telemetry confirms no active baseline leaks.</p>
          </div>
        ) : (
          filtered.map((anomaly) => {
            const isCritical = anomaly.severity === 'critical';
            const isActive = anomaly.status === 'active' || anomaly.status === 'investigating';
            return (
              <div
                key={anomaly.id}
                className={`p-6 bg-slate-900 border rounded-2xl transition shadow-md ${
                  isActive
                    ? isCritical
                      ? 'border-rose-500/60 bg-gradient-to-r from-rose-950/20 via-slate-900 to-slate-900'
                      : 'border-amber-500/50'
                    : 'border-slate-800 opacity-80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  
                  {/* Left Column: Severity & Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : anomaly.severity === 'high'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {anomaly.severity} Severity
                      </span>

                      <span className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-950 rounded border border-slate-800">
                        {anomaly.anomaly_type.replace(/_/g, ' ')}
                      </span>

                      <span className="text-xs text-slate-400">
                        Detected: {new Date(anomaly.detected_at).toLocaleDateString()} at{' '}
                        {new Date(anomaly.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">{anomaly.description}</h3>

                    {anomaly.root_cause && (
                      <p className="text-xs text-slate-300">
                        <strong className="text-slate-400">Suspected Root Cause:</strong> {anomaly.root_cause}
                      </p>
                    )}

                    {anomaly.recommended_action && (
                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-cyan-300 flex items-start gap-2">
                        <Wrench className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block mb-0.5">Recommended Remediation:</strong>
                          <span>{anomaly.recommended_action}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Quantitative Wastage & Actions */}
                  <div className="flex flex-col lg:items-end justify-between gap-4 lg:w-64 shrink-0">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl w-full text-right font-mono">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Flow Rate:</span>
                        <strong className="text-rose-400">{anomaly.flow_rate_liters_per_hour.toFixed(1)} L/h</strong>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Water Wasted:</span>
                        <strong className="text-white">{anomaly.wasted_liters.toLocaleString()} L</strong>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Estimated Cost:</span>
                        <strong className="text-emerald-400">${anomaly.estimated_cost_usd.toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* Status Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 w-full justify-end">
                      {isActive && (
                        <>
                          {anomaly.status !== 'investigating' && (
                            <button
                              onClick={() => handleUpdateStatus(anomaly.id, 'investigating')}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition"
                            >
                              Investigate
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(anomaly.id, 'resolved')}
                            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(anomaly.id, 'dismissed')}
                            className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition"
                            title="Dismiss Alert"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {!isActive && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="capitalize">{anomaly.status}</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Threshold Configuration Drawer */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Anomaly Detection Sensitivity & Thresholds
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Tune algorithmic parameters for smart meter night-flow inspection and surge detection:
        </p>

        <form onSubmit={handleSaveThresholds} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Night Flow Threshold (Liters/Hour)
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="30"
              value={nightThreshold}
              onChange={(e) => setNightThreshold(parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Continuous 01:00-05:00 baseline cutoff</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Surge Spike Multiplier
            </label>
            <input
              type="number"
              step="0.1"
              min="1.5"
              max="5.0"
              value={spikeMultiplier}
              onChange={(e) => setSpikeMultiplier(parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">x Standard Deviation above household mean</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Daily Target Budget (Liters)
            </label>
            <input
              type="number"
              step="10"
              min="150"
              max="1500"
              value={budgetLiters}
              onChange={(e) => setBudgetLiters(parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Household target daily cap</span>
          </div>

          <div className="sm:col-span-3 flex justify-end items-center gap-3 pt-2">
            {thresholdSaved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Threshold parameters saved</span>
              </span>
            )}
            <button
              type="submit"
              disabled={savingThresholds}
              className="px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-md transition"
            >
              {savingThresholds ? 'Saving...' : 'Update Thresholds'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

