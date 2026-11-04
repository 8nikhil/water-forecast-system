import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  TrendingDown,
  Target,
  Trophy,
  CheckCircle2,
  HelpCircle,
  ArrowDownRight,
  ShieldCheck
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { ComparisonReport, CommunityStats } from '../types';
import { api } from '../services/api';

interface Props {
  initialComparison: ComparisonReport | null;
}

export const CommunityView: React.FC<Props> = ({ initialComparison }) => {
  const [comparison, setComparison] = useState<ComparisonReport | null>(initialComparison);
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [compRes, statsRes] = await Promise.all([
          api.getComparison(),
          api.getCommunityStats(),
        ]);
        setComparison(compRes);
        setStats(statsRes);
      } catch (err) {
        console.error('Failed to load community stats', err);
      }
    };
    fetchStats();
  }, []);

  const chartData = [
    {
      name: 'Your Household',
      liters: comparison?.user_daily_average_liters || 320,
      fill: '#0ea5e9',
    },
    {
      name: 'Efficient Homes (Top 20%)',
      liters: comparison?.efficient_benchmark_liters || 285,
      fill: '#10b981',
    },
    {
      name: 'District Average',
      liters: comparison?.community_average_liters || 420,
      fill: '#64748b',
    },
    {
      name: 'High Usage (80th Pct)',
      liters: 590,
      fill: '#f43f5e',
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          <h1 className="text-xl font-bold text-white">Household & Community Social Comparisons</h1>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Benchmarking your water footprint against similar {comparison?.occupants || 3}-occupant homes in {comparison?.district || 'Green Valley District'}
        </p>
      </div>

      {/* Hero Social Comparison Banner */}
      <div className="p-6 bg-gradient-to-r from-blue-950/40 via-slate-900 to-cyan-950/40 border border-cyan-500/30 rounded-2xl shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>{comparison?.tier || 'Water Conscious'}</span>
            </div>

            <h2 className="text-2xl font-black text-white">
              {comparison?.comparison_text || 'You consume 23.8% less water than your neighborhood average.'}
            </h2>

            <p className="text-xs text-slate-300">
              Ranked in the <strong>Top {100 - (comparison?.percentile_rank || 82)}%</strong> most water-efficient homes with {comparison?.occupants || 3} residents.
            </p>
          </div>

          <div className="p-5 bg-slate-950/90 border border-cyan-500/30 rounded-2xl text-center shrink-0 min-w-[200px]">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
              Efficiency Percentile
            </span>
            <span className="text-4xl font-black text-cyan-400 font-mono">
              {comparison?.percentile_rank || 86}%
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Higher is more efficient
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Benchmark Chart + District Goal Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Social Comparison Bar Chart */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Daily Consumption Benchmarking</h3>
              <p className="text-xs text-slate-400">Comparing liters per day against neighborhood percentiles</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">3 Occupants</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: any) => [`${val} Liters / day`, 'Consumption']}
                />
                <Bar dataKey="liters" radius={[0, 6, 6, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Your Daily Avg: <strong className="text-cyan-400">{comparison?.user_daily_average_liters || 320} L</strong></span>
            <span>Efficient Target: <strong className="text-emerald-400">{comparison?.efficient_benchmark_liters || 285} L</strong></span>
          </div>
        </div>

        {/* District Water Conservation Goal */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  District Conservation Campaign
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Green Valley
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Green Valley District has committed to a <strong>15% total water reduction</strong> this summer season to safeguard municipal aquifers and reservoir levels.
            </p>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 mb-5">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="font-semibold text-slate-300">Campaign Progress</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {stats?.district_current_reduction_pct || 11.2}% / {stats?.district_target_reduction_pct || 15}% Target
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${((stats?.district_current_reduction_pct || 11.2) / 15) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono">
                <span>74.7% of Goal Achieved</span>
                <span>48 Days Remaining</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Community Water Saved</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {stats ? (stats.district_water_saved_liters_ytd / 1000).toLocaleString() : '2,480'} m³
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Financial Savings</span>
                <span className="text-lg font-black text-cyan-400 font-mono">
                  +${stats?.district_water_saved_usd_ytd.toLocaleString() || '9,052'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Enrolled Households: {stats?.total_enrolled_households || 580}</span>
            <span>Audited Leaks Fixed: {stats?.active_anomalies_resolved_this_month || 42}</span>
          </div>
        </div>

      </div>

      {/* Neighborhood Efficiency Leaderboard */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Neighborhood Conservation Leaderboard
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Neighborhood Sector</th>
                <th className="py-2.5 px-3">Efficiency Score</th>
                <th className="py-2.5 px-3">Average Daily Consumption</th>
                <th className="py-2.5 px-3">Conservation Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {stats?.community_leaderboard.map((item) => {
                const isUserDistrict = item.rank === 2;
                return (
                  <tr
                    key={item.rank}
                    className={`hover:bg-slate-800/40 transition ${
                      isUserDistrict ? 'bg-cyan-500/10 border-l-2 border-cyan-400' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-white">#{item.rank}</td>
                    <td className="py-3 px-3 font-sans font-medium text-slate-200">
                      {item.neighborhood} {isUserDistrict && <span className="text-[10px] text-cyan-400 font-bold ml-1">(Your Sector)</span>}
                    </td>
                    <td className="py-3 px-3 text-cyan-400 font-bold">{item.efficiency_score}/100</td>
                    <td className="py-3 px-3 text-slate-300">{item.avg_daily_liters} L/day</td>
                    <td className="py-3 px-3 font-sans">
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {item.badge}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

