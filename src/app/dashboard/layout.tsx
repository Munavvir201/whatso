import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 min-h-0">{children}</div>;
}
