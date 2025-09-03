import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Zap, Rocket, BarChart } from 'lucide-react';
import Image from 'next/image';
import WhatsOLogo from '@/components/logo';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center">
        <Link href="#" className="flex items-center justify-center">
          <WhatsOLogo />
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            href="/dashboard/chat"
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            Sign In
          </Link>
          <Button asChild>
            <Link href="/dashboard/chat">Get Started</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Revolutionize Your Customer Support with AI
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    WhatsO provides an AI-powered WhatsApp chat automation
                    solution to streamline your customer interactions and boost
                    sales.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/dashboard/chat">
                      Try WhatsO Now
                    </Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://picsum.photos/600/400"
                width="600"
                height="400"
                alt="Hero"
                data-ai-hint="abstract tech"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              />
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Why You'll Love WhatsO
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform is packed with features designed to make your
                  customer support faster, smarter, and more efficient.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-8 w-8 text-primary" />
                  <h3 className="text-xl font-bold">Automated Conversations</h3>
                </div>
                <p className="text-muted-foreground">
                  Let our AI handle common queries, freeing up your agents to
                  focus on complex issues.
                </p>
              </div>
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <Zap className="h-8 w-8 text-primary" />
                  <h3 className="text-xl font-bold">Instant Responses</h3>
                </div>
                <p className="text-muted-foreground">
                  Provide 24/7 support and immediate answers to your
                  customers' questions.
                </p>
              </div>
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <Rocket className="h-8 w-8 text-primary" />
                  <h3 className="text-xl font-bold">Sales Boost</h3>
                </div>
                <p className="text-muted-foreground">
                  Engage potential customers proactively and guide them through
                  the sales funnel.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Track Your Performance with our Advanced Dashboard
              </h2>
              <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Gain valuable insights into your customer interactions. Monitor
                conversation volume, satisfaction scores, and response times.
              </p>
            </div>
            <div className="flex justify-center">
              <Card className="w-full max-w-md">
                <CardContent className="p-4">
                  <Image
                    src="https://picsum.photos/500/300"
                    width="500"
                    height="300"
                    alt="Dashboard Preview"
                    data-ai-hint="dashboard chart"
                    className="rounded-md"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          &copy; 2024 WhatsO. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
