"use client";

import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';

const titles: { [key: string]: string } = {
  '/': 'AI Chat',
  '/dashboard': 'Dashboard',
  '/training': 'AI Model Training',
  '/webhooks': 'Webhook Integration',
  '/settings': 'Settings',
};

export function PageHeader() {
  const pathname = usePathname();
  const title = titles[pathname] || 'WhatsO';

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-6 sticky top-0 z-10">
      <SidebarTrigger className="md:hidden"/>
      <h1 className="text-xl font-headline font-semibold text-foreground">
        {title}
      </h1>
    </header>
  );
}
