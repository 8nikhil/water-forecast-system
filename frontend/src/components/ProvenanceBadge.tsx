import React from 'react';
import { Radio, Edit3, Cpu, Sparkles } from 'lucide-react';
import { DataProvenance } from '../types';

interface Props {
  provenance: DataProvenance | string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ProvenanceBadge: React.FC<Props> = ({ provenance, size = 'sm', showLabel = true }) => {
  const p = provenance.toLowerCase();

  if (p === 'measured') {
    return (
      <span
        title="Measured Data: Direct telemetry from ultrasonic IoT smart meter"
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
        }`}
      >
        <Radio className={size === 'sm' ? 'w-3 h-3 text-blue-400 animate-pulse' : 'w-4 h-4 text-blue-400'} />
        {showLabel && <span>Measured (Smart Meter)</span>}
      </span>
    );
  }

  if (p === 'user_entered') {
    return (
      <span
        title="User-Entered Data: Manual meter dial input verified by homeowner"
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
        }`}
      >
        <Edit3 className={size === 'sm' ? 'w-3 h-3 text-purple-400' : 'w-4 h-4 text-purple-400'} />
        {showLabel && <span>User-Entered (Manual Dial)</span>}
      </span>
    );
  }

  if (p === 'simulated') {
    return (
      <span
        title="Simulated Data: Synthetic sensor test bench or telemetry simulator stream"
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
        }`}
      >
        <Cpu className={size === 'sm' ? 'w-3 h-3 text-amber-400' : 'w-4 h-4 text-amber-400'} />
        {showLabel && <span>Simulated (Sensor Test)</span>}
      </span>
    );
  }

  // predicted
  return (
    <span
      title="Predicted Data: Forecast produced by trained Scikit-Learn Gradient Boosting model"
      className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
    >
      <Sparkles className={size === 'sm' ? 'w-3 h-3 text-emerald-400' : 'w-4 h-4 text-emerald-400'} />
      {showLabel && <span>Predicted (ML Engine)</span>}
    </span>
  );
};

