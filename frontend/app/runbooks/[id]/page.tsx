'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import RunbookBuilder from '@/components/runbooks/RunbookBuilder';
import { runbooksApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { ArrowLeft, Save, Play, Copy, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

interface RunbookForm {
  id?: string;
  name: string;
  description: string;
  dry_run_mode: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  steps: any[];
}

export default function RunbookEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';

  const [runbook, setRunbook] = useState<RunbookForm>({
    name: '',
    description: '',
    dry_run_mode: false,
    steps: [],
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      runbooksApi.getById(id)
        .then((data) => {
          setRunbook({
            id: data.id,
            name: data.name,
            description: data.description || '',
            dry_run_mode: data.dry_run_mode,
            steps: data.steps || [],
          });
        })
        .catch(() => toast.error('Failed to load runbook'))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const handleSave = async () => {
    if (!runbook.name.trim()) {
      toast.error('Runbook name is required');
      return;
    }

    try {
      setSaving(true);
      if (isNew) {
        const created = await runbooksApi.create({
          name: runbook.name,
          description: runbook.description,
          dry_run_mode: runbook.dry_run_mode,
          steps: runbook.steps,
        });
        toast.success('Runbook created');
        router.push(`/runbooks/${created.id}`);
      } else {
        await runbooksApi.update(id, {
          name: runbook.name,
          description: runbook.description,
          dry_run_mode: runbook.dry_run_mode,
          steps: runbook.steps,
        });
        toast.success('Runbook saved');
      }
    } catch {
      toast.error('Failed to save runbook');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (isNew) {
      toast.error('Save the runbook first before testing');
      return;
    }
    try {
      const result = await runbooksApi.test(id);
      toast.success(`Test completed: ${result.steps?.length || 0} steps executed (dry-run)`);
    } catch {
      toast.error('Test execution failed');
    }
  };

  const handleDuplicate = async () => {
    if (!runbook.name) {
      toast.error('Save the runbook before duplicating');
      return;
    }
    try {
      const created = await runbooksApi.create({
        name: `${runbook.name} (Copy)`,
        description: runbook.description,
        steps: runbook.steps,
      });
      toast.success('Runbook duplicated');
      router.push(`/runbooks/${created.id}`);
    } catch {
      toast.error('Failed to duplicate runbook');
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
      <button
        onClick={() => router.push('/runbooks')}
        className="flex items-center gap-2 text-sm text-pulseops-muted hover:text-pulseops-text transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Runbooks
      </button>

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <input
            type="text"
            value={runbook.name}
            onChange={(e) => setRunbook((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Runbook name..."
            className="text-2xl font-heading font-bold bg-transparent border-b border-transparent hover:border-pulseops-border focus:border-pulseops-cyan outline-none text-pulseops-text placeholder-pulseops-muted/50 transition-colors w-full"
          />
          <input
            type="text"
            value={runbook.description}
            onChange={(e) => setRunbook((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Description (optional)"
            className="text-sm bg-transparent border-b border-transparent hover:border-pulseops-border focus:border-pulseops-cyan outline-none text-pulseops-muted placeholder-pulseops-muted/50 transition-colors w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-pulseops-muted cursor-pointer">
            <button
              onClick={() => setRunbook((prev) => ({ ...prev, dry_run_mode: !prev.dry_run_mode }))}
              className={`p-1 rounded-lg transition-colors ${
                runbook.dry_run_mode
                  ? 'text-pulseops-warning bg-pulseops-warning/10'
                  : 'text-pulseops-muted hover:bg-pulseops-border'
              }`}
            >
              {runbook.dry_run_mode ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>
            Dry-Run
          </label>

          <motion.button onClick={handleDuplicate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-pulseops-muted border border-pulseops-border rounded-lg hover:text-pulseops-text hover:bg-pulseops-border/50 transition-all" whileHover={{ scale: 1.02 }}>
            <Copy size={12} />
            Duplicate
          </motion.button>

          <motion.button onClick={handleTest} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-pulseops-warning bg-pulseops-warning/10 border border-pulseops-warning/20 rounded-lg hover:bg-pulseops-warning/20 transition-all" whileHover={{ scale: 1.02 }}>
            <Play size={12} />
            Test Run
          </motion.button>

          <motion.button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-pulseops-bg bg-pulseops-cyan rounded-lg hover:bg-pulseops-cyan/90 disabled:opacity-50 transition-all" whileHover={{ scale: 1.02 }}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? 'Saving...' : 'Save'}
          </motion.button>
        </div>
      </div>

      <RunbookBuilder
        initialSteps={runbook.steps}
        onSave={(steps) => setRunbook((prev) => ({ ...prev, steps }))}
      />
    </div>
  );
}
