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
  incidents: { bg: 'bg-pulseops-danger/10', border: 'border-pulseops-danger/20', text: 'text-pulseops-danger' },
  mttr: { bg: 'bg-pulseops-cyan/10', border: 'border-pulseops-cyan/20', text: 'text-pulseops-cyan' },
  active: { bg: 'bg-pulseops-success/10', border: 'border-pulseops-success/20', text: 'text-pulseops-success' },
  actions: { bg: 'bg-pulseops-warning/10', border: 'border-pulseops-warning/20', text: 'text-pulseops-warning' },
};

function MetricCardComponent({ title, value, subtitle, icon, trend }: MetricCardProps) {
  const Icon = iconMap[icon];
  const colors = colorMap[icon];

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-pulseops-muted uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon size={18} className={colors.text} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold font-mono text-pulseops-text">{value}</span>
        {trend && (
          <span className={`text-xs font-medium mb-1 ${trend.positive ? 'text-pulseops-success' : 'text-pulseops-danger'}`}>
            {trend.positive ? '+' : '-'}{trend.value}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-pulseops-muted mt-1">{subtitle}</p>}
    </div>
  );
}

export default memo(MetricCardComponent);
