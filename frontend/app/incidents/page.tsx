'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import StatusBadge from '@/components/incidents/StatusBadge';
import { useIncidents } from '@/hooks/useIncidents';
import { incidentsApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { formatDistanceToNow } from 'date-fns';
import { Search, SlidersHorizontal, Trash2, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { Incident } from '@/lib/types';

export default function IncidentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { incidents, total, loading, refetch } = useIncidents(
    Object.fromEntries(
      Object.entries({
        ...(statusFilter && { status: statusFilter }),
        ...(severityFilter && { severity: severityFilter }),
        ...(search && { search }),
        limit: '50',
      }).filter(([_, v]) => v)
    )
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get('search') || '');
  }, []);

  const handleBulkResolve = async () => {
    for (const id of selectedIds) {
      try {
        await incidentsApi.resolve(id);
      } catch {
        // Continue with rest
      }
    }
    toast.success(`Resolved ${selectedIds.size} incidents`);
    setSelectedIds(new Set());
    refetch();
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      try {
        await incidentsApi.delete(id);
      } catch {
        // Continue with rest
      }
    }
    toast.success(`Deleted ${selectedIds.size} incidents`);
    setSelectedIds(new Set());
    refetch();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-deadman-text">Incidents</h1>
          <p className="text-sm text-deadman-muted mt-1">{total} total incidents</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-deadman-muted" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-deadman-surface border border-deadman-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-deadman-text placeholder-deadman-muted focus:border-deadman-cyan/50 transition-colors outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-deadman-surface border border-deadman-border rounded-xl px-4 py-2.5 text-sm text-deadman-text outline-none focus:border-deadman-cyan/50 transition-colors"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="mitigating">Mitigating</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-deadman-surface border border-deadman-border rounded-xl px-4 py-2.5 text-sm text-deadman-text outline-none focus:border-deadman-cyan/50 transition-colors"
        >
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-2 bg-deadman-cyan/10 border border-deadman-cyan/20 rounded-xl"
        >
          <span className="text-sm text-deadman-cyan">{selectedIds.size} selected</span>
          <button
            onClick={handleBulkResolve}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-deadman-success bg-deadman-success/10 rounded-lg hover:bg-deadman-success/20 transition-colors"
          >
            <CheckCircle size={12} />
            Resolve
          </button>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-deadman-danger bg-deadman-danger/10 rounded-lg hover:bg-deadman-danger/20 transition-colors"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </motion.div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-deadman-cyan animate-spin" />
        </div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-deadman-border rounded-xl">
          <AlertTriangle size={40} className="mx-auto mb-3 text-deadman-muted" />
          <h3 className="text-lg font-medium text-deadman-text mb-1">No incidents found</h3>
          <p className="text-sm text-deadman-muted">
            {search || statusFilter || severityFilter ? 'Try adjusting your filters' : 'No incidents have been created yet'}
          </p>
        </div>
      ) : (
        <div className="bg-deadman-surface border border-deadman-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-deadman-border">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(incidents.map((i) => i.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      className="rounded border-deadman-border bg-deadman-bg text-deadman-cyan focus:ring-deadman-cyan"
                    />
                  </th>
                  <th className="text-left text-xs font-medium text-deadman-muted uppercase tracking-wider px-4 py-3">Title</th>
                  <th className="text-left text-xs font-medium text-deadman-muted uppercase tracking-wider px-4 py-3">Severity</th>
                  <th className="text-left text-xs font-medium text-deadman-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-deadman-muted uppercase tracking-wider px-4 py-3">Source</th>
                  <th className="text-left text-xs font-medium text-deadman-muted uppercase tracking-wider px-4 py-3">Service</th>
                  <th className="text-left text-xs font-medium text-deadman-muted uppercase tracking-wider px-4 py-3">Created</th>
                  <th className="text-right text-xs font-medium text-deadman-muted uppercase tracking-wider px-4 py-3">MTTR</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className={`border-b border-deadman-border last:border-0 hover:bg-deadman-cyan/5 transition-colors cursor-pointer ${
                      selectedIds.has(incident.id) ? 'bg-deadman-cyan/5' : ''
                    }`}
                    onClick={() => router.push(`/incidents/${incident.id}`)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(incident.id)}
                        onChange={() => toggleSelect(incident.id)}
                        className="rounded border-deadman-border bg-deadman-bg text-deadman-cyan focus:ring-deadman-cyan"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/incidents/${incident.id}`} className="text-sm font-medium text-deadman-text hover:text-deadman-cyan transition-colors">
                        {incident.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${
                        incident.severity === 'critical' ? 'text-deadman-danger bg-deadman-danger/10' :
                        incident.severity === 'high' ? 'text-deadman-warning bg-deadman-warning/10' :
                        incident.severity === 'medium' ? 'text-deadman-cyan bg-deadman-cyan/10' :
                        'text-deadman-success bg-deadman-success/10'
                      }`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={incident.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm text-deadman-muted">{incident.source || '—'}</td>
                    <td className="px-4 py-3 text-sm text-deadman-muted font-mono">{incident.service_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-deadman-muted">
                      {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-deadman-text">
                      {incident.mttr_seconds ? `${Math.round(incident.mttr_seconds / 60)}m` : '—'}
                    </td>                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
