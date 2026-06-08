'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getSocket, subscribeToDashboard, subscribeToIncident, unsubscribeFromIncident } from '@/lib/socket';
import type { Socket } from 'socket.io-client';
import type { Incident, StepUpdate } from '@/lib/types';

type EventHandler<T = unknown> = (data: T) => void;

interface UseWebSocketOptions {
  onIncidentNew?: EventHandler<Incident>;
  onIncidentUpdated?: EventHandler<Incident>;
  onStepUpdate?: EventHandler<StepUpdate>;
  onMonitorStatus?: EventHandler<{ id: string; status: string }>;
  incidentId?: string;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const socket: Socket = getSocket();

    const handleIncidentNew = (data: Incident) => {
      optionsRef.current.onIncidentNew?.(data);
    };

    const handleIncidentUpdated = (data: Incident) => {
      optionsRef.current.onIncidentUpdated?.(data);
    };

    const handleStepUpdate = (data: StepUpdate) => {
      optionsRef.current.onStepUpdate?.(data);
    };

    const handleMonitorStatus = (data: { id: string; status: string }) => {
      optionsRef.current.onMonitorStatus?.(data);
    };

    socket.on('incident:new', handleIncidentNew);
    socket.on('incident:updated', handleIncidentUpdated);
    socket.on('step:update', handleStepUpdate);
    socket.on('monitor:status', handleMonitorStatus);

    // Join appropriate rooms
    subscribeToDashboard();
    if (options.incidentId) {
      subscribeToIncident(options.incidentId);
    }

    return () => {
      socket.off('incident:new', handleIncidentNew);
      socket.off('incident:updated', handleIncidentUpdated);
      socket.off('step:update', handleStepUpdate);
      socket.off('monitor:status', handleMonitorStatus);

      if (options.incidentId) {
        unsubscribeFromIncident(options.incidentId);
      }
    };
  }, [options.incidentId]);
}
