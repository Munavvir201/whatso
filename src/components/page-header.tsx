"use client";

import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';

const titles: { [key: string]: string } = {
  '/dashboard': 'Dashboard',
  '/dashboard/chat': 'AI Chat',
  '/dashboard/getting-started': 'Getting Started',
  '/training': 'AI Model Training',
  '/settings': 'Settings',
  '/seed-database': 'Seed Database',
};

export function PageHeader() {
  const pathname = usePathname();
  const title = titles[pathname] || 'WhatsO';

  const isDashboard = pathname.startsWith('/dashboard') || pathname === '/training' || pathname === '/settings' || pathname === '/seed-database';

  if (!isDashboard) {
    return null;
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-6 sticky top-0 z-10">
      <SidebarTrigger className="md:hidden"/>
      <h1 className="text-xl font-headline font-semibold text-foreground">
        {title}
      </h1>
    </header>
  );
}
