import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Sun,
  CloudRain,
  Thermometer,
  Droplets,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Sliders,
  Calendar,
  CheckCircle2,
  Wind,
  Umbrella,
  Zap,
  Info
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area
} from 'recharts';
import { WeatherImpactResponse, WeatherSimulateResult } from '../types';
import { api } from '../services/api';

export const WeatherImpactView: React.FC = () => {
  const [data, setData] = useState<WeatherImpactResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRangeDays, setSelectedRangeDays] = useState<number>(30);

  // Weather scenario simulation states
  const [tempChange, setTempChange] = useState<number>(3.0);
  const [rainfallScenario, setRainfallScenario] = useState<string>('drought');
  const [irrigationSmartDelay, setIrrigationSmartDelay] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<WeatherSimulateResult | null>(null);

  const fetchWeatherImpact = async (days: number) => {
    setLoading(true);
    try {
      const res = await api.getWeatherImpact(days);
      setData(res);
    } catch (err) {
      console.error('Failed to load weather impact analysis', err);
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await api.simulateWeather({
        temp_change_c: tempChange,
        rainfall_scenario: rainfallScenario,
        irrigation_smart_delay: irrigationSmartDelay,
      });
      setSimResult(res);
    } catch (err) {
      console.error('Simulation failed', err);
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    fetchWeatherImpact(selectedRangeDays);
  }, [selectedRangeDays]);

  useEffect(() => {
    runSimulation();
  }, [tempChange, rainfallScenario, irrigationSmartDelay]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <CloudSun className="w-5 h-5 text-amber-400" />
              <span>Weather & Climate Impact Analysis</span>
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Seasonal Climate Data
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Analyze how temperature rises and rainfall events directly affect residential and municipal water consumption.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          {[7, 14, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedRangeDays(days)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                selectedRangeDays === days
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Temp Correlation */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Temperature Elasticity</span>
            <Thermometer className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-orange-400 font-mono">
              +{data?.summary.temperature_elasticity_liters_per_c || 15.2} L
            </span>
            <span className="text-xs text-slate-400">/ °C surge</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Correlation: <span className="text-orange-400 font-mono font-bold">r = +{data?.summary.temperature_correlation.toFixed(2) || '0.72'}</span> (Strong positive)
          </p>
        </div>

        {/* Rainfall Correlation */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Rainfall Suppression</span>
            <CloudRain className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-400 font-mono">
              -{data?.summary.rain_suppression_pct || 21.5}%
            </span>
            <span className="text-xs text-slate-400">on rain days</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Correlation: <span className="text-cyan-400 font-mono font-bold">r = {data?.summary.rainfall_correlation.toFixed(2) || '-0.64'}</span> (Rain displaces irrigation)
          </p>
        </div>

        {/* Dry vs Rainy Daily Average */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Dry vs Rainy Baseline</span>
            <Umbrella className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-white font-mono">
              {data?.summary.dry_day_avg_liters || 395} L
            </span>
            <span className="text-xs text-slate-400">dry vs</span>
            <span className="text-xl font-black text-emerald-400 font-mono">
              {data?.summary.rainy_day_avg_liters || 310} L
            </span>
          </div>
          <p className="text-[11px] text-emerald-400/90 mt-2 font-mono">
            Save ~{((data?.summary.dry_day_avg_liters || 395) - (data?.summary.rainy_day_avg_liters || 310)).toFixed(0)} L/day during natural rainfall
          </p>
        </div>

        {/* AI Regression Model */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Regression Equation</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xs font-mono font-bold text-purple-300 truncate mt-1">
            {data?.summary.regression_formula || 'Demand = 45.2 + 15.4 × Temp'}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            {data?.summary.garden_irrigation_sensitivity || 'High outdoor garden sensitivity'}
          </p>
        </div>

      </div>

      {/* Primary Chart: Dual-Axis Weather vs Water Demand */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Historical Telemetry: Water Consumption vs Ambient Temperature & Rainfall</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Dual-axis multi-variable view showing how high heatwaves trigger demand spikes and heavy rainfall suppresses outdoor usage.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block"></span> Total Water (L)
            </span>
            <span className="flex items-center gap-1.5 text-orange-400">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block"></span> Temperature (°C)
            </span>
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/60 inline-block"></span> Rain (mm)
            </span>
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data?.historical_timeline || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => val.slice(5)}
              />
              {/* Left Y-axis: Water consumption in liters */}
              <YAxis
                yAxisId="left"
                stroke="#38bdf8"
                tick={{ fontSize: 11 }}
                domain={['auto', 'auto']}
                unit=" L"
              />
              {/* Right Y-axis: Temperature in Celsius */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#fb923c"
                tick={{ fontSize: 11 }}
                domain={[10, 40]}
                unit="°C"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
                formatter={(val: any, name: any) => {
                  if (name === 'consumption_liters') return [`${val} Liters`, 'Total Consumption'];
                  if (name === 'avg_temperature_c') return [`${val} °C`, 'Avg Temperature'];
                  if (name === 'rainfall_mm') return [`${val} mm`, 'Rainfall'];
                  return [val, name];
                }}
              />
              {/* Rainfall as background blue columns */}
              <Bar yAxisId="left" dataKey="rainfall_mm" fill="#3b82f6" opacity={0.35} radius={[4, 4, 0, 0]} name="Rainfall (mm)" />
              {/* Water consumption as solid cyan area/bar */}
              <Bar yAxisId="left" dataKey="consumption_liters" fill="#06b6d4" opacity={0.8} radius={[4, 4, 0, 0]} name="consumption_liters" />
              {/* Ambient temperature as sharp orange line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avg_temperature_c"
                stroke="#f97316"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#f97316' }}
                activeDot={{ r: 6 }}
                name="avg_temperature_c"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Weather Scenario Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Simulator Controls */}
        <div className="lg:col-span-1 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Climate Impact Simulator</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Simulate extreme weather events (heatwaves, droughts, or monsoons) and preview AI-forecasted demand shifts.
            </p>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Temperature Shift (ΔT)</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${tempChange > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {tempChange > 0 ? `+${tempChange.toFixed(1)}` : tempChange.toFixed(1)} °C
              </span>
            </div>
            <input
              type="range"
              min="-4.0"
              max="8.0"
              step="0.5"
              value={tempChange}
              onChange={(e) => setTempChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-4°C (Cold Front)</span>
              <span>0°C (Baseline)</span>
              <span>+8°C (Extreme Heatwave)</span>
            </div>
          </div>

          {/* Rainfall Scenario Selector */}
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-semibold block">Precipitation Scenario</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'drought', label: 'Dry Spell / Drought', desc: '0 mm Rain' },
                { id: 'normal', label: 'Seasonal Normal', desc: 'Scattered' },
                { id: 'heavy_rain', label: 'Monsoon Downpour', desc: 'Heavy Rain' }
              ].map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => setRainfallScenario(sc.id)}
                  className={`p-2 rounded-xl text-left border transition ${
                    rainfallScenario === sc.id
                      ? 'bg-amber-500/20 border-amber-500/50 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold leading-tight">{sc.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{sc.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Smart Rain Delay Toggle */}
          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={irrigationSmartDelay}
                onChange={(e) => setIrrigationSmartDelay(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-950 border-slate-700"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200">Smart Rain Shutoff Controller</span>
                <p className="text-[10px] text-slate-400">Automatically suppresses scheduled sprinkler runs when rain is detected.</p>
              </div>
            </label>
          </div>

        </div>

        {/* Simulator Results */}
        <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Projected Demand Under Simulated Weather</h3>
              </div>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Live Scenario
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {simResult?.scenario_description || 'Regression estimates projecting household demand adjustments based on weather changes.'}
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Baseline Daily Demand</div>
              <div className="text-xl font-black text-slate-300 font-mono mt-1">
                {simResult?.baseline_daily_liters || 360} L
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Standard normal climate</p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Simulated Demand</div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className={`text-2xl font-black font-mono ${
                  (simResult?.variance_pct || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {simResult?.simulated_daily_liters || 405} L
                </span>
                <span className={`text-xs font-bold font-mono ${
                  (simResult?.variance_pct || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  ({(simResult?.variance_pct || 0) > 0 ? '+' : ''}{simResult?.variance_pct || 12.5}%)
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">AI adjusted for temperature & rain</p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Estimated Monthly Cost Delta</div>
              <div className={`text-xl font-black font-mono mt-1 ${
                (simResult?.monthly_cost_impact_usd || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {(simResult?.monthly_cost_impact_usd || 0) > 0 ? '+' : ''}${simResult?.monthly_cost_impact_usd?.toFixed(2) || '4.95'}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">At municipal tariff ($3.65/m³)</p>
            </div>

          </div>

          {/* Recommended Adaptive Actions */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Recommended Adaptive Climate Strategies</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
              {simResult?.recommended_adaptive_actions.map((act, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{act}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Upcoming 7-Day Forecast & Water Demand Plan */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>7-Day Weather Forecast & Demand Advisory</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronized meteorological forecast with AI demand multiplier to proactively mitigate grid stress and recommend watering windows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {data?.upcoming_forecast.map((f, i) => {
            const isHeat = f.condition === 'Heatwave';
            const isRain = f.rainfall_mm > 5.0;

            return (
              <div
                key={i}
                className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 transition ${
                  isHeat
                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                    : isRain
                    ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{f.day_name}</span>
                    <span className="text-[10px] text-slate-400">{f.date.slice(5)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    {isHeat ? (
                      <Sun className="w-5 h-5 text-rose-400 animate-pulse" />
                    ) : isRain ? (
                      <CloudRain className="w-5 h-5 text-cyan-400" />
                    ) : (
                      <CloudSun className="w-5 h-5 text-amber-400" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-white">{f.condition}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {f.temperature_c}°C • {f.rainfall_mm}mm
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Projected Demand</div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-black font-mono text-white">
                      {f.projected_demand_liters} L
                    </span>
                    <span className={`text-[10px] font-bold font-mono ${
                      f.demand_shift_pct > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      ({f.demand_shift_pct > 0 ? '+' : ''}{f.demand_shift_pct}%)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-tight">
                    {f.recommendation}
                  </p>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Seasonal Insights Cards */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-400" />
            <span>Seasonal Demand Benchmarks & Climate Dynamics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical seasonal variation across Green Valley District municipal grid.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.seasonal_insights.map((s, idx) => (
            <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{s.season}</span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  {s.avg_temp_c}°C Avg
                </span>
              </div>
              <div className="text-lg font-black text-cyan-400 font-mono">
                {s.avg_demand_liters} L <span className="text-xs font-normal text-slate-400">/ day avg</span>
              </div>
              <div className="text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Key Driver:</span> {s.peak_driver}
              </div>
              <div className="text-xs text-emerald-400 pt-1 border-t border-slate-800">
                <span className="font-semibold text-slate-300">Action:</span> {s.recommended_action}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

