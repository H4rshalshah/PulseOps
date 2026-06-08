'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  AlertTriangle,
  BookOpen,
  BarChart3,
  Settings,
  Activity,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { href: '/runbooks', label: 'Runbooks', icon: BookOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-deadman-surface border-r border-deadman-border flex flex-col z-50">
      {/* Header */}
      <div className="p-5 border-b border-deadman-border">
        <Logo size={28} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-deadman-cyan bg-deadman-cyanLight/10'
                    : 'text-deadman-muted hover:text-deadman-text hover:bg-deadman-border/50'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-deadman-cyan to-deadman-cyanLight rounded-r-full" />
                )}
                <Icon size={18} className="shrink-0" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Status bar */}
      <div className="p-4 border-t border-deadman-border">
        <div className="flex items-center gap-2 text-xs text-deadman-muted">
          <Activity size={12} className="text-deadman-success" />
          <span>All systems nominal</span>
        </div>
      </div>
    </aside>
  );
}
