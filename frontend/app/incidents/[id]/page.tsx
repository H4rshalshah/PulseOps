'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useIncident } from '@/hooks/useIncidents';
import { useWebSocket } from '@/hooks/useWebSocket';
import { incidentsApi, runbooksApi } from '@/lib/api';
import StatusBadge from '@/components/incidents/StatusBadge';
import PulseRing from '@/components/ui/PulseRing';
import SituationReportComponent from '@/components/incidents/SituationReport';
import { toast } from '@/hooks/useToast';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, Clock, RotateCcw, CheckCircle, AlertTriangle, Loader2,
  Terminal, Globe, MessageSquare, Cloud, GitFork
} from 'lucide-react';
import type { ExecutionStatus, ActionExecution } from '@/lib/types';

const stepIcons: Record<string, typeof Terminal> = {
  http: Globe,
  shell: Terminal,
  slack: MessageSquare,
  aws: Cloud,
  wait: Clock,
  condition: GitFork,
};

const statusColors: Record<ExecutionStatus, string> = {
  pending: 'text-pulseops-muted bg-pulseops-border/30',
  running: 'text-pulseops-cyan bg-pulseops-cyan/10',
  success: 'text-pulseops-success bg-pulseops-success/10',
  failed: 'text-pulseops-danger bg-pulseops-danger/10',
  skipped: 'text-pulseops-warning bg-pulseops-warning/10',
};

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { incident, loading, error, refetch } = useIncident(id);
  const [running, setRunning] = useState(false);

  useWebSocket({
    incidentId: id,
    onStepUpdate: () => refetch(),
    onIncidentUpdated: () => refetch(),
  });

  const handleResolve = async () => {
    try {
      await incidentsApi.resolve(id);
      toast.success('Incident resolved');
      refetch();
    } catch {
      toast.error('Failed to resolve incident');
    }
  };

  const handleReRun = async () => {
    if (!incident?.runbook_id) {
      toast.error('No runbook associated with this incident');
      return;
    }
    try {
      setRunning(true);
      await runbooksApi.execute(incident.runbook_id, id, false);
      toast.success('Runbook execution started');
      refetch();
    } catch {
      toast.error('Failed to execute runbook');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="text-pulseops-cyan animate-spin" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="text-center py-24">
        <AlertTriangle size={48} className="mx-auto mb-4 text-pulseops-danger" />
        <h2 className="text-xl font-heading font-bold text-pulseops-text mb-2">Incident Not Found</h2>
        <p className="text-pulseops-muted mb-4">{error || 'The incident you are looking for does not exist'}</p>
        <button
          onClick={() => router.push('/incidents')}
          className="px-4 py-2 bg-pulseops-cyan/10 text-pulseops-cyan border border-pulseops-cyan/20 rounded-lg text-sm hover:bg-pulseops-cyan/20 transition-colors"
        >
          Back to Incidents
        </button>
      </div>
    );
  }

  const executions = (incident as unknown as { executions?: ActionExecution[] }).executions || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/incidents')}
        className="flex items-center gap-2 text-sm text-pulseops-muted hover:text-pulseops-text transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Incidents
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <PulseRing severity={incident.severity} size={16} className="mt-1" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-pulseops-text">{incident.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-pulseops-muted">
              <StatusBadge status={incident.status} />
              <span className="capitalize">Severity: {incident.severity}</span>
              <span>•</span>
              <span>{incident.source || 'Manual'}</span>
              <span>•</span>
              <span>{incident.service_name || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReRun}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-pulseops-cyan bg-pulseops-cyan/10 border border-pulseops-cyan/20 rounded-xl hover:bg-pulseops-cyan/20 disabled:opacity-50 transition-all"
          >
            {running ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCcw size={14} />
            )}
            {running ? 'Running...' : 'Re-run Runbook'}
          </button>
          <button
            onClick={handleResolve}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-pulseops-success bg-pulseops-success/10 border border-pulseops-success/20 rounded-xl hover:bg-pulseops-success/20 transition-all"
          >
            <CheckCircle size={14} />
            Mark Resolved
          </button>
        </div>
      </div>

      {/* Description */}
      {incident.description && (
        <div className="bg-pulseops-surface border border-pulseops-border rounded-xl p-4">
          <p className="text-sm text-pulseops-text">{incident.description}</p>
        </div>
      )}

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Created', value: format(new Date(incident.created_at), 'MMM dd, yyyy HH:mm:ss') },
          { label: 'Resolved', value: incident.resolved_at ? format(new Date(incident.resolved_at), 'MMM dd, yyyy HH:mm:ss') : '—' },
          { label: 'MTTR', value: incident.mttr_seconds ? `${Math.round(incident.mttr_seconds / 60)} minutes` : '—' },
          { label: 'Runbook', value: incident.runbook?.name || 'None assigned' },
        ].map((item, i) => (
          <div key={i} className="bg-pulseops-surface border border-pulseops-border rounded-xl p-4">
            <p className="text-xs text-pulseops-muted mb-1">{item.label}</p>
            <p className="text-sm font-mono text-pulseops-text">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Situation Report */}
        <SituationReportComponent incidentId={id} />

        {/* Execution Timeline */}
        <div className="bg-pulseops-bg border border-pulseops-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-pulseops-border bg-pulseops-surface">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-pulseops-cyan" />
              <span className="text-sm font-mono text-pulseops-muted">Execution Timeline</span>
            </div>
          </div>

          <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
            {executions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-pulseops-muted">No executions recorded</p>
              </div>
            ) : (
              executions.map((exec) => {
                const Icon = stepIcons[exec.action_type as keyof typeof stepIcons] || Terminal;
                return (
                  <div
                    key={exec.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-pulseops-surface border border-pulseops-border"
                  >
                    <div className={`p-1.5 rounded-lg ${statusColors[exec.status]}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-pulseops-text">{exec.step_name}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[exec.status]}`}>
                          {exec.status}
                        </span>
                      </div>
                      <p className="text-xs text-pulseops-muted mt-0.5 font-mono">{exec.action_type}</p>
                      {exec.error_message && (
                        <p className="text-xs text-pulseops-danger mt-1">{exec.error_message}</p>
                      )}
                    </div>
                    {exec.duration_ms != null && (
                      <span className="text-xs font-mono text-pulseops-muted shrink-0">
                        {exec.duration_ms}ms
                      </span>
                    )}                    </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Metadata JSON */}
      {incident.metadata && (
        <details className="bg-pulseops-surface border border-pulseops-border rounded-xl">
          <summary className="px-4 py-3 text-sm font-mono text-pulseops-muted cursor-pointer hover:text-pulseops-text transition-colors">
            Raw Metadata
          </summary>
          <pre className="px-4 pb-4 text-xs font-mono text-pulseops-muted overflow-x-auto">
            {JSON.stringify(incident.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
