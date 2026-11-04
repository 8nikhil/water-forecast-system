import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Radio,
  BatteryCharging,
  Wifi,
  Cpu,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Building,
  Users,
  Search,
  Droplets,
  Database,
  Upload,
  Download,
  Plus,
  Trash2,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Layers,
  Sparkles,
  FileText
} from 'lucide-react';
import {
  AdminOverview,
  SmartMeterInfo,
  HouseholdInfo,
  AdminUser,
  AdminDataset,
  DatasetUploadResult
} from '../types';
import { api } from '../services/api';

export const AdminView: React.FC = () => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [meters, setMeters] = useState<SmartMeterInfo[]>([]);
  const [households, setHouseholds] = useState<HouseholdInfo[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [datasets, setDatasets] = useState<AdminDataset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [retraining, setRetraining] = useState<boolean>(false);
  const [retrainMsg, setRetrainMsg] = useState<string | null>(null);

  // Active Tab: datasets, users, meters, households, reports
  const [activeTab, setActiveTab] = useState<'datasets' | 'users' | 'meters' | 'households'>('datasets');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // User creation modal/form states
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('password123');
  const [newUserRole, setNewUserRole] = useState<'resident' | 'utility_admin' | 'analyst'>('resident');
  const [userActionMsg, setUserActionMsg] = useState<string | null>(null);

  // Dataset upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<DatasetUploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ov, mtrs, hhs, usrs, dsets] = await Promise.allSettled([
        api.getAdminOverview(),
        api.getAdminMeters(),
        api.getAdminHouseholds(),
        api.getAdminUsers(),
        api.getAdminDatasets(),
      ]);

      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (mtrs.status === 'fulfilled') setMeters(mtrs.value);
      if (hhs.status === 'fulfilled') setHouseholds(hhs.value);
      if (usrs.status === 'fulfilled') setUsers(usrs.value);
      if (dsets.status === 'fulfilled') setDatasets(dsets.value);
    } catch (err) {
      console.error('Failed to load admin fleet data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRetrainFleet = async () => {
    setRetraining(true);
    setRetrainMsg(null);
    try {
      const res = await api.retrainFleet();
      setRetrainMsg(res.message);
      setTimeout(() => setRetrainMsg(null), 5000);
    } catch (err) {
      setRetrainMsg('Fleet retraining failed.');
    } finally {
      setRetraining(false);
    }
  };

  const handleDownloadSampleCsv = async () => {
    try {
      const res = await api.getSampleCsvTemplate();
      const blob = new Blob([res.template], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', res.filename || 'water_telemetry_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading sample CSV', err);
    }
  };

  const handleUploadDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const result = await api.uploadCustomDataset(uploadFile);
      setUploadResult(result);
      setUploadFile(null);
      // Refresh datasets
      const freshDatasets = await api.getAdminDatasets();
      setDatasets(freshDatasets);
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload dataset.');
    } finally {
      setUploading(false);
    }
  };

  const handleActivateDataset = async (datasetId: string) => {
    try {
      await api.activateDataset(datasetId);
      const freshDatasets = await api.getAdminDatasets();
      setDatasets(freshDatasets);
    } catch (err) {
      console.error('Failed to activate dataset', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAdminUser({
        full_name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        household_id: 1,
      });
      setUserActionMsg(`User '${newUserName}' created successfully!`);
      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      const freshUsers = await api.getAdminUsers();
      setUsers(freshUsers);
      setTimeout(() => setUserActionMsg(null), 4000);
    } catch (err: any) {
      setUserActionMsg(err.response?.data?.detail || 'Failed to create user.');
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await api.toggleUserStatus(userId, !currentStatus);
      const freshUsers = await api.getAdminUsers();
      setUsers(freshUsers);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteAdminUser(userId);
      const freshUsers = await api.getAdminUsers();
      setUsers(freshUsers);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not delete user.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-purple-400" />
              <span>Utility Administration: Datasets, Users & System Overview</span>
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Department Portal
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {overview?.utility_name || 'Municipal Water Works'} • {overview?.district || 'Green Valley District'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRetrainFleet}
            disabled={retraining}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white shadow-md shadow-purple-600/30 transition flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
            <span>{retraining ? 'Updating Models...' : 'Refresh Demand Forecast Models'}</span>
          </button>
        </div>
      </div>

      {retrainMsg && (
        <div className="p-3 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{retrainMsg}</span>
        </div>
      )}

      {userActionMsg && (
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{userActionMsg}</span>
        </div>
      )}

      {/* Fleet KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Managed Datasets */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Loaded Datasets</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-400 font-mono">
              {datasets.length || 3}
            </span>
            <span className="text-xs text-slate-400">
              ({overview?.total_smart_meters ? '2,160+' : 'Standard'} rows active)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Upload custom CSV anytime
          </p>
        </div>

        {/* System Users */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Registered Users</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-400 font-mono">
              {users.length || 2}
            </span>
            <span className="text-xs text-slate-400">accounts</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Residents & Utility Admins
          </p>
        </div>

        {/* Fleet Connectivity */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Fleet Connectivity</span>
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {overview?.fleet_connectivity_pct || 100}%
            </span>
            <span className="text-xs text-slate-400">
              ({overview?.online_smart_meters || 3}/{overview?.total_smart_meters || 3} Online)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            LoRaWAN AMI Smart Meters
          </p>
        </div>

        {/* Active Leak Wastage */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Fleet Leak Wastage</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400 font-mono">
              {overview?.fleet_daily_wasted_liters.toLocaleString() || '340'} L
            </span>
            <span className="text-xs text-slate-400">/ day</span>
          </div>
          <p className="text-[11px] text-rose-400/90 mt-2 font-mono">
            -${overview?.fleet_daily_wasted_cost_usd.toFixed(2) || '1.24'}/day active loss
          </p>
        </div>

      </div>

      {/* Main Admin Tabs Section */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
        
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            
            <button
              onClick={() => setActiveTab('datasets')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'datasets'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Datasets & CSV Upload ({datasets.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'users'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Management ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('meters')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'meters'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Smart Meter Fleet ({meters.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('households')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'households'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Households ({households.length})</span>
            </button>

          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 w-full sm:w-56"
            />
          </div>
        </div>

        {/* TAB 1: DATASETS & CSV UPLOAD */}
        {activeTab === 'datasets' && (
          <div className="space-y-6">
            
            {/* Upload & Template Bar */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Upload Custom Project Dataset</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Import historical water telemetry from smart meters, SCADA, or research spreadsheets.
                  </p>
                </div>
                <button
                  onClick={handleDownloadSampleCsv}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download Sample CSV Template</span>
                </button>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleUploadDataset} className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 file:cursor-pointer cursor-pointer border border-slate-800 bg-slate-900 rounded-xl p-1.5 w-full sm:w-auto flex-1"
                />
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white shadow-md shadow-cyan-600/30 transition flex items-center gap-1.5 w-full sm:w-auto justify-center"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'Ingesting...' : 'Ingest & Validate CSV'}</span>
                </button>
              </form>

              {uploadResult && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{uploadResult.message}</span>
                  </div>
                  <div className="font-mono text-[11px] text-emerald-400/90 pl-5">
                    Ingested {uploadResult.valid_rows} rows • Total Volume: {uploadResult.total_liters_ingested.toLocaleString()} L • Avg: {uploadResult.avg_liters_per_reading} L/reading
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            {/* Datasets Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-sans font-semibold">
                    <th className="py-2.5 px-3">Dataset Name</th>
                    <th className="py-2.5 px-3">Records</th>
                    <th className="py-2.5 px-3">Date Range</th>
                    <th className="py-2.5 px-3">Features Included</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {datasets.map((ds) => (
                    <tr key={ds.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{ds.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{ds.description}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-cyan-400">
                        {ds.record_count.toLocaleString()} rows
                      </td>
                      <td className="py-3 px-3 text-slate-300">{ds.date_range}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {ds.features.map((f, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-[9px] rounded bg-slate-800 text-slate-300 font-mono">
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {ds.status === 'active' ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                            Active Pipeline
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                            Ready
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {ds.status !== 'active' && (
                          <button
                            onClick={() => handleActivateDataset(ds.id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition"
                          >
                            Set Active
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs text-slate-400">
                Manage platform users, roles, and authorization policies across utility teams and consumers.
              </p>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New User</span>
              </button>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-sans font-semibold">
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Assigned Household</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3 font-bold text-white">{u.full_name}</td>
                      <td className="py-3 px-3 font-mono text-slate-300">{u.email}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          u.role === 'utility_admin'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : u.role === 'analyst'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{u.household_name || 'Municipal Operations'}</td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                          className="flex items-center gap-1.5 cursor-pointer text-xs"
                        >
                          {u.is_active ? (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <ToggleRight className="w-4 h-4 text-emerald-400" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-500">
                              <ToggleLeft className="w-4 h-4 text-slate-500" /> Inactive
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                          title="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB 3: SMART METER FLEET */}
        {activeTab === 'meters' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-sans">
                  <th className="py-2.5 px-3">Serial Number</th>
                  <th className="py-2.5 px-3">Hardware Model</th>
                  <th className="py-2.5 px-3">Firmware</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Battery</th>
                  <th className="py-2.5 px-3">Signal (dBm)</th>
                  <th className="py-2.5 px-3">Last Telemetry Ping</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {meters.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-3 font-bold text-white">{m.serial_number}</td>
                    <td className="py-3 px-3 font-sans text-slate-300">{m.meter_model}</td>
                    <td className="py-3 px-3 text-slate-400">{m.firmware_version}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-bold">
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{m.battery_level_pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{m.signal_strength_dbm.toFixed(0)} dBm</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {m.last_ping ? new Date(m.last_ping).toLocaleTimeString() : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: ENROLLED HOUSEHOLDS */}
        {activeTab === 'households' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-sans font-semibold">
                  <th className="py-2.5 px-3">Household Name</th>
                  <th className="py-2.5 px-3">Address & District</th>
                  <th className="py-2.5 px-3">Occupants</th>
                  <th className="py-2.5 px-3">Property Type</th>
                  <th className="py-2.5 px-3">Daily Budget</th>
                  <th className="py-2.5 px-3">Active Leaks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {households.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-3 font-bold text-white">{h.name}</td>
                    <td className="py-3 px-3 text-slate-300">
                      <div>{h.address}</div>
                      <div className="text-[10px] text-slate-500">{h.district}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-400">{h.occupants}</td>
                    <td className="py-3 px-3 text-slate-400">{h.property_type}</td>
                    <td className="py-3 px-3 font-mono text-white">{h.daily_budget_liters} L/day</td>
                    <td className="py-3 px-3">
                      {h.active_leaks_count > 0 ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          {h.active_leaks_count} Leak Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              <span>Register New System User</span>
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jordan Hayes"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="user@aquapulse.io"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Access Role</label>
                <select
                  value={newUserRole}
                  onChange={(e: any) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="resident">Resident / Consumer</option>
                  <option value="utility_admin">Municipal Utility Admin</option>
                  <option value="analyst">Data Scientist / Analyst</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition shadow-md shadow-purple-600/30"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
