import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Printer,
  CheckCircle2,
  Calendar,
  Layers,
  AlertTriangle,
  Lightbulb,
  Building,
  RotateCw
} from 'lucide-react';
import { MonthlyAuditReport } from '../types';
import { api } from '../services/api';
import { ProvenanceBadge } from '../components/ProvenanceBadge';

interface Props {
  onOpenCsvImport: () => void;
}

export const ReportsView: React.FC<Props> = ({ onOpenCsvImport }) => {
  const [report, setReport] = useState<MonthlyAuditReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await api.getMonthlyAuditReport();
      setReport(data);
    } catch (err) {
      console.error('Failed to load monthly audit report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header with Export & Import Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Reports & Data Management Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Official monthly conservation audits, CSV telemetry exports, and manual file imports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={api.exportCsvUrl()}
            download
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={onOpenCsvImport}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 transition flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30 transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Audit Report</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <RotateCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Generating monthly water conservation audit...</p>
        </div>
      ) : report ? (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-8 print:bg-white print:text-black print:border-none print:shadow-none">
          
          {/* Printable Report Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-800 print:border-slate-300">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block mb-1">
                Official Monthly Audit • {report.report_id}
              </span>
              <h2 className="text-2xl font-black text-white print:text-black">
                Comprehensive Water Conservation & Leak Audit
              </h2>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                Issued for {report.household.name} • {report.household.address}, {report.household.district}
              </p>
            </div>

            <div className="text-right text-xs text-slate-400 print:text-slate-600 font-mono shrink-0">
              <p>Billing Period: {report.audit_period.start} to {report.audit_period.end}</p>
              <p>Total Billing Days: {report.audit_period.billing_days}</p>
              <p>Occupants: {report.household.occupants} Residents</p>
            </div>
          </div>

          {/* Consumption Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-2xl">
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">
                Total Month Volume
              </span>
              <p className="text-2xl font-black text-white print:text-black font-mono mt-0.5">
                {report.consumption_metrics.total_consumption_liters.toLocaleString()} L
              </p>
              <span className="text-[11px] text-slate-500 font-mono">
                {report.consumption_metrics.total_consumption_cubic_meters} m³
              </span>
            </div>

            <div className="p-4 bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-2xl">
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">
                Daily Average
              </span>
              <p className="text-2xl font-black text-cyan-400 font-mono mt-0.5">
                {report.consumption_metrics.daily_average_liters.toFixed(0)} L/day
              </p>
              <span className="text-[11px] text-slate-500 font-mono">
                {report.consumption_metrics.per_capita_daily_liters.toFixed(0)} L/person/day
              </span>
            </div>

            <div className="p-4 bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-2xl">
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">
                Estimated Water Bill
              </span>
              <p className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                ${report.consumption_metrics.estimated_water_bill_usd.toFixed(2)}
              </p>
              <span className="text-[11px] text-slate-500">
                Tariff: ${report.consumption_metrics.water_tariff_rate_usd_m3}/m³
              </span>
            </div>

            <div className="p-4 bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-2xl">
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">
                Estimated Wastage Loss
              </span>
              <p className="text-2xl font-black text-rose-400 font-mono mt-0.5">
                {report.wastage_and_leak_audit.estimated_wasted_liters.toLocaleString()} L
              </p>
              <span className="text-[11px] text-rose-400/80 font-mono">
                -${report.wastage_and_leak_audit.estimated_wasted_cost_usd.toFixed(2)} Lost
              </span>
            </div>
          </div>

          {/* Transparent Provenance Breakdown Table */}
          <div>
            <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Data Provenance Breakdown</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-800 print:border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Data Source / Classification</th>
                    <th className="py-2.5 px-3">Telemetry Mechanism</th>
                    <th className="py-2.5 px-3 text-right">Volume (Liters)</th>
                    <th className="py-2.5 px-3 text-right">Percentage of Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-slate-200 font-mono">
                  <tr>
                    <td className="py-2.5 px-3 font-sans">
                      <ProvenanceBadge provenance="measured" size="sm" />
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-400 print:text-slate-600">
                      Automated Ultrasonic Smart Meter #MTR-0001-ELE
                    </td>
                    <td className="py-2.5 px-3 text-right text-white print:text-black">
                      {report.provenance_breakdown.measured_liters.toLocaleString()} L
                    </td>
                    <td className="py-2.5 px-3 text-right text-cyan-400">
                      {((report.provenance_breakdown.measured_liters / report.consumption_metrics.total_consumption_liters) * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans">
                      <ProvenanceBadge provenance="user_entered" size="sm" />
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-400 print:text-slate-600">
                      Manual Homeowner Meter Dial Verification
                    </td>
                    <td className="py-2.5 px-3 text-right text-white print:text-black">
                      {report.provenance_breakdown.user_entered_liters.toLocaleString()} L
                    </td>
                    <td className="py-2.5 px-3 text-right text-purple-400">
                      {((report.provenance_breakdown.user_entered_liters / report.consumption_metrics.total_consumption_liters) * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans">
                      <ProvenanceBadge provenance="simulated" size="sm" />
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-400 print:text-slate-600">
                      Sensor Simulator & Benchmark Diagnostics
                    </td>
                    <td className="py-2.5 px-3 text-right text-white print:text-black">
                      {report.provenance_breakdown.simulated_liters.toLocaleString()} L
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-400">
                      {((report.provenance_breakdown.simulated_liters / report.consumption_metrics.total_consumption_liters) * 100).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Prioritized Conservation Roadmap */}
          <div>
            <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-emerald-400" />
              <span>Prioritized Conservation Remediation Checklist</span>
            </h3>
            <div className="space-y-2">
              {report.prioritized_actions.map((act, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <span className="font-bold text-white print:text-black block">{act.title}</span>
                      <span className="text-[11px] text-slate-400 print:text-slate-600 capitalize">
                        {act.category.replace('_', ' ')} • {act.difficulty} implementation
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono shrink-0">
                    <span className="font-bold text-emerald-400 block">
                      +${act.potential_saving_usd_month.toFixed(2)} / month
                    </span>
                    <span className="text-[10px] text-slate-400 print:text-slate-600">
                      Saves {act.potential_saving_liters_month.toLocaleString()} L/mo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Footer */}
          <div className="pt-6 border-t border-slate-800 print:border-slate-300 flex flex-col sm:flex-row justify-between text-[11px] text-slate-500 print:text-slate-600 font-mono">
            <span>Generated: {new Date(report.generated_at).toUTCString()}</span>
            <span>AquaPulse Conservation Intelligence Engine • Complies with ISO 46001 Water Efficiency Standards</span>
          </div>

        </div>
      ) : null}

    </div>
  );
};

