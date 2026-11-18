import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Cpu,
  Sparkles,
  Sliders,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  Droplets,
  DollarSign,
  Calendar,
  CloudSun,
  Flame,
  CloudRain,
  SunMedium,
  Check,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { ForecastResponse, ScenarioParams, CityMetadataItem, PanIndiaDailyPrediction, PanIndiaHorizonPrediction, PanIndiaMonthlyPrediction } from '../types';
import { api } from '../services/api';

interface Props {
  initialForecast?: ForecastResponse | null;
  onRefreshForecast?: () => void;
}

export const ForecastingView: React.FC<Props> = () => {
  // Navigation Tabs: 'daily' | 'horizon' | 'monthly' | 'scenarios'
  const [activeTab, setActiveTab] = useState<'daily' | 'horizon' | 'monthly' | 'scenarios'>('daily');

  // Cities metadata
  const [cities, setCities] = useState<CityMetadataItem[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>('BLR');

  // --- TAB 1: Single Daily Forecast Inputs & State ---
  const [dailyDate, setDailyDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [maxTemp, setMaxTemp] = useState<number>(33.5);
  const [minTemp, setMinTemp] = useState<number>(22.0);
  const [precip, setPrecip] = useState<number>(0.0);
  const [solar, setSolar] = useState<number>(21.5);
  const [customLag, setCustomLag] = useState<string>('');
  const [dailyResult, setDailyResult] = useState<PanIndiaDailyPrediction | null>(null);
  const [dailyLoading, setDailyLoading] = useState<boolean>(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  // --- TAB 2: Horizon Forecast State ---
  const [horizonDays, setHorizonDays] = useState<number>(14);
  const [horizonResult, setHorizonResult] = useState<PanIndiaHorizonPrediction | null>(null);
  const [horizonLoading, setHorizonLoading] = useState<boolean>(false);

  // --- TAB 3: Monthly Forecast State ---
  const [monthlyYear, setMonthlyYear] = useState<number>(new Date().getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState<number>(new Date().getMonth() + 1);
  const [monthlyResult, setMonthlyResult] = useState<PanIndiaMonthlyPrediction | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState<boolean>(false);

  // --- TAB 4: What-If Conservation Scenarios ---
  const [scenario, setScenario] = useState<ScenarioParams>({
    leak_repaired: true,
    fixture_retrofit: false,
    smart_irrigation: false,
    behavioral_conservation: false,
    custom_reduction_pct: 0,
  });
  const [scenarioSavedLiters, setScenarioSavedLiters] = useState<number>(0);
  const [scenarioCostSaved, setScenarioCostSaved] = useState<number>(0);

  // Load cities on mount
  useEffect(() => {
    const initCities = async () => {
      try {
        const list = await api.getSupportedCities();
        setCities(list);
        if (list.length > 0) {
          const defaultCid = list.find((c) => c.city_id === 'BLR')?.city_id || list[0].city_id;
          setSelectedCityId(defaultCid);
        }
      } catch (err) {
        console.error('Failed to load cities', err);
      }
    };
    initCities();
  }, []);

  // Update weather defaults when city changes
  useEffect(() => {
    const selected = cities.find((c) => c.city_id === selectedCityId);
    if (selected) {
      if (selected.mean_max_temp_c) setMaxTemp(selected.mean_max_temp_c);
      if (selected.mean_min_temp_c) setMinTemp(selected.mean_min_temp_c);
    }
  }, [selectedCityId, cities]);

  // Execute Daily Forecast
  const handleRunDailyForecast = async () => {
    setDailyLoading(true);
    setDailyError(null);
    try {
      const payload: any = {
        city_id: selectedCityId,
        date: dailyDate,
        max_temp_c: Number(maxTemp),
        min_temp_c: Number(minTemp),
        precipitation_mm: Number(precip),
        solar_radiation_mj: Number(solar),
      };
      if (customLag && !isNaN(Number(customLag))) {
        payload.demand_lag_1 = Number(customLag);
      }
      const res = await api.predictDaily(payload);
      setDailyResult(res);
    } catch (err: any) {
      setDailyError(err?.response?.data?.detail || 'Failed to compute forecast.');
    } finally {
      setDailyLoading(false);
    }
  };

  // Run on mount or tab change
  useEffect(() => {
    if (activeTab === 'daily' && !dailyResult && selectedCityId) {
      handleRunDailyForecast();
    } else if (activeTab === 'horizon' && !horizonResult && selectedCityId) {
      handleRunHorizonForecast();
    } else if (activeTab === 'monthly' && !monthlyResult && selectedCityId) {
      handleRunMonthlyForecast();
    }
  }, [activeTab, selectedCityId]);

  // Execute Horizon Forecast
  const handleRunHorizonForecast = async () => {
    setHorizonLoading(true);
    try {
      const res = await api.predictHorizon({
        city_id: selectedCityId,
        days: horizonDays,
        start_date: dailyDate,
      });
      setHorizonResult(res);
    } catch (err) {
      console.error('Horizon forecast error', err);
    } finally {
      setHorizonLoading(false);
    }
  };

  // Execute Monthly Forecast
  const handleRunMonthlyForecast = async () => {
    setMonthlyLoading(true);
    try {
      const res = await api.predictMonthly({
        city_id: selectedCityId,
        year: Number(monthlyYear),
        month: Number(monthlyMonth),
      });
      setMonthlyResult(res);
    } catch (err) {
      console.error('Monthly forecast error', err);
    } finally {
      setMonthlyLoading(false);
    }
  };

  // Re-run scenario calculations
  useEffect(() => {
    let pct = scenario.custom_reduction_pct || 0;
    if (scenario.leak_repaired) pct += 15;
    if (scenario.fixture_retrofit) pct += 12;
    if (scenario.smart_irrigation) pct += 10;
    if (scenario.behavioral_conservation) pct += 8;

    const baseVal = dailyResult?.predicted_demand_mld || 1492.0;
    const savedMld = (baseVal * pct) / 100.0;
    const savedLiters = savedMld * 1000000;
    setScenarioSavedLiters(savedLiters);
    setScenarioCostSaved(savedMld * 1000 * 3.65); // $3.65 per 1,000 m3
  }, [scenario, dailyResult]);

  const selectedCityMeta = cities.find((c) => c.city_id === selectedCityId);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Water Demand Forecasting Engine
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  ML-Powered (97.14% R²)
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Generates high-precision point predictions, multi-day horizons, and monthly water budgets across 21 metropolitan regions.
              </p>
            </div>
          </div>
        </div>

        {/* Global City Selector */}
        <div className="flex items-center gap-3 self-start md:self-center bg-slate-950/80 p-1.5 px-3 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Target Authority:</span>
          <select
            value={selectedCityId}
            onChange={(e) => setSelectedCityId(e.target.value)}
            className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500"
          >
            {cities.map((c) => (
              <option key={c.city_id} value={c.city_id}>
                {c.city_name} ({c.city_id}) - {c.zone}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'daily'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Single-Day Point Forecast</span>
        </button>

        <button
          onClick={() => setActiveTab('horizon')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'horizon'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Recursive Multi-Day Horizon (7-30D)</span>
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'monthly'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Monthly Water Budget & Planning</span>
        </button>

        <button
          onClick={() => setActiveTab('scenarios')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'scenarios'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>What-If Conservation Simulator</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: SINGLE DAILY FORECAST                                      */}
      {/* ================================================================= */}
      {activeTab === 'daily' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Input Controls Card */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Forecast Inputs & Climate Adjusters
            </h2>

            {dailyError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{dailyError}</span>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Date</label>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Max Temp Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> Max Temp (°C)
                </span>
                <span className="text-white font-bold">{maxTemp}°C</span>
              </div>
              <input
                type="range"
                min="15"
                max="50"
                step="0.5"
                value={maxTemp}
                onChange={(e) => setMaxTemp(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Min Temp Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <CloudSun className="w-3.5 h-3.5 text-blue-400" /> Min Temp (°C)
                </span>
                <span className="text-white font-bold">{minTemp}°C</span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                step="0.5"
                value={minTemp}
                onChange={(e) => setMinTemp(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Precipitation */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <CloudRain className="w-3.5 h-3.5 text-sky-400" /> 24h Rainfall (mm)
                </span>
                <span className="text-white font-bold">{precip} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={precip}
                onChange={(e) => setPrecip(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Prior Day Lag */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Prior Day Demand (MLD) <span className="text-slate-500">(Optional)</span>
              </label>
              <input
                type="number"
                placeholder={`Default: ${selectedCityMeta?.base_demand_mld.toFixed(1) || '1492.0'} MLD`}
                value={customLag}
                onChange={(e) => setCustomLag(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={handleRunDailyForecast}
              disabled={dailyLoading}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:opacity-95 transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <RotateCw className={`w-4 h-4 ${dailyLoading ? 'animate-spin' : ''}`} />
              <span>{dailyLoading ? 'Computing Model Inference...' : 'Generate Daily Forecast'}</span>
            </button>
          </div>

          {/* Forecast Output Hero Card */}
          <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      Forecast Output Result
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-slate-300">
                      {dailyResult?.forecast_date} ({dailyResult?.day_of_week})
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white mt-1">
                    {dailyResult?.city_name} Municipal Supply Zone ({dailyResult?.zone})
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Expected RMSE Error</span>
                  <span className="text-xs font-bold text-slate-300">±{dailyResult?.expected_rmse_error_mld.toFixed(2) || '40.47'} MLD</span>
                </div>
              </div>

              {/* Primary Output Metric */}
              <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-950 to-blue-950/30 border border-cyan-500/30">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Projected Daily Municipal Water Demand
                </span>
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 mt-2">
                  {dailyResult?.predicted_demand_mld.toLocaleString() || '1,502.73'}{' '}
                  <span className="text-xl font-bold text-slate-400">MLD</span>
                </div>

                {/* 95% Confidence Interval Bar */}
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">95% Confidence Interval Band:</span>
                  <span className="font-mono font-bold text-cyan-300 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                    [{dailyResult?.confidence_interval_95_mld.lower.toFixed(2) || '1423.41'} MLD —{' '}
                    {dailyResult?.confidence_interval_95_mld.upper.toFixed(2) || '1582.05'} MLD]
                  </span>
                </div>
              </div>

              {/* Metric Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">Volume in Million m³ (MCM)</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {dailyResult?.equivalent_million_cubic_meters.toFixed(4) || '1.5027'} MCM
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">Volume in Billion Litres</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {dailyResult?.equivalent_billion_litres.toFixed(4) || '1.5027'} BL
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">Per Capita Target</span>
                  <span className="text-lg font-bold text-emerald-400 mt-1 block">
                    {selectedCityMeta?.cpheeo_target_lpcd || 135} LPCD
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Validated against {dailyResult?.model_architecture || 'RandomForestRegressor'}
              </span>
              <button
                onClick={() => setActiveTab('horizon')}
                className="text-cyan-400 font-semibold hover:underline flex items-center gap-1"
              >
                <span>View 14-day Horizon</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: RECURSIVE MULTI-DAY HORIZON                                */}
      {/* ================================================================= */}
      {activeTab === 'horizon' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Recursive Multi-Day Forecast Horizon ({horizonDays} Days)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Autoregressively updates trailing moving statistics and prior day demand lags sequentially.
              </p>
            </div>

            {/* Horizon Period Selector */}
            <div className="flex items-center gap-2">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    setHorizonDays(days);
                    handleRunHorizonForecast();
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                    horizonDays === days
                      ? 'bg-cyan-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          {/* Horizon Interactive Chart */}
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={horizonResult?.forecast_series || []}
                margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="horizonConfidenceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis
                  unit=" MLD"
                  domain={['auto', 'auto']}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toFixed(2)} MLD`,
                    name === 'predicted_demand_mld' ? 'Forecasted Demand' : name
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                
                {/* 95% Confidence Upper Band Area */}
                <Area
                  type="monotone"
                  dataKey="ci_upper_95_mld"
                  name="95% Confidence Ceiling"
                  stroke="none"
                  fill="url(#horizonConfidenceGrad)"
                />
                <Line
                  type="monotone"
                  dataKey="predicted_demand_mld"
                  name="Predicted Demand (MLD)"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#06b6d4' }}
                  activeDot={{ r: 7 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Horizon Highlights */}
          {horizonResult && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 block">Total Volume</span>
                <span className="text-base font-bold text-cyan-400 mt-1 block">
                  {horizonResult.total_projected_volume_mcm.toFixed(2)} MCM
                </span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 block">Average Daily Rate</span>
                <span className="text-base font-bold text-white mt-1 block">
                  {horizonResult.average_daily_demand_mld.toFixed(1)} MLD
                </span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 block">Peak Demand Day</span>
                <span className="text-base font-bold text-amber-400 mt-1 block">
                  {horizonResult.peak_day.demand_mld.toFixed(1)} MLD
                </span>
                <span className="text-[10px] text-slate-500">{horizonResult.peak_day.date}</span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 block">Minimum Demand Day</span>
                <span className="text-base font-bold text-emerald-400 mt-1 block">
                  {horizonResult.minimum_day.demand_mld.toFixed(1)} MLD
                </span>
                <span className="text-[10px] text-slate-500">{horizonResult.minimum_day.date}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: FULL MONTHLY WATER BUDGET                                  */}
      {/* ================================================================= */}
      {activeTab === 'monthly' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                Calendar Month Water Consumption & Reservoir Budget
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulates all days of the month and integrates total demand into Million Cubic Meters (MCM) & Billion Litres.
              </p>
            </div>

            {/* Month & Year Form */}
            <div className="flex items-center gap-3">
              <select
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(parseInt(e.target.value))}
                className="bg-slate-950 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-800"
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>

              <select
                value={monthlyYear}
                onChange={(e) => setMonthlyYear(parseInt(e.target.value))}
                className="bg-slate-950 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-800"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <button
                onClick={handleRunMonthlyForecast}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition"
              >
                Run Budget
              </button>
            </div>
          </div>

          {/* Monthly Aggregated Highlights */}
          {monthlyResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Monthly Demand</span>
                <span className="text-2xl font-black text-cyan-400 mt-1 block">
                  {monthlyResult.total_monthly_demand_mld_days.toLocaleString()} MLD-Days
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {monthlyResult.days_in_month} Calendar Days
                </span>
              </div>

              <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Volumetric (MCM)</span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {monthlyResult.total_monthly_volume_mcm.toLocaleString()} MCM
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Million Cubic Meters
                </span>
              </div>

              <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Billion Litres</span>
                <span className="text-2xl font-black text-sky-400 mt-1 block">
                  {monthlyResult.total_monthly_billion_litres.toLocaleString()} BL
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  10^9 Liters
                </span>
              </div>

              <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Daily Average Demand</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  {monthlyResult.average_daily_demand_mld.toFixed(1)} MLD
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Peak: {monthlyResult.peak_day.demand_mld.toFixed(1)} MLD
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: WHAT-IF CONSERVATION SCENARIO SIMULATOR                    */}
      {/* ================================================================= */}
      {activeTab === 'scenarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Toggles */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Conservation Interventions
            </h2>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                <div className="pr-2">
                  <span className="text-xs font-bold text-white block">Continuous Leak Repair</span>
                  <span className="text-[11px] text-slate-400">Eliminate active night-time pipe ruptures</span>
                </div>
                <input
                  type="checkbox"
                  checked={scenario.leak_repaired}
                  onChange={(e) => setScenario({ ...scenario, leak_repaired: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                <div className="pr-2">
                  <span className="text-xs font-bold text-white block">Low-Flow Fixture Retrofit</span>
                  <span className="text-[11px] text-slate-400">Install aerators & dual-flush toilets</span>
                </div>
                <input
                  type="checkbox"
                  checked={scenario.fixture_retrofit}
                  onChange={(e) => setScenario({ ...scenario, fixture_retrofit: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                <div className="pr-2">
                  <span className="text-xs font-bold text-white block">Smart Weather Irrigation</span>
                  <span className="text-[11px] text-slate-400">Shift outdoor watering based on rainfall</span>
                </div>
                <input
                  type="checkbox"
                  checked={scenario.smart_irrigation}
                  onChange={(e) => setScenario({ ...scenario, smart_irrigation: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                <div className="pr-2">
                  <span className="text-xs font-bold text-white block">Behavioral Conservation</span>
                  <span className="text-[11px] text-slate-400">Community peak shaving and habits</span>
                </div>
                <input
                  type="checkbox"
                  checked={scenario.behavioral_conservation}
                  onChange={(e) => setScenario({ ...scenario, behavioral_conservation: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded"
                />
              </label>
            </div>
          </div>

          {/* Savings Outcome Card */}
          <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <h2 className="text-base font-bold text-white mb-2">Projected Conservation Impact</h2>
              <p className="text-xs text-slate-400 mb-6">
                Quantified reduction in daily municipal water withdrawal and operational cost savings.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-cyan-950/30 border border-cyan-500/30">
                  <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider block">
                    Potential Water Saved Daily
                  </span>
                  <div className="text-4xl font-extrabold text-white mt-2">
                    {(scenarioSavedLiters / 1000000).toFixed(2)}{' '}
                    <span className="text-lg font-bold text-slate-400">MLD</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Equivalent to {Math.round(scenarioSavedLiters).toLocaleString()} Litres / day
                  </span>
                </div>

                <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
                  <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">
                    Financial Operational Savings
                  </span>
                  <div className="text-4xl font-extrabold text-white mt-2">
                    ${scenarioCostSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                    <span className="text-lg font-bold text-slate-400">/ day</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    Based on standard municipal tariff ($3.65/1,000 m³)
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Intervention status active for {selectedCityMeta?.city_name || 'selected authority'}</span>
              <span className="text-emerald-400 font-bold">Optimal Conservation Path</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
