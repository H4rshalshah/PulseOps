import axios from 'axios';
import type { Incident, Runbook, ActionExecution, Monitor, DashboardSummary, MTTRDataPoint, IncidentsByDay, SourceData, SituationReport, User, Workspace, WorkspaceMember, Invite, Project, AuthTokensResponse, ForgotPasswordResponse, ResetPasswordResponse, VerifyEmailResponse, LogoutResponse } from './types';

const api = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').trim(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Add auth token interceptor
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('deadman_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('deadman_token');
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  signup: (name: string, email: string, password: string) =>
    api.post<{ accessToken: string; user: User }>('/api/auth/signup', { name, email, password }).then(r => r.data),

  login: (email: string, password: string) =>
    api.post<{ accessToken: string; user: User }>('/api/auth/login', { email, password }).then(r => r.data),

  me: () =>
    api.get<User>('/api/auth/me').then(r => r.data),

  forgotPassword: (email: string) =>
    api.post<ForgotPasswordResponse>('/api/auth/forgot-password', { email }).then(r => r.data),

  resetPassword: (token: string, password: string) =>
    api.post<ResetPasswordResponse>('/api/auth/reset-password', { token, password }).then(r => r.data),

  verifyEmail: (token: string) =>
    api.post<VerifyEmailResponse>('/api/auth/verify-email', { token }).then(r => r.data),

  logout: () =>
    api.post<LogoutResponse>('/api/auth/logout').then(r => r.data),
};

// Workspace API
export const workspaceApi = {
  list: () =>
    api.get<Workspace[]>('/api/workspaces').then(r => r.data),

  getCurrent: () =>
    api.get<Workspace | null>('/api/workspaces/current').then(r => r.data),

  getById: (id: string) =>
    api.get<Workspace>(`/api/workspaces/${id}`).then(r => r.data),

  create: (name: string) =>
    api.post<Workspace>('/api/workspaces', { name }).then(r => r.data),

  update: (id: string, data: { name?: string }) =>
    api.patch<Workspace>(`/api/workspaces/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/api/workspaces/${id}`),

  switchWorkspace: (id: string) =>
    api.put<Workspace>(`/api/workspaces/${id}/switch`).then(r => r.data),

  getMembers: (workspaceId: string) =>
    api.get<(WorkspaceMember & { user?: User })[]>(`/api/workspaces/${workspaceId}/members`).then(r => r.data),

  inviteMember: (workspaceId: string, email: string, role: string) =>
    api.post<Invite>(`/api/workspaces/${workspaceId}/invites`, { email, role }).then(r => r.data),

  getInvites: (workspaceId: string) =>
    api.get<Invite[]>(`/api/workspaces/${workspaceId}/invites`).then(r => r.data),

  changeMemberRole: (workspaceId: string, memberId: string, role: string) =>
    api.patch(`/api/workspaces/${workspaceId}/members/${memberId}/role`, { role }).then(r => r.data),

  removeMember: (workspaceId: string, memberId: string) =>
    api.delete(`/api/workspaces/${workspaceId}/members/${memberId}`),

  revokeInvite: (workspaceId: string, inviteId: string) =>
    api.delete(`/api/workspaces/${workspaceId}/invites/${inviteId}`),

  acceptInvite: (token: string) =>
    api.post(`/api/invites/${token}/accept`).then(r => r.data),
};

// Project API
export const projectApi = {
  list: (workspaceId: string) =>
    api.get<Project[]>('/api/projects', { params: { workspaceId } }).then(r => r.data),

  getById: (id: string) =>
    api.get<Project>(`/api/projects/${id}`).then(r => r.data),

  create: (data: { workspaceId: string; name: string; description?: string; environment?: string; baseUrl?: string; healthCheckUrl?: string; repositoryUrl?: string }) =>
    api.post<Project>('/api/projects', data).then(r => r.data),

  update: (id: string, data: Partial<Project>) =>
    api.patch<Project>(`/api/projects/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/api/projects/${id}`),

  regenerateWebhookToken: (id: string) =>
    api.post<{ webhookToken: string }>(`/api/projects/${id}/regenerate-webhook-token`).then(r => r.data),

  testHealthCheck: (id: string) =>
    api.post<{ status: string; statusCode: number; latencyMs: number }>(`/api/projects/${id}/health-checks/test`).then(r => r.data),

  getHealthChecks: (id: string) =>
    api.get(`/api/projects/${id}/health-checks`).then(r => r.data),
};

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
