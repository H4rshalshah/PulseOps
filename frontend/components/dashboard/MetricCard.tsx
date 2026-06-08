'use client';

import { memo } from 'react';
import { AlertTriangle, Clock, Activity, BookOpen } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: 'incidents' | 'mttr' | 'active' | 'actions';
  trend?: { value: number; positive: boolean };
}

const iconMap = {
  incidents: AlertTriangle,
  mttr: Clock,
  active: Activity,
  actions: BookOpen,
};

const colorMap = {
  incidents: { bg: 'bg-deadman-danger/10', border: 'border-deadman-danger/20', text: 'text-deadman-danger' },
  mttr: { bg: 'bg-deadman-cyan/10', border: 'border-deadman-cyan/20', text: 'text-deadman-cyan' },
  active: { bg: 'bg-deadman-success/10', border: 'border-deadman-success/20', text: 'text-deadman-success' },
  actions: { bg: 'bg-deadman-warning/10', border: 'border-deadman-warning/20', text: 'text-deadman-warning' },
};

function MetricCardComponent({ title, value, subtitle, icon, trend }: MetricCardProps) {
  const Icon = iconMap[icon];
  const colors = colorMap[icon];

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-deadman-muted uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon size={18} className={colors.text} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold font-mono text-deadman-text">{value}</span>
        {trend && (
          <span className={`text-xs font-medium mb-1 ${trend.positive ? 'text-deadman-success' : 'text-deadman-danger'}`}>
            {trend.positive ? '+' : '-'}{trend.value}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-deadman-muted mt-1">{subtitle}</p>}
    </div>
  );
}

export default memo(MetricCardComponent);
