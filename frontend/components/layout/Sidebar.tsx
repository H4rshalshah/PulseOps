'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  BookOpen,
  BarChart3,
  Settings,
  Activity,
  Server,
  Users,
  LogOut,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { workspaceApi } from '@/lib/api';
import type { Workspace } from '@/lib/types';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { href: '/runbooks', label: 'Runbooks', icon: BookOpen },
  { href: '/projects', label: 'Projects', icon: Server },
  { href: '/endpoints', label: 'Endpoints', icon: Activity },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    workspaceApi.getCurrent().then(setWorkspace).catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pulseops_token');
    router.push('/auth/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-pulseops-surface border-r border-pulseops-border flex flex-col z-50 shadow-card">
      {/* Header */}
      <div className="p-5 border-b border-pulseops-border">
        <Logo size={28} />
      </div>

      {/* Workspace selector */}
      {workspace && (
        <div className="px-4 py-3 border-b border-pulseops-border">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-pulseops-cyan/10">
            <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-pulseops-cyan/20">
              <span className="text-[9px] font-bold text-pulseops-cyan">{workspace.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-pulseops-text truncate">{workspace.name}</p>
              <p className="text-[10px] text-pulseops-muted capitalize">{workspace.role || 'member'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-pulseops-cyan bg-pulseops-cyan/10'
                    : 'text-pulseops-text-secondary hover:text-pulseops-text hover:bg-gray-50 dark:hover:bg-pulseops-border/30'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-0.5 bottom-0.5 w-0.5 rounded-r-full bg-pulseops-cyan" />
                )}
                <Icon size={18} className={`shrink-0 ${isActive ? 'text-pulseops-cyan' : ''}`} />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-pulseops-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-pulseops-muted hover:text-pulseops-danger hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
        <div className="flex items-center gap-2 mt-2 px-3 text-xs text-pulseops-muted">
          <span className="w-2 h-2 bg-pulseops-success rounded-full" />
          <span>All systems nominal</span>
        </div>
      </div>
    </aside>
  );
}
