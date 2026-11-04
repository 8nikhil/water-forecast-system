import React, { useState } from 'react';
import {
  Lightbulb,
  Droplets,
  DollarSign,
  CheckCircle2,
  Clock,
  Wrench,
  RotateCw,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { Recommendation } from '../types';
import { api } from '../services/api';

interface Props {
  recommendations: Recommendation[];
  onRefresh: () => void;
}

export const RecommendationsView: React.FC<Props> = ({ recommendations, onRefresh }) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  const [regenSuccess, setRegenSuccess] = useState<string | null>(null);

  const filtered = recommendations.filter((r) => {
    if (categoryFilter === 'all') return true;
    return r.category === categoryFilter;
  });

  const implementedCount = recommendations.filter((r) => r.status === 'implemented').length;
  const totalPotentialLitersMonth = recommendations
    .filter((r) => r.status !== 'dismissed')
    .reduce((acc, r) => acc + r.potential_saving_liters_month, 0);
  const totalPotentialUsdMonth = recommendations
    .filter((r) => r.status !== 'dismissed')
    .reduce((acc, r) => acc + r.potential_saving_usd_month, 0);

  const handleUpdateStatus = async (recId: number, status: string) => {
    try {
      await api.updateRecommendationStatus(recId, status);
      onRefresh();
    } catch (err) {
      console.error('Failed to update recommendation status', err);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setRegenSuccess(null);
    try {
      const res = await api.regenerateRecommendations();
      setRegenSuccess('Recommendations recalculated using latest telemetry and active leak data.');
      onRefresh();
      setTimeout(() => setRegenSuccess(null), 4000);
    } catch (err) {
      setRegenSuccess('Recalculation failed.');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <span>AI Conservation & Efficiency Advisor</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {implementedCount} Actions Implemented
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Tailored household conservation roadmap with quantified water volumes and monetary payback
          </p>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white shadow-md shadow-cyan-600/30 transition flex items-center gap-1.5"
        >
          <RotateCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
          <span>{regenerating ? 'Recalculating...' : 'Regenerate Recommendations'}</span>
        </button>
      </div>

      {regenSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{regenSuccess}</span>
        </div>
      )}

      {/* Cumulative Potential Savings Summary */}
      <div className="p-6 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-emerald-500/30 rounded-2xl shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
              Total Potential Water Savings
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono">
                {totalPotentialLitersMonth.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">Liters / month</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Equivalent to {((totalPotentialLitersMonth * 12) / 1000).toFixed(1)} m³ / year
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
              Estimated Monthly Cost Reduction
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400 font-mono">
                +${totalPotentialUsdMonth.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400">/ month</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block font-mono">
              ~${(totalPotentialUsdMonth * 12).toFixed(2)} Annual Household ROI
            </span>
          </div>

          <div className="sm:border-l sm:border-slate-800 sm:pl-6 text-xs text-slate-400">
            <span className="font-semibold text-slate-300 block mb-1">Action Status Overview:</span>
            <div className="space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Implemented:</span>
                <span className="text-emerald-400 font-bold">{implementedCount}</span>
              </div>
              <div className="flex justify-between">
                <span>In Progress:</span>
                <span className="text-amber-400 font-bold">
                  {recommendations.filter((r) => r.status === 'in_progress').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pending Review:</span>
                <span className="text-cyan-400 font-bold">
                  {recommendations.filter((r) => r.status === 'pending').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shrink-0 ${
            categoryFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          All Categories ({recommendations.length})
        </button>
        <button
          onClick={() => setCategoryFilter('leak_fix')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shrink-0 ${
            categoryFilter === 'leak_fix' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          Plumbing & Leaks
        </button>
        <button
          onClick={() => setCategoryFilter('fixtures')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shrink-0 ${
            categoryFilter === 'fixtures' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          Fixtures & Aerators
        </button>
        <button
          onClick={() => setCategoryFilter('irrigation')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shrink-0 ${
            categoryFilter === 'irrigation' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          Garden & Irrigation
        </button>
        <button
          onClick={() => setCategoryFilter('behavior')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shrink-0 ${
            categoryFilter === 'behavior' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          Habits & Appliances
        </button>
      </div>

      {/* Recommendations Cards */}
      <div className="space-y-4">
        {filtered.map((rec) => {
          const isExpanded = expandedId === rec.id;
          const isImplemented = rec.status === 'implemented';
          const isInProgress = rec.status === 'in_progress';

          return (
            <div
              key={rec.id}
              className={`p-6 bg-slate-900 border rounded-2xl transition shadow-sm ${
                isImplemented
                  ? 'border-emerald-500/40 bg-emerald-950/10'
                  : isInProgress
                  ? 'border-amber-500/40'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                
                {/* Left: Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                        rec.impact_level === 'high'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {rec.impact_level} Impact
                    </span>

                    <span className="px-2 py-0.5 text-[10px] uppercase font-mono text-slate-400 bg-slate-950 rounded">
                      {rec.category.replace('_', ' ')}
                    </span>

                    <span className="text-[11px] text-slate-400 capitalize">
                      Difficulty: <strong>{rec.difficulty}</strong>
                    </span>

                    {rec.estimated_payback_days > 0 && (
                      <span className="text-[11px] text-slate-400">
                        Payback: <strong>{rec.estimated_payback_days} days</strong>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white">{rec.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{rec.description}</p>

                  {/* Expandable Step-by-Step Action Guide */}
                  {rec.action_steps && (
                    <div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold pt-1"
                      >
                        <span>{isExpanded ? 'Hide Implementation Steps' : 'View Step-by-Step Checklist'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                          {rec.action_steps}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Quantified Impact & Status Toggles */}
                <div className="flex flex-col md:items-end justify-between gap-4 md:w-60 shrink-0">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl w-full text-right font-mono">
                    <span className="text-[10px] text-slate-400 uppercase block">Monthly Savings</span>
                    <span className="text-lg font-black text-emerald-400 block">
                      +${rec.potential_saving_usd_month.toFixed(2)}/mo
                    </span>
                    <span className="text-xs text-white block">
                      {rec.potential_saving_liters_month.toLocaleString()} Liters / mo
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 w-full justify-end">
                    {isImplemented ? (
                      <span className="px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Implemented</span>
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(rec.id, 'in_progress')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                            isInProgress
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {isInProgress ? 'In Progress' : 'Start'}
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(rec.id, 'implemented')}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Done</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

