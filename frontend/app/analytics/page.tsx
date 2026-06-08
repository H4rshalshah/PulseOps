'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { analyticsApi } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { Loader2, BarChart3, TrendingUp, PieChart as PieChartIcon, Activity, AlertCircle } from 'lucide-react';
import type { MTTRDataPoint, IncidentsByDay, SourceData } from '@/lib/types';

// Dynamically load the heavy recharts chart components
const MTTRLineChart = dynamic(() => import('@/components/analytics/MTTRLineChart'), { ssr: false });
const SeverityBarChart = dynamic(() => import('@/components/analytics/SeverityBarChart'), { ssr: false });
const SourcePieChart = dynamic(() => import('@/components/analytics/SourcePieChart'), { ssr: false });

function ChartSkeleton({ title }: { title: string }) {
  return (
    <div className="bg-deadman-surface border border-deadman-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-deadman-text mb-4">{title}</h3>
      <div className="h-[300px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={20} className="text-deadman-cyan animate-spin" />
          <span className="text-xs text-deadman-muted">Loading chart...</span>
        </div>
      </div>
    </div>
  );
}

const COLORS = ['#FF3B5C', '#FFB020', '#00D4FF', '#00E5A0', '#6B7A99', '#E8EBF0'];

export default function AnalyticsPage() {
  const [mttrData, setMttrData] = useState<MTTRDataPoint[]>([]);
  const [incidentsByDay, setIncidentsByDay] = useState<IncidentsByDay[]>([]);
  const [sources, setSources] = useState<SourceData[]>([]);
  const [resolutionRate, setResolutionRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      analyticsApi.getMTTR(),
      analyticsApi.getIncidentsByDay(),
      analyticsApi.getSources(),
      analyticsApi.getResolutionRate(),
    ]).then(([mttr, dayData, srcData, resRate]) => {
      setMttrData(mttr);
      setIncidentsByDay(dayData);
      setSources(srcData);
      setResolutionRate(parseFloat(resRate.resolution_rate.toFixed(1)));
      setError(null);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    }).finally(() => setLoading(false));
  }, []);

  const mttrChartData = mttrData.map(d => ({
    date: format(parseISO(d.date), 'MMM dd'),
    mttr: d.avg_mttr ? Math.round(d.avg_mttr / 60) : 0,
  }));

  const severityChartData = incidentsByDay.reduce(
    (acc: { name: string; critical: number; high: number; medium: number; low: number }[], day) => {
      const date = format(parseISO(day.date), 'MMM dd');
      acc.push({
        name: date,
        critical: day.critical,
        high: day.high,
        medium: day.medium,
        low: day.low,
      });
      return acc;
    },
    []
  );

  const totalIncidents = incidentsByDay.reduce((sum, d) => sum + d.total, 0);
  const avgPerDay = totalIncidents > 0 ? (totalIncidents / Math.max(incidentsByDay.length, 1)).toFixed(1) : '0';

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle size={48} className="text-deadman-danger mb-4" />
        <h2 className="text-xl font-heading font-bold text-deadman-text mb-2">Failed to Load Analytics</h2>
        <p className="text-sm text-deadman-muted mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-deadman-cyan/10 text-deadman-cyan border border-deadman-cyan/20 rounded-lg text-sm hover:bg-deadman-cyan/20 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-deadman-text">Analytics</h1>
        <p className="text-sm text-deadman-muted mt-1">Incident metrics and trends</p>
      </div>

      {/* Metric Cards - always visible, skeleton during load */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-deadman-surface border border-deadman-border rounded-xl p-5 animate-pulse">
                <div className="h-4 w-24 bg-deadman-border rounded mb-4" />
                <div className="h-8 w-16 bg-deadman-border rounded" />
              </div>
            ))}
          </>
        ) : (
          <>
            {[
              { icon: TrendingUp, label: 'Resolution Rate', value: `${resolutionRate}%`, color: 'text-deadman-success' },
              { icon: BarChart3, label: 'Total Incidents (30d)', value: totalIncidents.toString(), color: 'text-deadman-cyan' },
              { icon: Activity, label: 'Avg Incidents/Day', value: avgPerDay, color: 'text-deadman-warning' },
              { icon: PieChartIcon, label: 'Sources', value: sources.length.toString(), color: 'text-deadman-muted' },
            ].map((stat, i) => (
              <div key={i} className="bg-deadman-surface border border-deadman-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon size={14} className={stat.color} />
                  <span className="text-xs text-deadman-muted">{stat.label}</span>
                </div>
                <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Charts Grid - loaded lazily with per-chart skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-deadman-surface border border-deadman-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-deadman-text mb-4">MTTR Trend (Minutes)</h3>
          {loading ? <ChartSkeleton title="" /> : <MTTRLineChart data={mttrChartData} />}
        </div>

        <div className="bg-deadman-surface border border-deadman-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-deadman-text mb-4">Incidents by Severity</h3>
          {loading ? <ChartSkeleton title="" /> : <SeverityBarChart data={severityChartData.slice(-14)} />}
        </div>

        <div className="bg-deadman-surface border border-deadman-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-deadman-text mb-4">Incident Sources</h3>
          {loading ? <ChartSkeleton title="" /> : <SourcePieChart data={sources} colors={COLORS} />}
        </div>

        {/* Summary Stats — no heavy lib, no lazy needed */}
        <div className="bg-deadman-surface border border-deadman-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-deadman-text mb-4">Incident Summary</h3>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 animate-pulse">
                  <div className="h-4 w-32 bg-deadman-border rounded" />
                  <div className="h-4 w-20 bg-deadman-border rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {incidentsByDay.slice(-7).reverse().map((day, i) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between py-2 border-b border-deadman-border last:border-0"
                >
                  <span className="text-sm text-deadman-text">{format(parseISO(day.date), 'EEEE, MMM dd')}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-deadman-danger font-mono">{day.critical}C</span>
                    <span className="text-xs text-deadman-warning font-mono">{day.high}H</span>
                    <span className="text-xs text-deadman-cyan font-mono">{day.medium}M</span>
                    <span className="text-xs text-deadman-muted font-mono">|</span>
                    <span className="text-sm font-mono text-deadman-text">{day.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
