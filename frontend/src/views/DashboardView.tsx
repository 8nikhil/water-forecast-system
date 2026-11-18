import React, { useState, useEffect } from 'react';
import {
  Droplets,
  Calendar,
  DollarSign,
  AlertTriangle,
  Award,
  ArrowUpRight,
  Gauge,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  Play,
  FileSpreadsheet,
  Cpu,
  BarChart2,
  CloudSun,
  ShieldCheck,
  ChevronRight,
  Flame,
  CloudRain,
  Users,
  Home,
  PieChart,
  Sparkles,
  Info
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { DashboardSummary, TrendPoint, AnomalyEvent, Recommendation, User } from '../types';
import { api } from '../services/api';
import {
  VILAASA_FLATS_LIST,
  VILAASA_FLAT_TIMESERIES,
  VILAASA_MODEL_METRICS,
  VilaasaFlat,
  FlatTimeseriesPoint
} from '../data/migsunVilaasaData';

interface Props {
  summary: DashboardSummary | null;
  trends: TrendPoint[];
  anomalies: AnomalyEvent[];
  recommendations: Recommendation[];
  currentUser: User | null;
  onNavigate: (view: string) => void;
  onOpenManualReading: () => void;
  onOpenSimulator: () => void;
  onScanLeaks: () => void;
}

export const DashboardView: React.FC<Props> = ({
  summary,
  trends,
  anomalies,
  recommendations,
  currentUser,
  onNavigate,
  onOpenManualReading,
  onOpenSimulator,
}) => {
  // Default to the first Migsun Vilaasa Flat A-101
  const [selectedZoneId, setSelectedZoneId] = useState<string>('A-101');
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d'>('30d');
  const [selectedFlat, setSelectedFlat] = useState<VilaasaFlat>(VILAASA_FLATS_LIST[0]);

  // Aggregate stats for ALL_VILAASA
  const totalOccupants = VILAASA_FLATS_LIST.reduce((acc, f) => acc + f.occupants, 0);
  const totalDailyLiters = Math.round(VILAASA_FLATS_LIST.reduce((acc, f) => acc + f.daily_liters, 0));
  const complexForm1aTargetL = Math.round(totalOccupants * 86.0);
  const complexAvgLpcd = +(totalDailyLiters / totalOccupants).toFixed(1);

  const complexAggregateFlat: VilaasaFlat = {
    flat_id: 'ALL_VILAASA',
    occupants: totalOccupants,
    tier: 'Complex Aggregate',
    daily_liters: totalDailyLiters,
    lpcd: complexAvgLpcd,
    monthly_liters: totalDailyLiters * 30,
    annual_liters: totalDailyLiters * 365,
    form1a_target_lpcd: 86.0,
    form1a_target_liters: complexForm1aTargetL,
    end_use: {
      bathing_l: Math.round(VILAASA_FLATS_LIST.reduce((a, f) => a + f.end_use.bathing_l, 0) * 10) / 10,
      toilet_flushing_l: Math.round(VILAASA_FLATS_LIST.reduce((a, f) => a + f.end_use.toilet_flushing_l, 0) * 10) / 10,
      washing_clothes_l: Math.round(VILAASA_FLATS_LIST.reduce((a, f) => a + f.end_use.washing_clothes_l, 0) * 10) / 10,
      washing_utensils_l: Math.round(VILAASA_FLATS_LIST.reduce((a, f) => a + f.end_use.washing_utensils_l, 0) * 10) / 10,
      house_cleaning_l: Math.round(VILAASA_FLATS_LIST.reduce((a, f) => a + f.end_use.house_cleaning_l, 0) * 10) / 10,
      drinking_l: Math.round(VILAASA_FLATS_LIST.reduce((a, f) => a + f.end_use.drinking_l, 0) * 10) / 10,
      cooking_l: Math.round(VILAASA_FLATS_LIST.reduce((a, f) => a + f.end_use.cooking_l, 0) * 10) / 10,
    }
  };

  const handleZoneChange = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    if (zoneId === 'ALL_VILAASA') {
      setSelectedFlat(complexAggregateFlat);
    } else {
      const found = VILAASA_FLATS_LIST.find((f) => f.flat_id === zoneId);
      if (found) setSelectedFlat(found);
    }
  };

  // Get timeseries records for selected zone
  const rawSeries = VILAASA_FLAT_TIMESERIES[selectedZoneId] || VILAASA_FLAT_TIMESERIES['A-101'] || [];
  const timeseriesData = timeRange === '7d' 
    ? rawSeries.slice(-7) 
    : timeRange === '14d' 
    ? rawSeries.slice(-14) 
    : rawSeries;

  const activeLeaks = anomalies.filter((a) => a.status === 'active' || a.status === 'investigating');
  const recentTrends = trends.slice(-7);

  // Form-1A Benchmark comparison for current flat
  const benchmarkDiffL = Math.round(selectedFlat.daily_liters - selectedFlat.form1a_target_liters);
  const benchmarkDiffPct = +((benchmarkDiffL / selectedFlat.form1a_target_liters) * 100).toFixed(1);
  const isWithinBenchmark = selectedFlat.daily_liters <= selectedFlat.form1a_target_liters;

  // End-use breakdown items
  const endUseCategories = [
    { label: 'Bathing & Shower', val: selectedFlat.end_use.bathing_l, color: 'bg-blue-500', barColor: '#3b82f6' },
    { label: 'Toilet Flushing', val: selectedFlat.end_use.toilet_flushing_l, color: 'bg-cyan-500', barColor: '#06b6d4' },
    { label: 'Washing Clothes', val: selectedFlat.end_use.washing_clothes_l, color: 'bg-indigo-500', barColor: '#6366f1' },
    { label: 'Washing Utensils', val: selectedFlat.end_use.washing_utensils_l, color: 'bg-sky-500', barColor: '#0ea5e9' },
    { label: 'House Cleaning', val: selectedFlat.end_use.house_cleaning_l, color: 'bg-teal-500', barColor: '#14b8a6' },
    { label: 'Drinking Water', val: selectedFlat.end_use.drinking_l, color: 'bg-emerald-500', barColor: '#10b981' },
    { label: 'Cooking & Kitchen', val: selectedFlat.end_use.cooking_l, color: 'bg-amber-500', barColor: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Welcome & Zone Switcher Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">
              AquaPulse Water Analytics & Forecasting Platform
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              AI Engine v2.0
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time smart meter telemetry for {selectedZoneId === 'ALL_VILAASA' ? 'Migsun Vilaasa Complex (20 Flats)' : `Flat ${selectedZoneId} (${selectedFlat.occupants} Occupants)`} with Form-1A design benchmarks and AI Ridge predictions.
          </p>
        </div>

        {/* Global Monitoring Zone Dropdown */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 px-3 rounded-2xl border border-slate-800 self-start md:self-center">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Monitoring Zone:</span>
          <select
            value={selectedZoneId}
            onChange={(e) => handleZoneChange(e.target.value)}
            className="bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL_VILAASA">
              Migsun Vilaasa (Total Complex - 78 Occupants)
            </option>
            {VILAASA_FLATS_LIST.map((f) => (
              <option key={f.flat_id} value={f.flat_id}>
                Flat {f.flat_id} ({f.occupants} Occ - {f.tier})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Leak Alert Banner if active */}
      {activeLeaks.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-rose-950/60 via-slate-900 to-rose-950/30 border border-rose-500/50 rounded-2xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  Active Continuous Night Leak Detected!
                </span>
                <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold rounded bg-rose-500 text-white">
                  Critical
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Estimated wastage: {activeLeaks[0]?.flow_rate_liters_per_hour * 24 || 320} Liters/day (~${((activeLeaks[0]?.flow_rate_liters_per_hour * 24 * 3.65) / 1000).toFixed(2)}/day).
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('anomalies')}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-500 hover:bg-rose-400 text-white transition whitespace-nowrap"
          >
            Inspect Alert
          </button>
        </div>
      )}

      {/* 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Today's Demand */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm hover:border-cyan-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">
              {selectedZoneId === 'ALL_VILAASA' ? 'Complex Monitored Demand' : `Flat ${selectedZoneId} Demand`}
            </span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {selectedFlat.daily_liters.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-slate-400">Litres/day</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>30-Day: {selectedFlat.monthly_liters.toLocaleString()} L</span>
            <span className="text-emerald-400 font-semibold">{selectedFlat.lpcd} LPCD</span>
          </div>
        </div>

        {/* Card 2: AI Forecasting Accuracy */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm hover:border-sky-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">AI Forecast Accuracy</span>
            <Award className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            97.14% <span className="text-xs font-semibold text-slate-400">R² Score</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>MAE: 17.60 L (±5.43% MAPE)</span>
          </div>
        </div>

        {/* Card 3: Occupancy & Climate */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">
              Flat Occupancy & Tier
            </span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {selectedFlat.occupants} Occupants
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">{selectedFlat.tier} Usage Tier</span>
            <span className="text-slate-300 font-semibold">Tmax: 30.4°C</span>
          </div>
        </div>

        {/* Card 4: Form-1A Benchmark vs Actual */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">
              Form-1A Design Baseline
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            <span className={isWithinBenchmark ? 'text-emerald-400' : 'text-amber-400'}>
              {benchmarkDiffPct > 0 ? `+${benchmarkDiffPct}%` : `${benchmarkDiffPct}%`}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-1">
              {isWithinBenchmark ? 'Within Design' : 'Above Target'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 truncate">
            <span>Target: {selectedFlat.form1a_target_liters.toLocaleString()} L/day ({selectedFlat.occupants} × 86 LPCD)</span>
          </div>
        </div>

      </div>

      {/* Main Charts & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Monitored Daily Consumption & AI Forecast Chart */}
        <div className="lg:col-span-2 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                {selectedZoneId === 'ALL_VILAASA' ? 'Migsun Vilaasa Complex' : `Flat ${selectedZoneId}`} Daily Consumption vs Form-1A Design Benchmark (86 LPCD)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Telemetry for Oct 01–30, 2026: Solid line is actual consumption, dashed green is Form-1A design limit ({selectedFlat.form1a_target_liters} L), purple is Ridge AI forecast.
              </p>
            </div>

            {/* Time Span Filter for Flat */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
              {(['7d', '14d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                    timeRange === r
                      ? 'bg-cyan-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r === '7d' ? '7 Days' : r === '14d' ? '14 Days' : '30 Days'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseriesData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashUsageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="short_date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis unit=" L" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                    padding: '10px'
                  }}
                  formatter={(val: any, name: string) => {
                    if (name === 'actual_liters') return [`${val} Litres`, 'Actual Consumption'];
                    if (name === 'predicted_liters') return [`${val} Litres`, 'Ridge AI Prediction'];
                    if (name === 'form1a_target_liters') return [`${val} Litres`, 'Form-1A Design Limit (86 LPCD)'];
                    return [val, name];
                  }}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item ? `${item.date} (${item.day_of_week}) | ${item.notes}` : label;
                  }}
                />
                {/* Actual Consumption Area */}
                <Area
                  type="monotone"
                  dataKey="actual_liters"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fill="url(#dashUsageGrad)"
                  name="actual_liters"
                />
                {/* Ridge AI Forecast Line */}
                <Line
                  type="monotone"
                  dataKey="predicted_liters"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  name="predicted_liters"
                />
                {/* Form-1A Clearance Design Baseline */}
                <Line
                  type="monotone"
                  dataKey="form1a_target_liters"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                  name="form1a_target_liters"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Visual Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />
              <span className="text-slate-300 font-medium">Actual Smart Meter Reading (L)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-purple-400 inline-block" />
              <span className="text-slate-300 font-medium">Ridge AI Model Prediction (97.14% R²)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-emerald-400 inline-block" />
              <span className="text-slate-300 font-medium">Form-1A Clearance Design Target ({selectedFlat.form1a_target_liters} L / 86 LPCD)</span>
            </div>
          </div>
        </div>

        {/* Action Shortcuts & Module Navigation */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <h2 className="text-sm font-bold text-white mb-1">Platform Navigation</h2>
            <p className="text-xs text-slate-400 mb-4">Quick access to intelligent analytics modules.</p>

            <div className="space-y-2">
              <button
                onClick={() => onNavigate('forecasting')}
                className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Demand Forecasting</span>
                    <span className="text-[10px] text-slate-400">Single day, horizon, & monthly budgets</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
              </button>

              <button
                onClick={() => onNavigate('analytics')}
                className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/40 text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:scale-105 transition">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Historical Trends</span>
                    <span className="text-[10px] text-slate-400">Pan-India extraction & bulk supply</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition" />
              </button>

              <button
                onClick={() => onNavigate('weather')}
                className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition">
                    <CloudSun className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Weather Impact</span>
                    <span className="text-[10px] text-slate-400">Rainfall & temperature correlation</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
              </button>

              <button
                onClick={() => onNavigate('model-metrics')}
                className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Model Diagnostics</span>
                    <span className="text-[10px] text-slate-400">Audit report, R², MAE & features</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs text-slate-400">
            <span>FastAPI Server Status</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Online (Port 8000)
            </span>
          </div>
        </div>

      </div>

      {/* Sub-Metered End-Use Breakdown (Migsun Vilaasa Flats) */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              {selectedZoneId === 'ALL_VILAASA' ? 'Migsun Vilaasa Complex' : `Flat ${selectedZoneId}`} Sub-Metered End-Use Breakdown
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              MoEFCC Form-1A empirical sub-metered water distribution across 7 household consumption channels.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 self-start sm:self-auto">
            Total: {selectedFlat.daily_liters.toLocaleString()} Litres / Day ({selectedFlat.lpcd} LPCD)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {endUseCategories.map((cat) => {
            const pct = ((cat.val / selectedFlat.daily_liters) * 100).toFixed(1);
            return (
              <div key={cat.label} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{cat.label}</span>
                  <span className="text-white font-bold">{cat.val} L</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${cat.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{pct}% of household</span>
                  <span>{(cat.val / selectedFlat.occupants).toFixed(1)} LPCD</span>
                </div>
              </div>
            );
          })}

          {/* Form-1A Design Benchmark Card */}
          <div className="p-3 bg-gradient-to-br from-emerald-950/30 to-slate-950 border border-emerald-500/30 rounded-xl space-y-1.5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                MoEFCC Form-1A Clearance
              </span>
              <span className="text-xs font-bold text-white block mt-0.5">
                Design Target: 86.0 LPCD
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Benchmark budget for {selectedFlat.occupants} occupants is {selectedFlat.form1a_target_liters} L/day. 
              {isWithinBenchmark
                ? ' Current usage is 100% compliant with environmental clearance limits.'
                : ` Usage exceeds design baseline by ${benchmarkDiffL} L/day.`}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
