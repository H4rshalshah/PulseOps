'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Plus, Webhook } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { incidentsApi, webhooksApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';

export default function Header() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTestWebhook = async () => {
    try {
      await webhooksApi.ingest({
        title: 'Test Alert - High CPU detected',
        message: 'CPU usage exceeded 90% on api-server-01',
        severity: 'critical',
        source: 'manual-test',
        service_name: 'api-gateway',
        timestamp: new Date().toISOString(),
      });
      toast.success('Test webhook sent! Incident created.');
    } catch {
      toast.error('Failed to send test webhook');
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    router.push(query ? `/incidents?search=${encodeURIComponent(query)}` : '/incidents');
  };

  const handleNewIncident = async () => {
    try {
      const incident = await incidentsApi.create({
        title: 'Manual incident',
        description: 'Created from the quick action in the header.',
        severity: 'medium',
        source: 'manual',
        service_name: 'api-gateway',
      });
      toast.success('Incident created');
      router.push(`/incidents/${incident.id}`);
    } catch {
      toast.error('Failed to create incident');
    }
  };

  return (
    <header className="h-16 bg-deadman-surface border-b border-deadman-border flex items-center justify-between px-6">
      {/* Search */}
      <form className="relative" onSubmit={handleSearchSubmit}>
        <div
          className="flex items-center gap-2 bg-deadman-bg border border-deadman-border rounded-lg px-3 py-1.5 transition-all duration-200"
          style={{ width: searchOpen ? '300px' : '200px' }}
        >
          <Search size={16} className="text-deadman-muted shrink-0" />
          <input
            type="text"
            placeholder="Search incidents, runbooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
            className="bg-transparent text-sm text-deadman-text placeholder-deadman-muted outline-none w-full"
          />
          <kbd className="hidden sm:inline-flex text-[10px] text-deadman-muted bg-deadman-border px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </div>
      </form>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Test Webhook Button */}
        <button
          onClick={handleTestWebhook}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-deadman-warning bg-deadman-warning/10 border border-deadman-warning/20 rounded-lg hover:bg-deadman-warning/20 transition-colors"
        >
          <Webhook size={14} />
          <span className="hidden sm:inline">Test Webhook</span>
        </button>

        {/* Quick Create */}
        <button
          onClick={handleNewIncident}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-deadman-bg bg-deadman-cyan rounded-lg hover:bg-deadman-cyan/90 transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New Incident</span>
        </button>

        {/* Notifications */}
        <button
          onClick={() => toast.info('No unread notifications')}
          className="relative p-2 rounded-lg hover:bg-deadman-border transition-colors text-deadman-muted hover:text-deadman-text"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-deadman-danger rounded-full" />
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
