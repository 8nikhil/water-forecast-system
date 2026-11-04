import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CsvImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file to upload.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await api.importCsv(file);
      setMessage(res.message || 'Records imported successfully.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to upload CSV.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Import Water Consumption CSV</h3>
            <p className="text-xs text-slate-400">Upload meter logs from utility export or IoT datalogger</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-750 hover:border-cyan-500/50 rounded-2xl p-6 text-center transition cursor-pointer bg-slate-950/40">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
              <FileText className="w-10 h-10 text-cyan-400/80 mb-2" />
              <span className="text-sm font-semibold text-white">
                {file ? file.name : 'Click to select CSV file'}
              </span>
              <span className="text-xs text-slate-500 mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Expected columns: timestamp, consumption_liters, provenance'}
              </span>
            </label>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono">
            Sample header: timestamp,consumption_liters,provenance,end_use_category
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || loading}
              className="px-5 py-2 text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-cyan-600/30 transition flex items-center gap-2"
            >
              {loading ? 'Uploading...' : 'Import Records'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

