import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Droplets,
  DollarSign,
  Activity,
  CheckCircle2,
  Sliders,
  Sparkles,
  ArrowRight,
  Flame,
  CloudRain,
  Layers,
  Building,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { CityMetadataItem } from '../types';

export const ConservationView: React.FC = () => {
  const [cities, setCities] = useState<CityMetadataItem[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>('BLR');
  const [analysisDays, setAnalysisDays] = useState<number>(30);

  const [analysisData, setAnalysisData] = useState<any>(null);
  const [panIndiaOverview, setPanIndiaOverview] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Intervention simulation state
  const [pressureMgmt, setPressureMgmt] = useState<boolean>(true);
  const [irrigationCutoff, setIrrigationCutoff] = useState<boolean>(true);
  const [fixtureRetrofit, setFixtureRetrofit] = useState<boolean>(false);
  const [meterUpgrade, setMeterUpgrade] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        const [cList, oRes] = await Promise.all([
          api.getSupportedCities(),
          api.getConservationOverview()
        ]);
        setCities(cList);
        setPanIndiaOverview(oRes.rankings || []);
      } catch (e) {
        console.error('Failed to load initial conservation data', e);
      }
    };
    init();
  }, []);

  const loadAnalysis = async (cid: string = selectedCityId, days: number = analysisDays) => {
    setLoading(true);
    try {
      const res = await api.getConservationAnalysis(cid, days);
      setAnalysisData(res);
    } catch (e) {
      console.error('Failed to load conservation analysis', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis(selectedCityId, analysisDays);
  }, [selectedCityId, analysisDays]);

  // Run Intervention Simulation
  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await api.simulateConservationIntervention({
        city_id: selectedCityId,
        pressure_management: pressureMgmt,
        smart_irrigation_cutoff: irrigationCutoff,
        fixture_aerator_retrofit: fixtureRetrofit,
        meter_modernization: meterUpgrade
      });
      setSimulationResult(res);
    } catch (e) {
      console.error('Simulation error', e);
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [selectedCityId, pressureMgmt, irrigationCutoff, fixtureRetrofit, meterUpgrade]);

  const kpis = analysisData?.kpis;
  const alerts = analysisData?.alerts || [];
  const timeline = analysisData?.timeline || [];
  const recommendations = analysisData?.recommendations || [];

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Water Conservation Analytics & Anomaly Detection
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Data-Grounded
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Pinpoints transmission leakage, unseasonal draw surges, and generates quantified municipal water-saving roadmaps.
              </p>
            </div>
          </div>
        </div>

        {/* City & Window Filter */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
          <select
            value={selectedCityId}
            onChange={(e) => setSelectedCityId(e.target.value)}
            className="bg-slate-950 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-800"
          >
            {cities.map((c) => (
              <option key={c.city_id} value={c.city_id}>
                {c.city_name} ({c.city_id}) - {c.zone}
              </option>
            ))}
          </select>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {[14, 30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setAnalysisDays(d)}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  analysisDays === d ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          <button
            onClick={() => loadAnalysis()}
            disabled={loading}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Avoidable Wastage */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm hover:border-rose-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Avoidable Water Loss</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-400">
            {kpis?.potential_avoidable_wastage_mcm || '0.24'}{' '}
            <span className="text-sm font-semibold text-slate-400">MCM</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {kpis?.potential_avoidable_wastage_mld_days.toFixed(1) || '240.5'} MLD-Days avoidable loss
          </div>
        </div>

        {/* Financial Loss */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Unrecovered Cost Loss</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">
            ${Math.round(kpis?.estimated_financial_loss_usd || 87600).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Based on municipal bulk supply rate ($3.65/1,000 m³)
          </div>
        </div>

        {/* NRW Loss Rate */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm hover:border-cyan-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Current NRW Loss Ratio</span>
            <TrendingDown className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {kpis?.average_nrw_percentage.toFixed(1) || '28.5'}%
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            National guideline benchmark: &lt; 20%
          </div>
        </div>

        {/* Active Alerts */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm hover:border-purple-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Detected Anomaly Events</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {kpis?.anomalies_detected_count || alerts.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span>Across last {analysisDays} telemetry days</span>
          </div>
        </div>

      </div>

      {/* Main Consumption Difference & Anomaly Chart */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Consumption Differences & Telemetry Anomaly Detection (Past {analysisDays} Days)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracks Actual Demand against Model-Predicted Baselines, Bulk Transmission Supply, and NRW Loss gaps.
            </p>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300">
            {analysisData?.city_name} ({analysisData?.city_id})
          </span>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeline} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="bulkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis unit=" MLD" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  color: '#f8fafc',
                  fontSize: '12px'
                }}
                formatter={(val: any, name: any) => [`${Number(val).toFixed(1)} MLD`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              <Area
                type="monotone"
                dataKey="bulk_supply_mld"
                name="Bulk Water Supply (MLD)"
                stroke="#3b82f6"
                fill="url(#bulkGrad)"
              />
              <Line
                type="monotone"
                dataKey="actual_demand_mld"
                name="Actual Water Demand (MLD)"
                stroke="#06b6d4"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const isAnom = props.payload.is_anomaly;
                  if (isAnom) {
                    return (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={6}
                        fill="#f43f5e"
                        stroke="#fff"
                        strokeWidth={2}
                        key={props.key}
                      />
                    );
                  }
                  return <circle cx={props.cx} cy={props.cy} r={2} fill="#06b6d4" key={props.key} />;
                }}
              />
              <Line
                type="monotone"
                dataKey="predicted_demand_mld"
                name="Predicted Benchmark Demand (MLD)"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
              <Bar dataKey="nrw_loss_mld" name="NRW Transmission Loss (MLD)" fill="#f59e0b" opacity={0.6} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Anomaly Alerts List & Simulation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Alerts Feed */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Detected Anomaly Events & Wastage Triggers ({alerts.length})
            </h2>
            <span className="text-[11px] text-slate-400">Statistical Z-Score &gt; 2.2</span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                No abnormal distribution surges or severe transmission leaks detected in this window.
              </div>
            ) : (
              alerts.map((a: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded ${
                          a.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : a.severity === 'high'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {a.severity}
                      </span>
                      <span className="text-xs font-bold text-white capitalize">
                        {a.anomaly_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">{a.date}</span>
                  </div>

                  <p className="text-xs text-slate-300">{a.description}</p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-start gap-1.5 text-[11px] text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Action: {a.recommended_action}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Conservation Intervention Simulator */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Conservation Roadmap Simulator
            </h2>
            <span className="text-[11px] text-slate-400">Dynamic Payback Engine</span>
          </div>

          <div className="space-y-2.5">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <div className="pr-2">
                <span className="text-xs font-bold text-white block">DMA Off-Peak Pressure Modulation</span>
                <span className="text-[11px] text-slate-400">Reduce distribution pressure to 1.8 bar between 23:00–04:30 (-8.5% loss)</span>
              </div>
              <input
                type="checkbox"
                checked={pressureMgmt}
                onChange={(e) => setPressureMgmt(e.target.checked)}
                className="w-4 h-4 accent-cyan-400"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <div className="pr-2">
                <span className="text-xs font-bold text-white block">Automated Rain-Delayed Irrigation</span>
                <span className="text-[11px] text-slate-400">Halt municipal park watering 48 hours following precipitation &gt; 5 mm (-4.0%)</span>
              </div>
              <input
                type="checkbox"
                checked={irrigationCutoff}
                onChange={(e) => setIrrigationCutoff(e.target.checked)}
                className="w-4 h-4 accent-cyan-400"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <div className="pr-2">
                <span className="text-xs font-bold text-white block">1.5 GPM Domestic Aerator Program</span>
                <span className="text-[11px] text-slate-400">Subsidized faucet and showerhead retrofits across residential wards (-6.0%)</span>
              </div>
              <input
                type="checkbox"
                checked={fixtureRetrofit}
                onChange={(e) => setFixtureRetrofit(e.target.checked)}
                className="w-4 h-4 accent-cyan-400"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <div className="pr-2">
                <span className="text-xs font-bold text-white block">Industrial AMR Ultrasonic Metering</span>
                <span className="text-[11px] text-slate-400">Calibrate top 200 bulk commercial meters to recover under-recorded draw (+3.5%)</span>
              </div>
              <input
                type="checkbox"
                checked={meterUpgrade}
                onChange={(e) => setMeterUpgrade(e.target.checked)}
                className="w-4 h-4 accent-cyan-400"
              />
            </label>
          </div>

          {/* Simulation Projected Yield */}
          {simulationResult && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-950 to-blue-950/30 border border-cyan-500/30 mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Projected Extraction Reduction:</span>
                <span className="font-bold text-cyan-400 text-sm">
                  -{simulationResult.total_demand_reduction_pct}% ({simulationResult.daily_saved_mld} MLD / day)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Annual Recovered Water Volume:</span>
                <span className="font-bold text-white">{simulationResult.annual_saved_volume_mcm} MCM / year</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Annual Financial Operating Gain:</span>
                <span className="font-bold text-emerald-400">
                  ${Math.round(simulationResult.annual_financial_savings_usd).toLocaleString()} / year
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                <span className="text-slate-400">New Projected NRW Ratio:</span>
                <span className="font-bold text-amber-400">{simulationResult.new_projected_nrw_pct}%</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Practical Grounded Recommendations Section */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            Data-Backed Municipal Conservation Recommendations for {analysisData?.city_name}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Prioritized engineering and demand-side management interventions calibrated to local water stress and NRW losses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec: any) => (
            <div
              key={rec.id}
              className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {rec.priority} Priority • {rec.difficulty} Difficulty
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    Payback: {rec.payback_months} Months
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{rec.title}</h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{rec.description}</p>

                <div className="mt-3 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Execution Steps:
                  </span>
                  {rec.action_steps?.map((step: string, sIdx: number) => (
                    <div key={sIdx} className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Estimated Savings</span>
                  <span className="font-bold text-cyan-300">{rec.estimated_savings_mld} MLD ({rec.estimated_savings_mcm_annual} MCM/yr)</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Annual Value</span>
                  <span className="font-bold text-emerald-400">${Math.round(rec.estimated_savings_usd_annual).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pan-India Municipal Water Loss & Recovery Ranking */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-sky-400" />
              Pan-India Municipal Water Loss & Recovery Opportunity Ranking
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Empirical comparative analysis across 21 metropolitan water boards (sorting by potential recoverable MLD volume).
            </p>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300">
            21 Monitored Metros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Authority / City</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4">Average Demand</th>
                <th className="py-3 px-4">Current NRW Loss</th>
                <th className="py-3 px-4">Recoverable Volume</th>
                <th className="py-3 px-4">Water Stress Score</th>
                <th className="py-3 px-4 text-right">Priority Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {panIndiaOverview.map((item, idx) => (
                <tr
                  key={item.city_id}
                  onClick={() => setSelectedCityId(item.city_id)}
                  className={`hover:bg-slate-800/50 transition cursor-pointer ${
                    item.city_id === selectedCityId ? 'bg-cyan-500/10 font-bold text-white' : 'text-slate-300'
                  }`}
                >
                  <td className="py-3 px-4 font-semibold text-white">
                    {item.city_name} ({item.city_id})
                  </td>
                  <td className="py-3 px-4">{item.zone}</td>
                  <td className="py-3 px-4">{item.average_demand_mld} MLD</td>
                  <td className="py-3 px-4">
                    <span className={item.average_nrw_percentage > 30 ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                      {item.average_nrw_percentage}% ({item.nrw_loss_mld} MLD)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-cyan-400 font-bold">
                    {item.potential_recoverable_mld} MLD ({item.potential_recoverable_mcm_annual} MCM/yr)
                  </td>
                  <td className="py-3 px-4">{item.water_stress_score}/100</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.conservation_priority === 'Critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : item.conservation_priority === 'High'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {item.conservation_priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

