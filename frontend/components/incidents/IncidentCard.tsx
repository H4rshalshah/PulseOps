'use client';

import { memo } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/incidents/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import type { Incident } from '@/lib/types';

interface IncidentCardProps {
  incident: Incident;
}

function IncidentCardComponent({ incident }: IncidentCardProps) {
  return (
    <Link href={`/incidents/${incident.id}`}>
      <div className="group flex items-center gap-4 px-4 py-3 bg-deadman-surface border border-deadman-border rounded-lg hover:border-deadman-cyan/30 hover:bg-deadman-cyan/5 transition-all cursor-pointer">
        {/* Severity indicator */}
        <div className={`w-1 h-10 rounded-full shrink-0 ${
          incident.severity === 'critical' ? 'bg-deadman-danger' :
          incident.severity === 'high' ? 'bg-deadman-warning' :
          incident.severity === 'medium' ? 'bg-deadman-cyan' : 'bg-deadman-success'
        }`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-medium text-deadman-text truncate group-hover:text-deadman-cyan transition-colors">
              {incident.title}
            </h3>
            <StatusBadge status={incident.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-deadman-muted">
            <span className="capitalize">{incident.severity}</span>
            <span>•</span>
            <span>{incident.service_name || 'Unknown'}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* MTTR */}
        {incident.mttr_seconds && (
          <div className="text-right shrink-0">
            <span className="text-xs text-deadman-muted">MTTR</span>
            <p className="text-sm font-mono text-deadman-text">
              {Math.floor(incident.mttr_seconds / 60)}m
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

export default memo(IncidentCardComponent);
