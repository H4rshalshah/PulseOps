'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { projectApi, workspaceApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus, Globe, ExternalLink, Trash2, Settings, Loader2, Copy, CheckCircle,
  Activity, AlertTriangle, Server, Github, RefreshCw, Webhook
} from 'lucide-react';
import type { Project } from '@/lib/types';

const statusColors: Record<string, string> = {
  healthy: 'text-pulseops-success bg-pulseops-success/10',
  degraded: 'text-pulseops-warning bg-pulseops-warning/10',
  down: 'text-pulseops-danger bg-pulseops-danger/10',
  unknown: 'text-pulseops-muted bg-pulseops-border/50',
};

const environmentColors: Record<string, string> = {
  production: 'text-pulseops-danger bg-pulseops-danger/10',
  staging: 'text-pulseops-warning bg-pulseops-warning/10',
  development: 'text-pulseops-cyan bg-pulseops-cyan/10',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    environment: 'production',
    baseUrl: '',
    healthCheckUrl: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const ws = await workspaceApi.getCurrent();
      setWorkspace(ws);
      if (ws) {
        const projs = await projectApi.list(ws.id);
        setProjects(projs);
      }
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newProject.name || !workspace) return;
    try {
      setCreating(true);
      const project = await projectApi.create({
        workspaceId: workspace.id,
        name: newProject.name,
        description: newProject.description,
        environment: newProject.environment as any,
        baseUrl: newProject.baseUrl || undefined,
        healthCheckUrl: newProject.healthCheckUrl || undefined,
      });
      setProjects((prev) => [...prev, project]);
      setShowCreate(false);
      setNewProject({ name: '', description: '', environment: 'production', baseUrl: '', healthCheckUrl: '' });
      toast.success('Project created');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await projectApi.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const handleTestHealthCheck = async (id: string) => {
    try {
      const result = await projectApi.testHealthCheck(id);
      toast.success(`Health check: ${result.status} (${result.statusCode || 'N/A'})`);
      loadData();
    } catch {
      toast.error('Health check failed');
    }
  };

  const handleCopyWebhook = (project: Project) => {
    const url = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').trim()}/api/webhooks/alerts/${project.webhookToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Webhook URL copied');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-pulseops-text">Projects</h1>
          <p className="text-sm text-pulseops-muted mt-1">{projects.length} projects configured</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pulseops-cyan text-pulseops-bg font-medium rounded-xl hover:bg-pulseops-cyan/90 transition-all"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-pulseops-surface border border-pulseops-border rounded-xl p-5"
          >
            <h3 className="text-sm font-medium text-pulseops-text mb-4">Create New Project</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-pulseops-muted mb-1">Project Name</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Payment API"
                    className="w-full bg-pulseops-bg border border-pulseops-border rounded-lg px-3 py-2 text-sm text-pulseops-text placeholder-pulseops-muted/50 outline-none focus:border-pulseops-cyan/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-pulseops-muted mb-1">Environment</label>
                  <select
                    value={newProject.environment}
                    onChange={(e) => setNewProject((p) => ({ ...p, environment: e.target.value }))}
                    className="w-full bg-pulseops-bg border border-pulseops-border rounded-lg px-3 py-2 text-sm text-pulseops-text outline-none focus:border-pulseops-cyan/50 transition-colors"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-pulseops-muted mb-1">Description</label>
                  <input
                    type="text"
                    value={newProject.description}
                    onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Describe what this project does..."
                    className="w-full bg-pulseops-bg border border-pulseops-border rounded-lg px-3 py-2 text-sm text-pulseops-text placeholder-pulseops-muted/50 outline-none focus:border-pulseops-cyan/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-pulseops-muted mb-1">Base URL</label>
                  <input
                    type="url"
                    value={newProject.baseUrl}
                    onChange={(e) => setNewProject((p) => ({ ...p, baseUrl: e.target.value }))}
                    placeholder="https://api.example.com"
                    className="w-full bg-pulseops-bg border border-pulseops-border rounded-lg px-3 py-2 text-sm text-pulseops-text placeholder-pulseops-muted/50 outline-none focus:border-pulseops-cyan/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-pulseops-muted mb-1">Health Check URL</label>
                  <input
                    type="url"
                    value={newProject.healthCheckUrl}
                    onChange={(e) => setNewProject((p) => ({ ...p, healthCheckUrl: e.target.value }))}
                    placeholder="https://api.example.com/health"
                    className="w-full bg-pulseops-bg border border-pulseops-border rounded-lg px-3 py-2 text-sm text-pulseops-text placeholder-pulseops-muted/50 outline-none focus:border-pulseops-cyan/50 transition-colors"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-pulseops-muted hover:text-pulseops-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newProject.name}
                  className="flex items-center gap-2 px-4 py-2 bg-pulseops-cyan text-pulseops-bg font-medium rounded-lg hover:bg-pulseops-cyan/90 disabled:opacity-50 transition-all text-sm"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Create Project
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-pulseops-border rounded-xl">
          <Server size={40} className="mx-auto mb-3 text-pulseops-muted" />
          <h3 className="text-lg font-medium text-pulseops-text mb-1">No projects yet</h3>
          <p className="text-sm text-pulseops-muted mb-4">Create your first project to start monitoring</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-pulseops-cyan text-pulseops-bg font-medium rounded-xl hover:bg-pulseops-cyan/90 transition-all"
          >
            <Plus size={16} />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-pulseops-surface border border-pulseops-border rounded-xl p-5 hover:border-pulseops-cyan/20 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${project.status === 'healthy' ? 'bg-pulseops-success' : project.status === 'degraded' ? 'bg-pulseops-warning' : project.status === 'down' ? 'bg-pulseops-danger' : 'bg-pulseops-muted'}`} />
                  <div>
                    <h3 className="font-heading font-semibold text-pulseops-text group-hover:text-pulseops-cyan transition-colors">
                      {project.name}
                    </h3>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${environmentColors[project.environment]}`}>
                      {project.environment}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="p-1.5 text-pulseops-muted hover:text-pulseops-danger rounded-lg hover:bg-pulseops-danger/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {project.description && (
                <p className="text-xs text-pulseops-muted mb-3 line-clamp-2">{project.description}</p>
              )}

              <div className="space-y-2 mb-4">
                {project.baseUrl && (
                  <div className="flex items-center gap-2 text-xs text-pulseops-muted">
                    <Globe size={12} />
                    <span className="truncate font-mono">{project.baseUrl}</span>
                  </div>
                )}
                {project.healthCheckUrl && (
                  <div className="flex items-center gap-2 text-xs text-pulseops-muted">
                    <Activity size={12} />
                    <span className="truncate font-mono">{project.healthCheckUrl}</span>
                  </div>
                )}
              </div>

              {/* Webhook URL */}
              <div className="flex items-center gap-2 px-3 py-2 bg-pulseops-bg rounded-lg mb-3">
                <Webhook size={12} className="text-pulseops-cyan shrink-0" />
                <code className="text-[10px] font-mono text-pulseops-muted truncate">
                  .../alerts/{project.webhookToken.substring(0, 12)}...
                </code>
                <button
                  onClick={() => handleCopyWebhook(project)}
                  className="ml-auto p-1 text-pulseops-muted hover:text-pulseops-cyan transition-colors"
                >
                  <Copy size={12} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-pulseops-border">
                {project.healthCheckUrl && (
                  <button
                    onClick={() => handleTestHealthCheck(project.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-pulseops-cyan bg-pulseops-cyan/10 rounded-lg hover:bg-pulseops-cyan/20 transition-colors"
                  >
                    <RefreshCw size={12} />
                    Check
                  </button>
                )}
                <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${statusColors[project.status]}`}>
                  {project.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
