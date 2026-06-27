-- PulseOps Initial Schema Migration

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status VARCHAR(20) CHECK (status IN ('open', 'investigating', 'mitigating', 'resolved')),
  source VARCHAR(50),
  service_name VARCHAR(100),
  runbook_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  mttr_seconds INTEGER,
  situation_report JSONB,
  metadata JSONB
);

-- Runbooks table
CREATE TABLE IF NOT EXISTS runbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_conditions JSONB,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  dry_run_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action executions (audit log)
CREATE TABLE IF NOT EXISTS action_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  runbook_id UUID REFERENCES runbooks(id) ON DELETE SET NULL,
  step_id VARCHAR(100),
  step_name VARCHAR(255),
  action_type VARCHAR(50),
  status VARCHAR(20) CHECK (status IN ('pending', 'running', 'success', 'failed', 'skipped')),
  dry_run BOOLEAN DEFAULT false,
  input_payload JSONB,
  output_payload JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health check monitors
CREATE TABLE IF NOT EXISTS monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  method VARCHAR(10) DEFAULT 'GET',
  interval_seconds INTEGER DEFAULT 60,
  timeout_ms INTEGER DEFAULT 5000,
  expected_status INTEGER DEFAULT 200,
  is_active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_status VARCHAR(20)
);

-- Settings / Integrations config
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  category VARCHAR(100) DEFAULT 'general',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50),
  payload JSONB,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents(service_name);
CREATE INDEX IF NOT EXISTS idx_runbooks_active ON runbooks(is_active);
CREATE INDEX IF NOT EXISTS idx_action_executions_incident ON action_executions(incident_id);
CREATE INDEX IF NOT EXISTS idx_action_executions_status ON action_executions(status);
CREATE INDEX IF NOT EXISTS idx_monitors_active ON monitors(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received ON webhook_logs(received_at);

-- Insert default settings
INSERT INTO settings (key, value, category) VALUES
  ('app_name', 'PulseOps', 'general'),
  ('timezone', 'UTC', 'general'),
  ('slack_webhook_url', '', 'integrations'),
  ('github_token', '', 'integrations'),
  ('pagerduty_api_key', '', 'integrations')
ON CONFLICT (key) DO NOTHING;
