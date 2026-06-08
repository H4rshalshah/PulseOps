'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { runbooksApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { formatDistanceToNow } from 'date-fns';
import { BookOpen, Plus, ToggleLeft, ToggleRight, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import type { Runbook } from '@/lib/types';

export default function RunbooksPage() {
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRunbooks = async () => {
    try {
      setLoading(true);
      const data = await runbooksApi.list();
      setRunbooks(data);
    } catch {
      toast.error('Failed to fetch runbooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRunbooks();
  }, []);

  const toggleActive = async (runbook: Runbook) => {
    try {
      await runbooksApi.update(runbook.id, { is_active: !runbook.is_active });
      toast.success(`Runbook ${runbook.is_active ? 'deactivated' : 'activated'}`);
      fetchRunbooks();
    } catch {
      toast.error('Failed to update runbook');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await runbooksApi.delete(id);
      toast.success('Runbook deleted');
      fetchRunbooks();
    } catch {
      toast.error('Failed to delete runbook');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="text-deadman-cyan animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-deadman-text">Runbooks</h1>
          <p className="text-sm text-deadman-muted mt-1">{runbooks.length} runbooks configured</p>
        </div>
        <Link
          href="/runbooks/new"
          className="flex items-center gap-2 px-4 py-2 bg-deadman-cyan text-deadman-bg font-medium rounded-xl hover:bg-deadman-cyan/90 transition-all"
        >
          <Plus size={16} />
          New Runbook
        </Link>
      </div>

      {runbooks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-deadman-border rounded-xl">
          <BookOpen size={40} className="mx-auto mb-3 text-deadman-muted" />
          <h3 className="text-lg font-medium text-deadman-text mb-1">No runbooks yet</h3>
          <p className="text-sm text-deadman-muted mb-4">Create your first automated runbook</p>
          <Link
            href="/runbooks/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-deadman-cyan text-deadman-bg font-medium rounded-xl hover:bg-deadman-cyan/90 transition-all"
          >
            <Plus size={16} />
            Create Runbook
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {runbooks.map((runbook, i) => (
            <motion.div
              key={runbook.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-deadman-surface border border-deadman-border rounded-xl p-5 hover:border-deadman-cyan/20 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <Link href={`/runbooks/${runbook.id}`} className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-deadman-text group-hover:text-deadman-cyan transition-colors truncate">
                    {runbook.name}
                  </h3>
                </Link>
                <button
                  onClick={() => toggleActive(runbook)}
                  className={`ml-2 p-1.5 rounded-lg transition-colors ${
                    runbook.is_active
                      ? 'text-deadman-success hover:bg-deadman-success/10'
                      : 'text-deadman-muted hover:bg-deadman-border'
                  }`}
                  title={runbook.is_active ? 'Deactivate' : 'Activate'}
                >
                  {runbook.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
              </div>

              {runbook.description && (
                <p className="text-sm text-deadman-muted mb-3 line-clamp-2">{runbook.description}</p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-deadman-muted">
                  <span className="flex items-center gap-1">
                    <span className="font-mono">{runbook.steps?.length || 0}</span> steps
                  </span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(runbook.updated_at), { addSuffix: true })}</span>
                </div>

                <div className="flex items-center gap-1">
                  {runbook.dry_run_mode && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-deadman-warning/10 text-deadman-warning">
                      Dry-Run
                    </span>
                  )}
                  {!runbook.is_active && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-deadman-muted/10 text-deadman-muted">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Trigger conditions */}
              {runbook.trigger_conditions && Object.keys(runbook.trigger_conditions).length > 0 && (
                <div className="mt-3 pt-3 border-t border-deadman-border">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(runbook.trigger_conditions).map(([key, value]) => (
                      <span key={key} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-deadman-cyan/10 text-deadman-cyan">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-deadman-border">
                <Link
                  href={`/runbooks/${runbook.id}`}
                  className="flex-1 text-center text-xs font-medium text-deadman-cyan bg-deadman-cyan/10 py-1.5 rounded-lg hover:bg-deadman-cyan/20 transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(runbook.id)}
                  className="px-3 py-1.5 text-xs font-medium text-deadman-danger bg-deadman-danger/10 rounded-lg hover:bg-deadman-danger/20 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
