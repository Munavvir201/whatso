"use client";

import { usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import WhatsOLogo from "@/components/logo";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageHeader } from "@/components/page-header";

export default function RootLayoutClient({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {

    const pathname = usePathname();
    const isDashboard = pathname.startsWith('/dashboard') || pathname === '/training' || pathname === '/webhooks' || pathname === '/settings';

    if (!isDashboard) {
        return <>{children}</>;
    }

    return (
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader>
              <WhatsOLogo />
            </SidebarHeader>
            <SidebarContent>
              <SidebarNav />
            </SidebarContent>
            <SidebarFooter>
               <div className="flex w-full items-center gap-3 p-2">
                 <Avatar className="size-8">
                   <AvatarImage src="https://picsum.photos/40/40" alt="User" data-ai-hint="person face" />
                   <AvatarFallback>JD</AvatarFallback>
                 </Avatar>
                 <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                   <span className="text-sm font-semibold text-sidebar-foreground">Jane Doe</span>
                   <span className="text-xs text-sidebar-foreground/70">jane.doe@whatso.com</span>
                 </div>
               </div>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset className="flex flex-col h-svh">
            <PageHeader />
            <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
    )
}
