import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  BarChart3,
  Clock,
  PieChart as PieIcon,
  Filter,
  Layers,
  Thermometer,
  Calendar,
  Building2,
  TrendingDown,
  Info
} from 'lucide-react';
import { TrendPoint, HourlyPoint, EndUseResponse, CityMetadataItem, HistoricalTelemetryRecord, HistoricalSummaryItem } from '../types';
import { api } from '../services/api';

interface Props {
  trends?: TrendPoint[];
  hourly?: HourlyPoint[];
  endUse?: EndUseResponse | null;
  onRefresh?: () => void;
}

export const AnalyticsView: React.FC<Props> = ({ trends = [], hourly = [], endUse }) => {
  const [activeTab, setActiveTab] = useState<'municipal' | 'household'>('municipal');
  const [horizonDays, setHorizonDays] = useState<number>(30);
  
  // Municipal Historical Telemetry State
  const [cities, setCities] = useState<CityMetadataItem[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>('BLR');
  const [municipalData, setMunicipalData] = useState<HistoricalTelemetryRecord[]>([]);
  const [citySummaries, setCitySummaries] = useState<HistoricalSummaryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchCitiesAndSummaries = async () => {
      try {
        const [cList, sList] = await Promise.all([
          api.getSupportedCities(),
          api.getHistoricalSummary()
        ]);
        setCities(cList);
        setCitySummaries(sList.cities || []);
      } catch (err) {
        console.error('Failed to load cities/summaries', err);
      }
    };
    fetchCitiesAndSummaries();
  }, []);

  // Fetch telemetry for selected city
  useEffect(() => {
    const fetchCityTelemetry = async () => {
      setLoading(true);
      try {
        const res = await api.getHistoricalTelemetry({
          city_id: selectedCityId,
          limit: horizonDays
        });
        const sorted = (res.records || []).reverse();
        setMunicipalData(sorted);
      } catch (err) {
        console.error('Failed to fetch municipal telemetry', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCityTelemetry();
  }, [selectedCityId, horizonDays]);

  // Aggregate monthly data for the selected city
  const monthlyAggregates = React.useMemo(() => {
    const months = [
      { month: 'Jan', demand: 0, count: 0 },
      { month: 'Feb', demand: 0, count: 0 },
      { month: 'Mar', demand: 0, count: 0 },
      { month: 'Apr', demand: 0, count: 0 },
      { month: 'May', demand: 0, count: 0 },
      { month: 'Jun', demand: 0, count: 0 },
      { month: 'Jul', demand: 0, count: 0 },
      { month: 'Aug', demand: 0, count: 0 },
      { month: 'Sep', demand: 0, count: 0 },
      { month: 'Oct', demand: 0, count: 0 },
      { month: 'Nov', demand: 0, count: 0 },
      { month: 'Dec', demand: 0, count: 0 },
    ];
    municipalData.forEach((d) => {
      const mIdx = new Date(d.record_date).getMonth();
      if (mIdx >= 0 && mIdx < 12) {
        months[mIdx].demand += d.actual_demand_mld;
        months[mIdx].count += 1;
      }
    });
    return months.map((m) => ({
      month: m.month,
      avg_mld: m.count > 0 ? Number((m.demand / m.count).toFixed(1)) : 0
    }));
  }, [municipalData]);

  const selectedSummary = citySummaries.find((s) => s.city_id === selectedCityId);

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span>Historical Consumption & Trend Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Empirical telemetry covering bulk water supply, billed consumption, and non-revenue water (NRW) gap.
          </p>
        </div>

        {/* View Switcher & Time Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('municipal')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'municipal' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pan-India Municipal
            </button>
            <button
              onClick={() => setActiveTab('household')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'household' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Smart Meter Fleet
            </button>
          </div>

          {activeTab === 'municipal' && (
            <select
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="bg-slate-950 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-800"
            >
              {cities.map((c) => (
                <option key={c.city_id} value={c.city_id}>
                  {c.city_name} ({c.city_id})
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {[7, 14, 30, 90].map((days) => (
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
      {/* MUNICIPAL PAN-INDIA HISTORICAL CHARTS                             */}
      {/* ================================================================= */}
      {activeTab === 'municipal' && (
        <div className="space-y-6">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Average Daily Demand</span>
              <span className="text-2xl font-black text-cyan-400 mt-1 block">
                {selectedSummary?.average_demand_mld.toFixed(1) || '1,492.3'} MLD
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Peak: {selectedSummary?.max_demand_mld.toFixed(1) || '1,650.0'} MLD
              </span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Extraction Volume</span>
              <span className="text-2xl font-black text-white mt-1 block">
                {selectedSummary?.total_volume_mcm.toFixed(1) || '1,089.4'} MCM
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Million Cubic Meters (2-Year Span)
              </span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Average NRW Loss Rate</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">
                {selectedSummary?.average_nrw_pct.toFixed(1) || '26.4'}%
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Loss: {selectedSummary?.average_nrw_loss_mld.toFixed(1) || '390.0'} MLD
              </span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 uppercase tracking-wider block">CPHEEO Per Capita Target</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {selectedSummary?.cpheeo_target_lpcd || 135} LPCD
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Water Stress Index: {selectedSummary?.water_stress_score.toFixed(0) || 100}/100
              </span>
            </div>
          </div>

          {/* Daily Consumption Trends Area Chart */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Daily Water Demand & Distribution (Last {horizonDays} Days)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Actual consumption compared with Bulk Supply and Billed Consumption.
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={municipalData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="supplyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="record_date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis unit=" MLD" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(val: any, name: any) => [`${Number(val).toFixed(2)} MLD`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                  <Area
                    type="monotone"
                    dataKey="bulk_supply_mld"
                    name="Bulk Supply (MLD)"
                    stroke="#3b82f6"
                    fill="url(#supplyGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="actual_demand_mld"
                    name="Actual Demand (MLD)"
                    stroke="#06b6d4"
                    fill="url(#demandGrad)"
                  />
                  <Line
                    type="monotone"
                    dataKey="billed_consumption_mld"
                    name="Billed Consumption (MLD)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Aggregated Trend & City Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Monthly Aggregated Bar Chart */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Monthly Aggregated Consumption Profile (Annual Cycle)
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyAggregates} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis unit=" MLD" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => [`${val} MLD`, 'Average Demand']}
                    />
                    <Bar dataKey="avg_mld" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Indian Municipalities Comparison */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-sky-400" />
                Comparative Daily Demand Across Indian Metros
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={citySummaries.slice(0, 7)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" unit=" MLD" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis dataKey="city_name" type="category" tick={{ fill: '#e2e8f0', fontSize: 11 }} width={70} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => [`${val} MLD`, 'Average Daily Demand']}
                    />
                    <Bar dataKey="average_demand_mld" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ================================================================= */}
      {/* HOUSEHOLD SMART METER FLEET VIEW                                  */}
      {/* ================================================================= */}
      {activeTab === 'household' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Diurnal Hourly Profile */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-cyan-400" />
              24-Hour Diurnal Household Usage Curve
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis unit=" L" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                  <Area type="monotone" dataKey="average_liters" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* End-Use Attribution Donut */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <PieIcon className="w-4 h-4 text-purple-400" />
              Household Appliance End-Use Breakdown
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={endUse?.breakdown || []}
                    dataKey="liters"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {(endUse?.breakdown || []).map((entry, index) => (
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
                    formatter={(val: any, name: any) => [`${val} Liters`, name]}
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
