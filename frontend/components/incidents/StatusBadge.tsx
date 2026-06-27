'use client';

import { memo } from 'react';
import { clsx } from 'clsx';
import type { IncidentStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: IncidentStatus;
  size?: 'sm' | 'md';
}

const statusConfig = {
  open: { label: 'Open', color: 'bg-pulseops-danger/10 text-pulseops-danger border-pulseops-danger/20' },
  investigating: { label: 'Investigating', color: 'bg-pulseops-warning/10 text-pulseops-warning border-pulseops-warning/20' },
  mitigating: { label: 'Mitigating', color: 'bg-pulseops-cyan/10 text-pulseops-cyan border-pulseops-cyan/20' },
  resolved: { label: 'Resolved', color: 'bg-pulseops-success/10 text-pulseops-success border-pulseops-success/20' },
};

function StatusBadgeComponent({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        config.color
      )}
    >
      <span className={clsx(
        'inline-block rounded-full',
        size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
        status === 'resolved' ? 'bg-current' : 'bg-current animate-pulse'
      )} />
      {config.label}
    </span>
  );
}

export default memo(StatusBadgeComponent);
