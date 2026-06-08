export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'investigating' | 'mitigating' | 'resolved';
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';
export type StepType = 'http' | 'shell' | 'slack' | 'aws' | 'wait' | 'condition';

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  source: string | null;
  service_name: string | null;
  runbook_id: string | null;
  created_at: string;
  resolved_at: string | null;
  mttr_seconds: number | null;
  situation_report: SituationReport | null;
  metadata: Record<string, unknown> | null;
  executions?: ActionExecution[];
  runbook?: Runbook | null;
}

export interface RunbookStep {
  id: string;
  name: string;
  type: StepType;
  config: Record<string, unknown>;
  on_failure: 'continue' | 'stop' | 'escalate';
  timeout_ms: number;
}

export interface Runbook {
  id: string;
  name: string;
  description: string | null;
  trigger_conditions: Record<string, unknown> | null;
  steps: RunbookStep[];
  is_active: boolean;
  dry_run_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActionExecution {
  id: string;
  incident_id: string;
  runbook_id: string | null;
  step_id: string;
  step_name: string;
  action_type: string;
  status: ExecutionStatus;
  dry_run: boolean;
  input_payload: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
  executed_at: string;
}

export interface Monitor {
  id: string;
  name: string;
  url: string;
  method: string;
  interval_seconds: number;
  timeout_ms: number;
  expected_status: number;
  is_active: boolean;
  last_checked_at: string | null;
  last_status: string | null;
}

export interface SituationReport {
  generatedAt: string;
  incidentSummary: Incident;
  recentDeployments: { sha: string; message: string; author: string; date: string }[];
  errorRateData: { timestamp: string; rate: number }[];
  affectedServices: string[];
  similarPastIncidents: Incident[];
  recommendedActions: string[];
}

export interface DashboardSummary {
  active_incidents: number;
  avg_mttr: number | null;
  incidents_today: number;
  resolved_today: number;
  active_runbooks: number;
  actions_today: number;
}

export interface MTTRDataPoint {
  date: string;
  avg_mttr: number | null;
  incident_count: number;
}

export interface IncidentsByDay {
  date: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface SourceData {
  source: string;
  count: number;
}

export interface StepUpdate {
  stepId: string;
  stepName: string;
  status: ExecutionStatus;
  dryRun?: boolean;
  message?: string;
  durationMs?: number;
}
