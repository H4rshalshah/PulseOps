'use client';

import './globals.css';
import { ThemeProvider } from 'next-themes';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ThemeToggle from '@/components/layout/ThemeToggle';
import ToastContainer from '@/components/ui/ToastContainer';

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  if (isLanding) {
    return (
      <>
        {/* Theme toggle fixed top-right on landing page */}
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-deadman-bg text-deadman-text">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>DeadMan — Automated Incident Response</title>
        <meta name="description" content="Production-grade automated incident response system. Respond to incidents before they wake you up." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><path d='M4 20 L12 20 L14 14 L18 26 L22 10 L26 22 L28 18 L32 20 L36 20' stroke='%2300D4FF' stroke-width='2.5' fill='none'/></svg>" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
        <ToastContainer />
      </body>
    </html>
  );
}
