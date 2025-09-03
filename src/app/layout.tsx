import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import WhatsOLogo from "@/components/logo";
import { SidebarNav } from "@/components/sidebar-nav";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: 'WhatsO',
  description: 'AI-Powered WhatsApp Chat Automation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
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
        <Toaster />
      </body>
    </html>
  );
}
