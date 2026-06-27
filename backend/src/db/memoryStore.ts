import { v4 as uuidv4 } from 'uuid';
import type { Incident } from '../models/Incident';
import type { Runbook } from '../models/Runbook';
import type { ActionExecution } from '../models/AuditLog';

export interface MonitorRecord {
  id: string;
  name: string;
  url: string;
  method: string;
  interval_seconds: number;
  timeout_ms: number;
  expected_status: number;
  is_active: boolean;
  last_checked_at: Date | null;
  last_status: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SettingRecord {
  id: string;
  key: string;
  value: string;
  category: string;
  updated_at: Date;
}

export interface WebhookLogRecord {
  id: string;
  source: string;
  payload: Record<string, unknown>;
  incident_id: string;
  received_at: Date;
}

export const memoryStore: {
  incidents: Incident[];
  runbooks: Runbook[];
  actionExecutions: ActionExecution[];
  monitors: MonitorRecord[];
  settings: SettingRecord[];
  webhookLogs: WebhookLogRecord[];
} = {
  incidents: [],
  runbooks: [],
  actionExecutions: [],
  monitors: [],
  settings: [],
  webhookLogs: [],
};

const severities = ['critical', 'high', 'medium', 'low'] as const;
const sources = ['grafana', 'datadog', 'prometheus', 'pagerduty', 'manual'] as const;

const realisticIncidents = [
  {
    title: 'High CPU utilization on api-server-03 in production',
    description: 'CPU usage spiked to 97% on api-server-03 due to a memory leak in the payment processing module. Auto-scaling failed to trigger because of misconfigured threshold alerts. Incident detected by Grafana at 14:23 UTC.',
    service_name: 'api-gateway',
    source: 'grafana',
  },
  {
    title: 'PostgreSQL connection pool exhausted on primary-db-01',
    description: 'Connection pool reached maximum of 200 connections after a sudden traffic surge from a marketing campaign. Unoptimized queries from the reporting service held connections open for 45+ seconds each. Database health check endpoint returned 503s.',
    service_name: 'database',
    source: 'datadog',
  },
  {
    title: 'Payment gateway timeout spike — 500s on /checkout endpoint',
    description: 'Stripe API latency increased from 200ms to 8s between 10:15-10:45 UTC, causing cascading timeouts across the checkout service. P99 response time hit 12s before the circuit breaker engaged. Estimated 1,200 failed transactions.',
    service_name: 'payment-service',
    source: 'pagerduty',
  },
  {
    title: 'Redis cluster node failure in cache-service',
    description: 'One of three Redis cluster nodes went offline due to OOM kill. Cache hit rate dropped from 94% to 32%, causing increased load on the primary database. Failover took 47 seconds to complete.',
    service_name: 'cache-service',
    source: 'prometheus',
  },
  {
    title: 'Auth service JWT signing key rotation failed',
    description: 'Automated key rotation script failed to update the JWKS endpoint, causing all new authentication tokens to be rejected by the API gateway. Users were unable to log in for 3 minutes until manual rollback completed.',
    service_name: 'auth-service',
    source: 'pagerduty',
  },
  {
    title: 'Background job queue backlog — 15k unprocessed events',
    description: 'BullMQ job queue accumulated 15,000 unprocessed events after the worker process crashed due to an unhandled promise rejection in the notification handler. Webhook deliveries and email notifications were delayed by up to 12 minutes.',
    service_name: 'worker-queue',
    source: 'datadog',
  },
  {
    title: 'CDN cache purge caused origin overload',
    description: 'A full CDN cache purge was triggered accidentally during a deployment, causing all traffic to hit the origin servers simultaneously. Request rate increased 40x within 30 seconds. Auto-scaling added 12 instances before stabilizing.',
    service_name: 'api-gateway',
    source: 'manual',
  },
  {
    title: 'SSL certificate expiration on *.app.example.com',
    description: 'Wildcard SSL certificate for *.app.example.com expired at 03:00 UTC. All HTTPS connections to subdomains failed with SSL errors. Monitoring alerts were not configured for certificate expiry, leading to 45 minutes of unplanned downtime.',
    service_name: 'api-gateway',
    source: 'grafana',
  },
  {
    title: 'Elasticsearch cluster status turned RED',
    description: 'Primary Elasticsearch node had a disk space alert (94% full), causing several indices to become read-only. Search queries on the logs dashboard returned incomplete results for 22 minutes until indices could be rebalanced.',
    service_name: 'database',
    source: 'datadog',
  },
  {
    title: 'Docker registry pull rate limiting hit during deployment',
    description: 'Deployment pipeline hit Docker Hub anonymous pull rate limits (100 pulls per 6 hours), causing container image pulls to fail for 8 of 15 services. Deployment had to be paused for 1 hour until the rate limit window reset.',
    service_name: 'worker-queue',
    source: 'manual',
  },
  {
    title: 'Memory leak in event-streaming service — OOM every 4h',
    description: 'The event-streaming service consumed memory at ~250MB/hour until hitting the 2GB limit, causing OOM kills every 4 hours. The leak was traced to an unbounded goroutine that held references to undelivered messages.',
    service_name: 'worker-queue',
    source: 'prometheus',
  },
  {
    title: 'DNS resolution failures for internal Service A records',
    description: 'CoreDNS pod in the Kubernetes cluster crashed after an upgrade, causing intermittent DNS resolution failures across the cluster. Service-to-service calls failed with "no such host" errors for approximately 8 minutes.',
    service_name: 'auth-service',
    source: 'grafana',
  },
];

const runbookTemplates: Array<{ name: string; description: string; steps: Array<{ id: string; name: string; type: 'http' | 'shell' | 'slack' | 'aws' | 'wait' | 'condition'; config: Record<string, unknown>; on_failure: 'continue' | 'stop' | 'escalate'; timeout_ms: number }> }> = [
  {
    name: 'High CPU Auto-Remediation',
    description: 'Automatically detects and mitigates high CPU incidents on production servers. Scales up instances and kills the top offending processes if safe.',
    steps: [
      { id: 'step_cpu_1', name: 'Check CPU metrics', type: 'http', config: { url: 'https://metrics.internal:9090/api/v1/query?query=cpu_usage_percent', method: 'GET', headers: { Authorization: 'Bearer ${METRICS_TOKEN}' } }, on_failure: 'continue', timeout_ms: 10000 },
      { id: 'step_cpu_2', name: 'Notify on-call engineer', type: 'slack', config: { message: '⚠️ High CPU incident detected — runbook initiated', channel: '#incident-response' }, on_failure: 'continue', timeout_ms: 5000 },
      { id: 'step_cpu_3', name: 'Scale up instance count', type: 'aws', config: { action: 'autoscale', region: 'us-east-1', min_size: 5, max_size: 12 }, on_failure: 'escalate', timeout_ms: 30000 },
      { id: 'step_cpu_4', name: 'Wait for recovery window', type: 'wait', config: { duration_seconds: 30 }, on_failure: 'continue', timeout_ms: 35000 },
      { id: 'step_cpu_5', name: 'Verify CPU dropped below threshold', type: 'http', config: { url: 'https://metrics.internal:9090/api/v1/query?query=cpu_usage_percent', method: 'GET' }, on_failure: 'escalate', timeout_ms: 10000 },
    ],
  },
  {
    name: 'Database Connection Recovery',
    description: 'Restores database connectivity by killing long-running queries, clearing idle connections, and scaling the connection pool.',
    steps: [
      { id: 'step_db_1', name: 'Kill queries running > 30s', type: 'shell', config: { command: "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '30 seconds';" }, on_failure: 'continue', timeout_ms: 15000 },
      { id: 'step_db_2', name: 'Notify team in Slack', type: 'slack', config: { message: '🗄️ Database connection pool recovery runbook started', channel: '#database-alerts' }, on_failure: 'continue', timeout_ms: 5000 },
      { id: 'step_db_3', name: 'Increase max_connections', type: 'shell', config: { command: "ALTER SYSTEM SET max_connections = 400; SELECT pg_reload_conf();" }, on_failure: 'escalate', timeout_ms: 10000 },
      { id: 'step_db_4', name: 'Verify connections normalizing', type: 'http', config: { url: 'https://metrics.internal:9090/api/v1/query?query=pg_connection_count', method: 'GET' }, on_failure: 'escalate', timeout_ms: 10000 },
      { id: 'step_db_5', name: 'Post recovery summary', type: 'slack', config: { message: '✅ Database connections stabilized — recovery complete', channel: '#database-alerts' }, on_failure: 'continue', timeout_ms: 5000 },
    ],
  },
  {
    name: 'Service Health Check & Restart',
    description: 'Performs comprehensive health checks on a service and restarts if unhealthy. Escalates if the restart fails or the service remains unhealthy.',
    steps: [
      { id: 'step_hlth_1', name: 'Check /health endpoint', type: 'http', config: { url: 'https://${SERVICE}.internal/health', method: 'GET', headers: { Accept: 'application/json' } }, on_failure: 'continue', timeout_ms: 10000 },
      { id: 'step_hlth_2', name: 'Graceful restart service', type: 'shell', config: { command: 'docker service update --force ${SERVICE}' }, on_failure: 'escalate', timeout_ms: 30000 },
      { id: 'step_hlth_3', name: 'Wait 15s for startup', type: 'wait', config: { duration_seconds: 15 }, on_failure: 'continue', timeout_ms: 20000 },
      { id: 'step_hlth_4', name: 'Verify health check passed', type: 'http', config: { url: 'https://${SERVICE}.internal/health', method: 'GET' }, on_failure: 'escalate', timeout_ms: 10000 },
      { id: 'step_hlth_5', name: 'Post recovery in Slack', type: 'slack', config: { message: '✅ ${SERVICE} restarted successfully — all health checks passing', channel: '#incident-response' }, on_failure: 'continue', timeout_ms: 5000 },
    ],
  },
  {
    name: 'SSL Certificate Renewal',
    description: 'Automatically detects expiring SSL certificates and initiates renewal via ACME/LetsEncrypt. Verifies the new certificate is serving correctly.',
    steps: [
      { id: 'step_ssl_1', name: 'Run certbot renewal', type: 'shell', config: { command: 'certbot renew --quiet --non-interactive' }, on_failure: 'escalate', timeout_ms: 60000 },
      { id: 'step_ssl_2', name: 'Reload nginx configs', type: 'shell', config: { command: 'nginx -s reload' }, on_failure: 'escalate', timeout_ms: 10000 },
      { id: 'step_ssl_3', name: 'Verify new cert expiry date', type: 'shell', config: { command: "openssl s_client -connect ${DOMAIN}:443 -servername ${DOMAIN} </dev/null 2>/dev/null | openssl x509 -noout -enddate" }, on_failure: 'continue', timeout_ms: 15000 },
      { id: 'step_ssl_4', name: 'Notify team of renewal', type: 'slack', config: { message: '🔐 SSL certificate renewed for ${DOMAIN} — next renewal scheduled', channel: '#security-alerts' }, on_failure: 'continue', timeout_ms: 5000 },
    ],
  },
];

export function seedMemoryStore(force = false): void {
  if (!force && (memoryStore.incidents.length > 0 || memoryStore.runbooks.length > 0)) return;

  memoryStore.incidents = [];
  memoryStore.runbooks = [];
  memoryStore.actionExecutions = [];
  memoryStore.monitors = [];
  memoryStore.settings = [
    { id: uuidv4(), category: 'general', key: 'app_name', value: 'PulseOps', updated_at: new Date() },
    { id: uuidv4(), category: 'general', key: 'timezone', value: 'UTC', updated_at: new Date() },
    { id: uuidv4(), category: 'slack', key: 'slack_webhook_url', value: '', updated_at: new Date() },
    { id: uuidv4(), category: 'slack', key: 'slack_channel', value: '#incident-response', updated_at: new Date() },
    { id: uuidv4(), category: 'github', key: 'github_token', value: '', updated_at: new Date() },
    { id: uuidv4(), category: 'github', key: 'github_repo', value: 'acmecorp/pulseops-infra', updated_at: new Date() },
    { id: uuidv4(), category: 'pagerduty', key: 'pagerduty_api_key', value: '', updated_at: new Date() },
    { id: uuidv4(), category: 'pagerduty', key: 'pagerduty_service', value: 'production-oncall', updated_at: new Date() },
  ];
  memoryStore.webhookLogs = [];

  // Create runbooks
  for (let i = 0; i < runbookTemplates.length; i++) {
    const tmpl = runbookTemplates[i];
    memoryStore.runbooks.push({
      id: uuidv4(),
      name: tmpl.name,
      description: tmpl.description,
      trigger_conditions: i === 0 ? { severity: 'critical', service: 'api-gateway' } : null,
      steps: tmpl.steps,
      is_active: i < 3,
      dry_run_mode: i === 3,
      created_at: new Date(Date.now() - (i + 1) * 86400000),
      updated_at: new Date(Date.now() - i * 3600000),
    });
  }

  // Create realistic incidents with time spread
  for (let i = 0; i < realisticIncidents.length; i++) {
    const incident = realisticIncidents[i];
    const hoursAgo = i * 18 + Math.floor(Math.random() * 12);
    const created_at = new Date(Date.now() - hoursAgo * 3600000);
    const resolved = i < 9;
    const resolutionMinutes = 15 + Math.floor(Math.random() * 120); // 15 min to 2h 15min
    const resolved_at = resolved ? new Date(created_at.getTime() + resolutionMinutes * 60000) : null;
    const runbook = i < 6 ? memoryStore.runbooks[i % memoryStore.runbooks.length] : null;

    memoryStore.incidents.push({
      id: uuidv4(),
      userId: 'seed',
      title: incident.title,
      description: incident.description,
      severity: severities[i % severities.length],
      status: resolved
        ? 'resolved'
        : (['open', 'investigating', 'mitigating'] as Incident['status'][])[i % 3],
      source: incident.source,
      service_name: incident.service_name,
      runbook_id: runbook?.id || null,
      created_at,
      resolved_at,
      mttr_seconds: resolved_at ? Math.round((resolved_at.getTime() - created_at.getTime()) / 1000) : null,
      situation_report: null,
      metadata: {
        environment: 'production',
        region: 'us-east-1',
        detected_by: incident.source,
        team: incident.service_name?.includes('payment') ? 'payments-team' :
              incident.service_name?.includes('auth') ? 'security-team' :
              incident.service_name?.includes('db') ? 'platform-team' : 'infra-team',
      },
    });
  }

  // Create extra resolved incidents for analytics
  for (let i = 0; i < 18; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const created_at = new Date(Date.now() - daysAgo * 86400000 - Math.floor(Math.random() * 12) * 3600000);
    const resolutionMinutes = 5 + Math.floor(Math.random() * 180);
    const resolved_at = new Date(created_at.getTime() + resolutionMinutes * 60000);
    const src = sources[Math.floor(Math.random() * sources.length)];

    memoryStore.incidents.push({
      id: uuidv4(),
      userId: 'seed',
      title: realisticIncidents[Math.floor(Math.random() * realisticIncidents.length)].title,
      description: 'Auto-resolved by PulseOps runbook execution. Full post-mortem available in reports.',
      severity: severities[Math.floor(Math.random() * severities.length)],
      status: 'resolved',
      source: src,
      service_name: ['api-gateway', 'database', 'payment-service', 'auth-service', 'cache-service', 'worker-queue'][Math.floor(Math.random() * 6)],
      runbook_id: memoryStore.runbooks.length > 0 ? memoryStore.runbooks[Math.floor(Math.random() * memoryStore.runbooks.length)].id : null,
      created_at,
      resolved_at,
      mttr_seconds: Math.round((resolved_at.getTime() - created_at.getTime()) / 1000),
      situation_report: null,
      metadata: {
        environment: 'production',
        region: 'us-east-1',
        auto_resolved: true,
        runbook_executed: true,
      },
    });
  }

  // Create action executions for resolved incidents
  const resolvedIncidents = memoryStore.incidents.filter((inc) => inc.status === 'resolved' && inc.runbook_id);
  for (const inc of resolvedIncidents.slice(0, 10)) {
    const runbook = memoryStore.runbooks.find((r) => r.id === inc.runbook_id);
    if (!runbook) continue;

    for (const step of runbook.steps) {
      const executed_at = new Date(inc.created_at.getTime() + Math.floor(Math.random() * 180) * 1000);
      memoryStore.actionExecutions.push({
        id: uuidv4(),
        incident_id: inc.id,
        runbook_id: runbook.id,
        step_id: step.id,
        step_name: step.name,
        action_type: step.type,
        status: Math.random() > 0.15 ? 'success' : 'failed',
        dry_run: runbook.dry_run_mode,
        input_payload: step.config,
        output_payload: { result: 'completed', duration_ms: Math.floor(Math.random() * 5000) },
        error_message: Math.random() > 0.85 ? 'Connection timeout after 10s' : null,
        duration_ms: Math.floor(Math.random() * 5000),
        executed_at,
      });
    }
  }

  // Monitors
  memoryStore.monitors = [
    { id: uuidv4(), name: 'API Gateway Health', url: 'https://api.example.com/health', method: 'GET', interval_seconds: 30, timeout_ms: 5000, expected_status: 200, is_active: true, last_checked_at: new Date(Date.now() - 15000), last_status: 'healthy', created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'Auth Service Health', url: 'https://auth.example.com/health', method: 'GET', interval_seconds: 30, timeout_ms: 5000, expected_status: 200, is_active: true, last_checked_at: new Date(Date.now() - 18000), last_status: 'healthy', created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'Payment Service', url: 'https://payments.example.com/health', method: 'GET', interval_seconds: 30, timeout_ms: 5000, expected_status: 200, is_active: true, last_checked_at: new Date(Date.now() - 22000), last_status: 'healthy', created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'Database Primary', url: 'https://db-internal.example.com:5432/health', method: 'GET', interval_seconds: 15, timeout_ms: 3000, expected_status: 200, is_active: true, last_checked_at: new Date(Date.now() - 8000), last_status: 'healthy', created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'Redis Cache', url: 'https://redis-internal.example.com:6379/ping', method: 'GET', interval_seconds: 30, timeout_ms: 3000, expected_status: 200, is_active: true, last_checked_at: new Date(Date.now() - 25000), last_status: 'healthy', created_at: new Date(), updated_at: new Date() },
  ];

  // Webhook logs
  for (let i = 0; i < 15; i++) {
    const source = sources[Math.floor(Math.random() * sources.length)];
    memoryStore.webhookLogs.push({
      id: uuidv4(),
      source,
      payload: {
        title: `Alert: ${realisticIncidents[Math.floor(Math.random() * realisticIncidents.length)].title.split(' — ')[0]}`,
        severity: severities[Math.floor(Math.random() * severities.length)],
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      },
      incident_id: memoryStore.incidents[Math.floor(Math.random() * memoryStore.incidents.length)].id,
      received_at: new Date(Date.now() - i * 3600000),
    });
  }
}
