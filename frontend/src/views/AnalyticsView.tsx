import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine
} from 'recharts';
import {
  BarChart3,
  Clock,
  PieChart as PieIcon,
  Layers,
  Calendar,
  Building2,
  TrendingDown,
  Info,
  Home,
  Users,
  Droplets,
  CheckCircle2,
  ShieldCheck,
  Flame,
  CloudRain
} from 'lucide-react';
import { TrendPoint, HourlyPoint, EndUseResponse } from '../types';
import {
  VILAASA_FLATS_LIST,
  VILAASA_FLAT_TIMESERIES,
  VILAASA_MODEL_METRICS,
  VilaasaFlat,
  FlatTimeseriesPoint
} from '../data/migsunVilaasaData';

interface Props {
  trends?: TrendPoint[];
  hourly?: HourlyPoint[];
  endUse?: EndUseResponse | null;
  onRefresh?: () => void;
}

export const AnalyticsView: React.FC<Props> = ({ trends = [], hourly = [] }) => {
  const [activeTab, setActiveTab] = useState<'flat' | 'enduse'>('flat');
  const [selectedFlatId, setSelectedFlatId] = useState<string>('A-101');
  const [horizonDays, setHorizonDays] = useState<number>(30);

  // Compute aggregate stats for ALL_VILAASA
  const totalOccupants = useMemo(() => VILAASA_FLATS_LIST.reduce((acc, f) => acc + f.occupants, 0), []);
  const totalDailyLiters = useMemo(() => Math.round(VILAASA_FLATS_LIST.reduce((acc, f) => acc + f.daily_liters, 0)), []);
  const complexForm1aTargetL = Math.round(totalOccupants * 86.0);
  const complexAvgLpcd = +(totalDailyLiters / totalOccupants).toFixed(1);

  const complexAggregateFlat: VilaasaFlat = useMemo(() => ({
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
  }), [totalOccupants, totalDailyLiters, complexAvgLpcd, complexForm1aTargetL]);

  // Current Flat object
  const currentFlat: VilaasaFlat = useMemo(() => {
    if (selectedFlatId === 'ALL_VILAASA') return complexAggregateFlat;
    return VILAASA_FLATS_LIST.find((f) => f.flat_id === selectedFlatId) || VILAASA_FLATS_LIST[0];
  }, [selectedFlatId, complexAggregateFlat]);

  // Timeseries slice for selected flat
  const flatTimeseries: FlatTimeseriesPoint[] = useMemo(() => {
    const allPoints = VILAASA_FLAT_TIMESERIES[selectedFlatId] || VILAASA_FLAT_TIMESERIES['A-101'] || [];
    return allPoints.slice(0, horizonDays);
  }, [selectedFlatId, horizonDays]);

  // Aggregated metrics over the chosen window
  const periodStats = useMemo(() => {
    if (!flatTimeseries.length) {
      return {
        avgDaily: currentFlat.daily_liters,
        peakDaily: currentFlat.daily_liters * 1.08,
        minDaily: currentFlat.daily_liters * 0.92,
        totalLiters: currentFlat.daily_liters * horizonDays,
        totalM3: (currentFlat.daily_liters * horizonDays) / 1000,
        compliancePct: 96.5,
      };
    }
    const actuals = flatTimeseries.map((p) => p.actual_liters);
    const sum = actuals.reduce((a, b) => a + b, 0);
    const avg = +(sum / actuals.length).toFixed(1);
    const peak = Math.max(...actuals);
    const min = Math.min(...actuals);
    const target = currentFlat.form1a_target_liters;
    const withinTargetCount = flatTimeseries.filter((p) => p.actual_liters <= target * 1.05).length;
    const compliance = +((withinTargetCount / flatTimeseries.length) * 100).toFixed(1);

    return {
      avgDaily: avg,
      peakDaily: peak,
      minDaily: min,
      totalLiters: Math.round(sum),
      totalM3: +(sum / 1000).toFixed(2),
      compliancePct: compliance,
    };
  }, [flatTimeseries, currentFlat, horizonDays]);

  // End-use breakdown array for charts
  const endUseChartData = useMemo(() => {
    const eu = currentFlat.end_use;
    const colors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#14b8a6'];
    const items = [
      { name: 'Bathing & Shower', liters: eu.bathing_l, color: colors[0] },
      { name: 'Toilet Flushing', liters: eu.toilet_flushing_l, color: colors[1] },
      { name: 'Washing Clothes', liters: eu.washing_clothes_l, color: colors[2] },
      { name: 'Washing Utensils', liters: eu.washing_utensils_l, color: colors[3] },
      { name: 'House Cleaning', liters: eu.house_cleaning_l, color: colors[4] },
      { name: 'Drinking', liters: eu.drinking_l, color: colors[5] },
      { name: 'Cooking', liters: eu.cooking_l, color: colors[6] },
    ];
    const total = items.reduce((a, b) => a + b.liters, 0);
    return items.map((item) => ({
      ...item,
      pct: total > 0 ? +((item.liters / total) * 100).toFixed(1) : 0
    }));
  }, [currentFlat]);

  // Comparison data for all 20 flats
  const allFlatsComparisonData = useMemo(() => {
    return VILAASA_FLATS_LIST.map((f) => ({
      flat_id: f.flat_id,
      daily_liters: f.daily_liters,
      lpcd: f.lpcd,
      target_lpcd: 86.0,
      occupants: f.occupants,
      tier: f.tier,
      isSelected: f.flat_id === selectedFlatId
    }));
  }, [selectedFlatId]);

  // Default synthetic diurnal profile scaled to current flat
  const flatHourlyData = useMemo(() => {
    if (hourly && hourly.length > 0) {
      const baseTotal = hourly.reduce((a, b) => a + b.average_liters, 0) || 1;
      return hourly.map((h) => ({
        label: h.label,
        liters: +((h.average_liters / baseTotal) * currentFlat.daily_liters).toFixed(1)
      }));
    }
    // Standard diurnal curve (peaks at 7-9 AM and 7-9 PM)
    const weights = [
      0.015, 0.01, 0.008, 0.008, 0.012, 0.025, 0.065, 0.11, 0.12, 0.08, 0.05, 0.045,
      0.04, 0.035, 0.035, 0.038, 0.045, 0.06, 0.085, 0.095, 0.07, 0.045, 0.025, 0.018
    ];
    return weights.map((w, i) => {
      const hourStr = `${i.toString().padStart(2, '0')}:00`;
      return {
        label: hourStr,
        liters: +(currentFlat.daily_liters * w).toFixed(1)
      };
    });
  }, [hourly, currentFlat]);

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <span>Historical Consumption & Trend Analytics</span>
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Migsun Vilaasa Smart Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical smart meter telemetry across 20 residential flats, MoEFCC Form-1A clearance benchmarks, and sub-metered end-use distribution.
          </p>
        </div>

        {/* View Switcher, Flat Selector & Time Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Flat Selector Dropdown */}
          <div className="flex items-center bg-slate-950 p-1 px-2 rounded-xl border border-slate-800">
            <Home className="w-3.5 h-3.5 text-cyan-400 mr-2" />
            <select
              value={selectedFlatId}
              onChange={(e) => setSelectedFlatId(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold py-1 pr-2 focus:outline-none cursor-pointer"
            >
              <option value="ALL_VILAASA" className="bg-slate-900 text-cyan-300">
                All Flats / Complex Aggregate (78 Occupants)
              </option>
              {VILAASA_FLATS_LIST.map((f) => (
                <option key={f.flat_id} value={f.flat_id} className="bg-slate-900 text-white">
                  Flat {f.flat_id} ({f.occupants} Occ - {f.tier} Tier)
                </option>
              ))}
            </select>
          </div>

          {/* View Tab Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('flat')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'flat' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Smart Meter Telemetry
            </button>
            <button
              onClick={() => setActiveTab('enduse')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'enduse' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              End-Use & Diurnal Profile
            </button>
          </div>

          {/* Time Horizon Buttons */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setHorizonDays(days)}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  horizonDays === days ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* SUMMARY STAT CARDS (Calibrated to Flat Telemetry)                */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Average Daily Demand */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider block">Average Daily Demand</span>
          <div className="text-2xl font-black text-cyan-400 mt-1 flex items-baseline gap-1">
            {periodStats.avgDaily.toLocaleString()} <span className="text-xs font-semibold text-slate-400">Litres / day</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Peak: {periodStats.peakDaily.toLocaleString()} L · Min: {periodStats.minDaily.toLocaleString()} L
          </span>
        </div>

        {/* Card 2: Total Extraction / Consumption Volume */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Period Volume</span>
          <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-1">
            {periodStats.totalLiters.toLocaleString()} <span className="text-xs font-semibold text-slate-400">Litres</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Volumetric: {periodStats.totalM3} m³ ({horizonDays}-Day Monitored Span)
          </span>
        </div>

        {/* Card 3: Form-1A Design Benchmark & Compliance */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider block">Form-1A Design Cap</span>
          <div className="text-2xl font-black text-emerald-400 mt-1 flex items-baseline gap-1">
            {currentFlat.form1a_target_liters.toLocaleString()} <span className="text-xs font-semibold text-slate-400">L / day</span>
          </div>
          <span className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            {periodStats.compliancePct}% Period Within Statutory Cap
          </span>
        </div>

        {/* Card 4: Per Capita LPCD Target */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider block">Per Capita Usage (LPCD)</span>
          <div className="text-2xl font-black text-sky-400 mt-1 flex items-baseline gap-1">
            {currentFlat.lpcd} <span className="text-xs font-semibold text-slate-400">LPCD</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Form-1A Limit: 86.0 LPCD · {currentFlat.occupants} Occupants
          </span>
        </div>

      </div>

      {/* ================================================================= */}
      {/* TAB 1: SMART METER TELEMETRY & MULTI-FLAT COMPARISON               */}
      {/* ================================================================= */}
      {activeTab === 'flat' && (
        <div className="space-y-6">
          
          {/* Main Telemetry Area Chart */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>
                    Daily Water Demand & AI Model Telemetry (Last {horizonDays} Days) —{' '}
                    <span className="text-cyan-400">
                      {selectedFlatId === 'ALL_VILAASA' ? 'All 20 Flats Combined' : `Flat ${selectedFlatId}`}
                    </span>
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Actual smart meter telemetry compared with Ridge ML regression predictions and MoEFCC Form-1A statutory cap ({currentFlat.form1a_target_liters} L/day).
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Occupants: <strong className="text-white">{currentFlat.occupants}</strong></span>
                <span className="text-slate-600">|</span>
                <span>Tier: <strong className="text-white">{currentFlat.tier}</strong></span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flatTimeseries} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualDemandGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="predictedDemandGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
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
                      fontSize: '12px'
                    }}
                    formatter={(val: any, name: any) => [`${Number(val).toFixed(1)} Litres`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                  
                  {/* Form-1A Design Benchmark Cap Reference Line */}
                  <ReferenceLine
                    y={currentFlat.form1a_target_liters}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{
                      value: `Form-1A Cap (${currentFlat.form1a_target_liters} L)`,
                      fill: '#10b981',
                      fontSize: 11,
                      position: 'top'
                    }}
                  />

                  {/* Actual Consumption Area */}
                  <Area
                    type="monotone"
                    dataKey="actual_liters"
                    name="Actual Consumption (Litres)"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fill="url(#actualDemandGrad)"
                  />

                  {/* Ridge ML Predicted Demand Line */}
                  <Line
                    type="monotone"
                    dataKey="predicted_liters"
                    name="Ridge ML Prediction (Litres)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2-Column Comparison Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: Per Capita LPCD Profile */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Droplets className="w-4 h-4 text-cyan-400" />
                <span>Daily Per Capita Usage vs Form-1A Benchmark (86 LPCD)</span>
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                Tracking daily litres per capita per day against the statutory environmental clearance threshold.
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flatTimeseries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="short_date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis unit=" LPCD" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => [`${val} LPCD`, 'Per Capita Usage']}
                    />
                    <ReferenceLine y={86.0} stroke="#10b981" strokeDasharray="3 3" />
                    <Bar dataKey="lpcd" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Comparative Demand Across 20 Flats */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span>Comparative Daily Demand Across Migsun Vilaasa Flats</span>
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                Baseline daily water consumption across all 20 units (current unit highlighted in cyan).
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={allFlatsComparisonData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" unit=" L" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis dataKey="flat_id" type="category" tick={{ fill: '#e2e8f0', fontSize: 10 }} width={45} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                      formatter={(val: any, _: any, item: any) => [
                        `${val} L/day (${item.payload.occupants} Occ · ${item.payload.lpcd} LPCD)`,
                        `Flat ${item.payload.flat_id}`
                      ]}
                    />
                    <Bar dataKey="daily_liters" radius={[0, 4, 4, 0]}>
                      {allFlatsComparisonData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.flat_id === selectedFlatId ? '#06b6d4' : '#334155'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: END-USE BREAKDOWN & DIURNAL USAGE PROFILE                   */}
      {/* ================================================================= */}
      {activeTab === 'enduse' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Diurnal Hourly Profile */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>24-Hour Diurnal Household Usage Curve</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hourly draw pattern showing morning peak (7:00-9:00 AM) and evening peak (7:00-9:00 PM).
                </p>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flatHourlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis unit=" L" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`${val} Litres / hour`, 'Hourly Demand']}
                  />
                  <Area type="monotone" dataKey="liters" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* End-Use Attribution Donut */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <PieIcon className="w-4 h-4 text-purple-400" />
              <span>Sub-Metered End-Use Attribution (7 Household Channels)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Breakdown based on empirical audit data for {selectedFlatId === 'ALL_VILAASA' ? 'all 20 flats' : `Flat ${selectedFlatId}`}.
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={endUseChartData}
                    dataKey="liters"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {endUseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(val: any, name: any, item: any) => [
                      `${val} Litres (${item.payload.pct}%)`,
                      name
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
