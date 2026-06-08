import axios from 'axios';
import type { Incident, Runbook, ActionExecution, Monitor, DashboardSummary, MTTRDataPoint, IncidentsByDay, SourceData, SituationReport } from './types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Incidents
export const incidentsApi = {
  list: (params?: Record<string, string>) =>
    api.get<{ incidents: Incident[]; total: number }>('/api/incidents', { params }).then(r => r.data),

  getById: (id: string) =>
    api.get<Incident & { executions: ActionExecution[]; runbook: Runbook | null }>(`/api/incidents/${id}`).then(r => r.data),

  create: (data: { title: string; description?: string; severity: string; source?: string; service_name?: string }) =>
    api.post<Incident>('/api/incidents', data).then(r => r.data),

  update: (id: string, data: Partial<Incident>) =>
    api.patch<Incident>(`/api/incidents/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/api/incidents/${id}`),

  resolve: (id: string) =>
    api.post<Incident>(`/api/incidents/${id}/resolve`).then(r => r.data),

  getSummary: () =>
    api.get<DashboardSummary>('/api/incidents/summary').then(r => r.data),

  generateSituationReport: (id: string) =>
    api.post<SituationReport>(`/api/incidents/${id}/situation-report`).then(r => r.data),
};

// Runbooks
export const runbooksApi = {
  list: (activeOnly?: boolean) =>
    api.get<Runbook[]>('/api/runbooks', { params: activeOnly ? { active: 'true' } : {} }).then(r => r.data),

  getById: (id: string) =>
    api.get<Runbook>(`/api/runbooks/${id}`).then(r => r.data),

  create: (data: Partial<Runbook>) =>
    api.post<Runbook>('/api/runbooks', data).then(r => r.data),

  update: (id: string, data: Partial<Runbook>) =>
    api.put<Runbook>(`/api/runbooks/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/api/runbooks/${id}`),

  execute: (id: string, incidentId: string, dryRun = false) =>
    api.post(`/api/runbooks/${id}/execute`, { incidentId, dryRun }).then(r => r.data),

  test: (id: string) =>
    api.post(`/api/runbooks/${id}/test`).then(r => r.data),

  getStats: () =>
    api.get<{ total: number; active: number }>('/api/runbooks/stats').then(r => r.data),
};

// Webhooks
export const webhooksApi = {
  ingest: (payload: Record<string, unknown>) =>
    api.post('/api/webhooks/ingest', payload).then(r => r.data),

  getLogs: () =>
    api.get('/api/webhooks/logs').then(r => r.data),
};

// Analytics
export const analyticsApi = {
  getMTTR: () =>
    api.get<MTTRDataPoint[]>('/api/analytics/mttr').then(r => r.data),

  getSummary: () =>
    api.get<DashboardSummary>('/api/analytics/summary').then(r => r.data),

  getIncidentsByDay: () =>
    api.get<IncidentsByDay[]>('/api/analytics/incidents-by-day').then(r => r.data),

  getSources: () =>
    api.get<SourceData[]>('/api/analytics/sources').then(r => r.data),

  getResolutionRate: () =>
    api.get<{ resolution_rate: number }>('/api/analytics/resolution-rate').then(r => r.data),
};

// Monitors
export const monitorsApi = {
  list: () =>
    api.get<Monitor[]>('/api/monitors').then(r => r.data),

  create: (data: Partial<Monitor>) =>
    api.post<Monitor>('/api/monitors', data).then(r => r.data),

  update: (id: string, data: Partial<Monitor>) =>
    api.put<Monitor>(`/api/monitors/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/api/monitors/${id}`),

  check: (id: string) =>
    api.post(`/api/monitors/${id}/check`).then(r => r.data),
};

// Settings
export const settingsApi = {
  getAll: () =>
    api.get<Record<string, Array<{ key: string; value: string }>>>('/api/settings').then(r => r.data),

  update: (data: Record<string, string>) =>
    api.put('/api/settings', data).then(r => r.data),

  testSlack: () =>
    api.post('/api/settings/slack/test').then(r => r.data),

  testGitHub: () =>
    api.post('/api/settings/github/test').then(r => r.data),

  testPagerDuty: () =>
    api.post('/api/settings/pagerduty/test').then(r => r.data),
};

// Health
export const healthApi = {
  check: () =>
    api.get('/api/health').then(r => r.data),
};

export default api;
