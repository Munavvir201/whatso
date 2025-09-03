"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, BarChart, Settings, Webhook, BookUser } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

const navItems = [
  { href: '/', label: 'AI Chat', icon: Bot, tooltip: 'Chat' },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart, tooltip: 'Dashboard' },
  { href: '/training', label: 'Training', icon: BookUser, tooltip: 'Training' },
  { href: '/webhooks', label: 'Webhooks', icon: Webhook, tooltip: 'Webhooks' },
  { href: '/settings', label: 'Settings', icon: Settings, tooltip: 'Settings' },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild tooltip={item.tooltip} isActive={pathname === item.href}>
              <Link href={item.href}>
                <Icon />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
