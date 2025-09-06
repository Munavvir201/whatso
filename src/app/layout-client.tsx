
"use client";

import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarFooter, SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import WhatsOLogo from "@/components/logo";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageHeader } from "@/components/page-header";
import { useAuth } from '@/hooks/use-auth';
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function RootLayoutClient({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {

    const pathname = usePathname();
    const router = useRouter();
    const { user, loading, logout } = useAuth();
    
    const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/training') || pathname.startsWith('/settings');
    const isAuthPage = pathname === '/login' || pathname === '/signup';

    useEffect(() => {
      if (!loading && !user && isDashboard) {
        router.push('/login');
      }
    }, [pathname, user, loading, router, isDashboard]);
    
    if (loading && (isDashboard || isAuthPage)) {
      return (
          <div className="flex items-center justify-center h-screen">
              <Skeleton className="h-12 w-12 rounded-full" />
          </div>
      );
    }

    if (!isDashboard) {
      if (isAuthPage && user) {
        router.push('/dashboard');
        return (
            <div className="flex items-center justify-center h-screen">
                 <Skeleton className="h-12 w-12 rounded-full" />
            </div>
        );
      }
      return <>{children}</>;
    }
    
    return (
      <div className="flex h-screen">
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
                   <AvatarImage src={user?.photoURL || `https://picsum.photos/seed/${user?.uid}/40/40`} alt={user?.displayName || "User"} data-ai-hint="person face" />
                   <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                 </Avatar>
                 <div className="flex flex-col group-data-[collapsible=icon]:hidden flex-1">
                   <span className="text-sm font-semibold text-sidebar-foreground truncate">{user?.displayName || user?.email}</span>
                 </div>
                 <Button variant="ghost" size="icon" className="h-8 w-8 group-data-[collapsible=icon]:h-full group-data-[collapsible=icon]:w-full" onClick={logout}><LogOut /></Button>
               </div>
            </SidebarFooter>
          </Sidebar>
          <div className="flex-1 flex flex-col">
            <PageHeader />
            <main className="flex-1 p-4 md:p-6 flex flex-col min-h-0">
                {children}
            </main>
          </div>
        </SidebarProvider>
      </div>
    )
}
