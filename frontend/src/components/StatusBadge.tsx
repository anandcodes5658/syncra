import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Loader2, Calendar } from 'lucide-react';

interface Props {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const norm = status.toLowerCase();

  const getStyle = () => {
    switch (norm) {
      case 'published':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
          label: 'Published'
        };
      case 'uploading':
      case 'publishing':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          icon: <Loader2 className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} animate-spin`} />,
          label: 'Uploading...'
        };
      case 'failed':
      case 'partially_failed':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          icon: <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
          label: norm === 'partially_failed' ? 'Partial Failure' : 'Failed'
        };
      case 'scheduled':
        return {
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          icon: <Calendar className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
          label: 'Scheduled'
        };
      case 'pending':
      case 'draft':
      default:
        return {
          bg: 'bg-neutral-800/80 text-neutral-300 border-neutral-700',
          icon: <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
          label: norm === 'draft' ? 'Draft' : 'Pending'
        };
    }
  };

  const current = getStyle();

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } ${current.bg}`}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};
