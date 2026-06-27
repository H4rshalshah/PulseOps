'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { settingsApi, monitorsApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { Loader2, CheckCircle, XCircle, Plus, Trash2, Plug, Activity, Bell, Settings as SettingsIcon } from 'lucide-react';
import type { Monitor } from '@/lib/types';

type TabKey = 'integrations' | 'monitors' | 'notifications' | 'general';

const tabs: { key: TabKey; label: string; icon: typeof Plug }[] = [
  { key: 'integrations', label: 'Integrations', icon: Plug },
  { key: 'monitors', label: 'Monitors', icon: Activity },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'general', label: 'General', icon: SettingsIcon },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('integrations');
  const [settings, setSettings] = useState<Record<string, Array<{ key: string; value: string }>>>({});
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [newMonitor, setNewMonitor] = useState({ name: '', url: '', method: 'GET', interval_seconds: 60 });

  useEffect(() => {
    Promise.all([
      settingsApi.getAll(),
      monitorsApi.list(),
    ]).then(([s, m]) => {
      setSettings(s);
      setMonitors(m);
      const values: Record<string, string> = {};
      Object.values(s).flat().forEach((item) => { values[item.key] = item.value; });
      setEditValues(values);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await settingsApi.update(editValues);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (type: 'slack' | 'github' | 'pagerduty') => {
    try {
      setTesting(type);
      let result: { success: boolean; message: string } | null = null;
      switch (type) {
        case 'slack':
          result = await settingsApi.testSlack();
          break;
        case 'github':
          result = await settingsApi.testGitHub();
          break;
        case 'pagerduty':
          result = await settingsApi.testPagerDuty();
          break;
      }
      if (result?.success) {
        toast.success(`${type}: ${result.message}`);
      } else {
        toast.error(`${type}: ${result?.message || 'Unknown error'}`);
      }
    } catch {
      toast.error(`Failed to test ${type} connection`);
    } finally {
      setTesting(null);
    }
  };

  const handleAddMonitor = async () => {
    if (!newMonitor.name || !newMonitor.url) {
      toast.error('Name and URL are required');
      return;
    }
    try {
      const created = await monitorsApi.create(newMonitor);
      setMonitors((prev) => [...prev, created]);
      setNewMonitor({ name: '', url: '', method: 'GET', interval_seconds: 60 });
      toast.success('Monitor added');
    } catch {
      toast.error('Failed to add monitor');
    }
  };

  const handleDeleteMonitor = async (id: string) => {
    try {
      await monitorsApi.delete(id);
      setMonitors((prev) => prev.filter((m) => m.id !== id));
      toast.success('Monitor removed');
    } catch {
      toast.error('Failed to remove monitor');
    }
  };

  const handleCheckMonitor = async (id: string) => {
    try {
      const result = await monitorsApi.check(id);
      if (result.status === 'healthy') {
        toast.success(`Monitor check: ${result.statusCode} (${result.responseTimeMs}ms)`);
      } else {
        toast.error(`Monitor check failed: ${result.error || 'unhealthy'}`);
      }
    } catch {
      toast.error('Failed to check monitor');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="text-pulseops-cyan animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-pulseops-text">Settings</h1>
        <p className="text-sm text-pulseops-muted mt-1">Configure integrations and system preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-pulseops-surface border border-pulseops-border rounded-xl p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-pulseops-cyan/10 text-pulseops-cyan'
                  : 'text-pulseops-muted hover:text-pulseops-text hover:bg-pulseops-border/50'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'integrations' && (
          <motion.div
            key="integrations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {['slack_webhook_url', 'github_token', 'pagerduty_api_key'].map((key) => (
              <div key={key} className="bg-pulseops-surface border border-pulseops-border rounded-xl p-5">
                <label className="block text-sm font-medium text-pulseops-text mb-2 capitalize">
                  {key.replace(/_/g, ' ')}
                </label>
                <div className="flex gap-3">
                  <input
                    type="password"
                    value={editValues[key] || ''}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                    className="flex-1 bg-pulseops-bg border border-pulseops-border rounded-lg px-3 py-2 text-sm text-pulseops-text placeholder-pulseops-muted/50 outline-none focus:border-pulseops-cyan/50 transition-colors"
                  />
                  <button
                    onClick={() => handleTestConnection(key.startsWith('slack') ? 'slack' : key.startsWith('github') ? 'github' : 'pagerduty')}
                    disabled={testing === key}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-pulseops-cyan bg-pulseops-cyan/10 border border-pulseops-cyan/20 rounded-lg hover:bg-pulseops-cyan/20 disabled:opacity-50 transition-all"
                  >
                    {testing === (key.startsWith('slack') ? 'slack' : key.startsWith('github') ? 'github' : 'pagerduty') ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Plug size={12} />
                    )}
                    Test Connection
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-pulseops-cyan text-pulseops-bg font-medium rounded-xl hover:bg-pulseops-cyan/90 disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'monitors' && (
          <motion.div
            key="monitors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Add Monitor */}
            <div className="bg-pulseops-surface border border-pulseops-border rounded-xl p-5">
              <h3 className="text-sm font-medium text-pulseops-text mb-4">Add Monitor</h3>
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  value={newMonitor.name}
                  onChange={(e) => setNewMonitor((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Monitor name"
                  className="flex-1 min-w-[200px] bg-pulseops-bg border border-pulseops-border rounded-lg px-3 py-2 text-sm text-pulseops-text placeholder-pulseops-muted/50 outline-none focus:border-pulseops-cyan/50 transition-colors"
                />
                <input
                  type="url"
                  value={newMonitor.url}
                  onChange={(e) => setNewMonitor((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com/health"
                  className="flex-1 min-w-[300px] bg-pulseops-bg border border-pulseops-border rounded-lg px-3 py-2 text-sm text-pulseops-text placeholder-pulseops-muted/50 outline-none focus:border-pulseops-cyan/50 transition-colors"
                />
                <select
                  value={newMonitor.method}
                  onChange={(e) => setNewMonitor((prev) => ({ ...prev, method: e.target.value }))}
                  className="bg-pulseops-bg border border-pulseops-border rounded-lg px-3 py-2 text-sm text-pulseops-text outline-none focus:border-pulseops-cyan/50 transition-colors"
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>HEAD</option>
                </select>
                <button
                  onClick={handleAddMonitor}
                  className="flex items-center gap-1.5 px-4 py-2 bg-pulseops-cyan text-pulseops-bg font-medium rounded-lg hover:bg-pulseops-cyan/90 transition-all"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>

            {/* Monitors List */}
            {monitors.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-pulseops-border rounded-xl">
                <p className="text-sm text-pulseops-muted">No monitors configured</p>
              </div>
            ) : (
              monitors.map((monitor) => (
                <div key={monitor.id} className="flex items-center gap-4 bg-pulseops-surface border border-pulseops-border rounded-xl p-4">
                  <div className={`w-2 h-2 rounded-full ${monitor.is_active ? 'bg-pulseops-success' : 'bg-pulseops-muted'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-pulseops-text">{monitor.name}</p>
                    <p className="text-xs text-pulseops-muted font-mono">{monitor.method} {monitor.url}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    monitor.last_status === 'healthy' ? 'text-pulseops-success bg-pulseops-success/10' :
                    monitor.last_status === 'unhealthy' ? 'text-pulseops-danger bg-pulseops-danger/10' :
                    'text-pulseops-muted bg-pulseops-border/50'
                  }`}>
                    {monitor.last_status || 'pending'}
                  </span>
                  <button
                    onClick={() => handleCheckMonitor(monitor.id)}
                    className="px-3 py-1.5 text-xs font-medium text-pulseops-cyan bg-pulseops-cyan/10 rounded-lg hover:bg-pulseops-cyan/20 transition-colors"
                  >
                    Check
                  </button>
                  <button
                    onClick={() => handleDeleteMonitor(monitor.id)}
                    className="p-1.5 text-pulseops-danger hover:bg-pulseops-danger/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-pulseops-surface border border-pulseops-border rounded-xl p-5"
          >
            <h3 className="text-sm font-medium text-pulseops-text mb-4">On-Call Schedule</h3>
            <p className="text-sm text-pulseops-muted mb-6">Configure on-call schedules and escalation policies.</p>
            
            <div className="space-y-4">
              {['Primary', 'Secondary', 'Escalation'].map((level, i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-pulseops-border last:border-0">
                  <span className="text-sm text-pulseops-text w-24">{level}</span>
                  <input
                    type="email"
                    placeholder="Email address..."
                    className="flex-1 bg-pulseops-bg border border-pulseops-border rounded-lg px-3 py-2 text-sm text-pulseops-text placeholder-pulseops-muted/50 outline-none focus:border-pulseops-cyan/50 transition-colors"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'general' && (
          <motion.div
            key="general"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-pulseops-surface border border-pulseops-border rounded-xl p-5 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-pulseops-text mb-2">Application Name</label>
              <input
                type="text"
                value={editValues.app_name || 'PulseOps'}
                onChange={(e) => setEditValues((prev) => ({ ...prev, app_name: e.target.value }))}
                className="w-full max-w-md bg-pulseops-bg border border-pulseops-border rounded-lg px-3 py-2 text-sm text-pulseops-text placeholder-pulseops-muted/50 outline-none focus:border-pulseops-cyan/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-pulseops-text mb-2">Timezone</label>
              <select
                value={editValues.timezone || 'UTC'}
                onChange={(e) => setEditValues((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full max-w-md bg-pulseops-bg border border-pulseops-border rounded-lg px-3 py-2 text-sm text-pulseops-text outline-none focus:border-pulseops-cyan/50 transition-colors"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              </select>
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-pulseops-cyan text-pulseops-bg font-medium rounded-xl hover:bg-pulseops-cyan/90 disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
