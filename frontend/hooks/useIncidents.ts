'use client';

import { useState, useEffect, useCallback } from 'react';
import { incidentsApi } from '@/lib/api';
import type { Incident, DashboardSummary } from '@/lib/types';

export function useIncidents(params?: Record<string, string>) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIncidents = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const result = await incidentsApi.list(params);
      if (!signal?.aborted) {
        setIncidents(result.incidents);
        setTotal(result.total);
        setError(null);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to fetch incidents');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchIncidents(abortController.signal);
    return () => abortController.abort();
  }, [fetchIncidents]);

  return { incidents, total, loading, error, refetch: () => fetchIncidents() };
}

export function useIncident(id: string) {
  const [incident, setIncident] = useState<(Incident & { executions?: unknown[]; runbook?: unknown }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncident = useCallback(async () => {
    try {
      setLoading(true);
      const data = await incidentsApi.getById(id);
      setIncident(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch incident');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  return { incident, loading, error, refetch: fetchIncident };
}

export function useDashboardSummary() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const data = await incidentsApi.getSummary();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}
