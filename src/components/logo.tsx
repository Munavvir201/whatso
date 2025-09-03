import { MessageSquare } from 'lucide-react';

export default function WhatsOLogo() {
  return (
    <div className="flex items-center gap-2" data-testid="logo">
      <div className="p-2 bg-primary rounded-lg">
        <svg
          className="text-primary-foreground"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 3.34a10 10 0 1 1-14.995 8.984 10 10 0 0 1 1.635-10.618Z" />
          <path d="m12 12-2-2-2-2" />
          <path d="m14 14 2 2 2 2" />
        </svg>
      </div>
      <h1 className="text-2xl font-headline font-bold text-foreground group-data-[collapsible=icon]:hidden">
        WhatsO
      </h1>
    </div>
  );
}
