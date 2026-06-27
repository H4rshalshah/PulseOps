'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import MetricCard from '@/components/dashboard/MetricCard';
import IncidentFeed from '@/components/incidents/IncidentFeed';
import IncidentTimeline from '@/components/dashboard/IncidentTimeline';
import { useDashboardSummary, useIncidents } from '@/hooks/useIncidents';
import { useWebSocket } from '@/hooks/useWebSocket';
import { analyticsApi, webhooksApi, incidentsApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import type { Incident, MTTRDataPoint } from '@/lib/types';
import { Webhook, Plus, RefreshCw, Loader2 } from 'lucide-react';

const MTTRChart = dynamic(() => import('@/components/dashboard/MTTRChart'), {
  ssr: false,
  loading: () => <div className="h-[300px] bg-pulseops-surface border border-pulseops-border rounded-xl animate-pulse flex items-center justify-center"><Loader2 size={20} className="text-pulseops-cyan animate-spin" /></div>,
});

export default function DashboardPage() {
  const { summary, loading: summaryLoading, refetch: refetchSummary } = useDashboardSummary();
  const { incidents, refetch: refetchIncidents } = useIncidents({ status: 'open', limit: '10' });
  const [mttrData, setMttrData] = useState<MTTRDataPoint[] | undefined>(undefined);
  const [latestIncidents, setLatestIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    analyticsApi.getMTTR().then(setMttrData).catch(() => {});
  }, []);

  // WebSocket for real-time updates
  useWebSocket({
    onIncidentNew: (incident) => {
      setLatestIncidents((prev) => [incident, ...prev].slice(0, 20));
      toast.warning(`New incident: ${incident.title}`, { duration: 6000 });
      refetchSummary();
      refetchIncidents();
    },
    onIncidentUpdated: () => {
      refetchSummary();
      refetchIncidents();
    },
  });

  const handleTestWebhook = async () => {
    try {
      await webhooksApi.ingest({
        title: 'Test Alert - High CPU detected',
        message: 'CPU usage exceeded 90% on api-server-01 in production',
        severity: 'critical',
        source: 'manual-test',
        service_name: 'api-gateway',
        timestamp: new Date().toISOString(),
      });
      toast.success('Test webhook sent! Incident created.');
      refetchSummary();
      refetchIncidents();
    } catch {
      toast.error('Failed to send test webhook');
    }
  };

  const handleManualIncident = async () => {
    try {
      await incidentsApi.create({
        title: 'Manual Test Incident',
        description: 'Created from dashboard quick action',
        severity: 'high',
        source: 'manual',
        service_name: 'testing',
      });
      toast.success('Manual incident created');
      refetchSummary();
      refetchIncidents();
    } catch {
      toast.error('Failed to create incident');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-pulseops-text">Dashboard</h1>
          <p className="text-sm text-pulseops-muted mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestWebhook}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-pulseops-warning bg-pulseops-warning/10 border border-pulseops-warning/20 rounded-xl hover:bg-pulseops-warning/20 transition-all"
          >
            <Webhook size={14} />
            Test Webhook
          </button>
          <button
            onClick={handleManualIncident}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-pulseops-bg bg-pulseops-cyan rounded-xl hover:bg-pulseops-cyan/90 transition-all"
          >
            <Plus size={14} />
            Trigger Incident
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Incidents"
          value={summary?.active_incidents ?? '—'}
          subtitle={summaryLoading ? undefined : `${summary?.incidents_today ?? 0} today`}
          icon="incidents"
        />
        <MetricCard
          title="Average MTTR"
          value={summary?.avg_mttr ? `${Math.round(summary.avg_mttr / 60)}m` : '—'}
          subtitle="Mean time to resolve"
          icon="mttr"
        />
        <MetricCard
          title="Runbooks Active"
          value={summary?.active_runbooks ?? '—'}
          subtitle="Automated workflows"
          icon="actions"
        />
        <MetricCard
          title="Actions Today"
          value={summary?.actions_today ?? '—'}
          subtitle="Runbook steps executed"
          icon="active"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Feed */}
        <div className="lg:col-span-2">
          <IncidentFeed incidents={incidents} latestIncidents={latestIncidents} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-pulseops-surface border border-pulseops-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-pulseops-text mb-4">Quick Overview</h3>
            <div className="space-y-3">
              {[
                { label: 'Resolved Today', value: summary?.resolved_today ?? 0, color: 'text-pulseops-success' },
                { label: 'Avg Response Time', value: summary?.avg_mttr ? `${Math.round(summary.avg_mttr / 60)}m` : '—', color: 'text-pulseops-cyan' },
                { label: 'System Status', value: 'Operational', color: 'text-pulseops-success' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-pulseops-border last:border-0">
                  <span className="text-sm text-pulseops-muted">{stat.label}</span>
                  <span className={`text-sm font-mono font-medium ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 px-4 py-3 bg-pulseops-surface border border-pulseops-border rounded-xl">
            <span className="w-2 h-2 bg-pulseops-success rounded-full animate-pulse" />
            <span className="text-xs text-pulseops-muted">WebSocket connected — live updates active</span>
            <RefreshCw size={12} className="ml-auto text-pulseops-muted" />
          </div>
        </div>
      </div>

      {/* MTTR Chart - lazy loaded */}
      <MTTRChart data={mttrData} />

      {/* Recent Incidents Timeline */}
      <IncidentTimeline incidents={incidents} />
    </div>
  );
}
