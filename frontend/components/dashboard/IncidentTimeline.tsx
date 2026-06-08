'use client';

import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import StatusBadge from '@/components/incidents/StatusBadge';
import type { Incident } from '@/lib/types';

interface IncidentTimelineProps {
  incidents: Incident[];
}

export default function IncidentTimeline({ incidents }: IncidentTimelineProps) {
  if (incidents.length === 0) {
    return (
      <div className="bg-deadman-surface border border-deadman-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-deadman-text mb-4">Recent Incidents</h3>
        <div className="text-center py-8 text-sm text-deadman-muted">
          No incidents recorded
        </div>
      </div>
    );
  }

  return (
    <div className="bg-deadman-surface border border-deadman-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-deadman-text mb-4">Recent Incidents</h3>
      <div className="space-y-1">
        {incidents.slice(0, 8).map((incident, i) => (
          <motion.div
            key={incident.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-deadman-border/30 transition-colors"
          >
            {/* Timeline dot */}
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              incident.severity === 'critical' ? 'bg-deadman-danger' :
              incident.severity === 'high' ? 'bg-deadman-warning' :
              incident.severity === 'medium' ? 'bg-deadman-cyan' : 'bg-deadman-success'
            }`} />
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-deadman-text truncate">{incident.title}</p>
              <p className="text-xs text-deadman-muted">
                {incident.service_name} • {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
              </p>
            </div>
            
            <StatusBadge status={incident.status} size="sm" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
