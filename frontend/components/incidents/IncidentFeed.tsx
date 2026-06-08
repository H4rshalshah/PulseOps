'use client';

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import IncidentCard from './IncidentCard';
import type { Incident } from '@/lib/types';

interface IncidentFeedProps {
  incidents: Incident[];
  latestIncidents?: Incident[];
}

export default function IncidentFeed({ incidents, latestIncidents }: IncidentFeedProps) {
  const displayIncidents = useMemo(
    () => latestIncidents || incidents.slice(0, 10),
    [latestIncidents, incidents]
  );

  if (displayIncidents.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-deadman-danger" />
          <h2 className="text-sm font-medium text-deadman-text">Live Incident Feed</h2>
          <div className="flex items-center gap-1 ml-auto">
            <span className="w-2 h-2 bg-deadman-success rounded-full animate-pulse" />
            <span className="text-xs text-deadman-muted">Real-time</span>
          </div>
        </div>
        <div className="text-center py-12 border border-dashed border-deadman-border rounded-xl">
          <AlertTriangle size={32} className="mx-auto mb-3 text-deadman-muted" />
          <p className="text-sm text-deadman-muted">No active incidents</p>
          <p className="text-xs text-deadman-muted/60 mt-1">All systems operational</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={16} className="text-deadman-danger" />
        <h2 className="text-sm font-medium text-deadman-text">Live Incident Feed</h2>
        <div className="flex items-center gap-1 ml-auto">
          <span className="w-2 h-2 bg-deadman-success rounded-full animate-pulse" />
          <span className="text-xs text-deadman-muted">Real-time</span>
        </div>
      </div>

      {displayIncidents.map((incident) => (
        <IncidentCard key={incident.id} incident={incident} />
      ))}
    </div>
  );
}
