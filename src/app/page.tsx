
'use client'

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageSquare, Zap, Rocket, BarChart, CheckCircle, Bot, Twitter, Github, Linkedin, MessageCircle, Menu } from 'lucide-react';
import Image from 'next/image';
import WhatsOLogo from '@/components/logo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import React from 'react';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center px-4 md:px-6">
          <Link href="#" className="flex items-center justify-center mr-auto" prefetch={false}>
            <WhatsOLogo />
          </Link>
          <nav className="ml-auto hidden lg:flex gap-4 sm:gap-6">
              <Link href="#features" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
                  Features
              </Link>
              <Link href="#testimonials" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
                  Testimonials
              </Link>
              <Link href="#pricing" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
                  Pricing
              </Link>
          </nav>
          <div className="ml-4 hidden lg:flex items-center gap-2">
              <Button variant="ghost" asChild>
                  <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Link href="/signup">Get Started</Link>
              </Button>
          </div>
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden ml-auto">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle navigation menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left">
                <div className="p-4">
                    <Link href="#" className="mb-8 flex items-center" prefetch={false} onClick={() => setIsMenuOpen(false)}>
                        <WhatsOLogo />
                    </Link>
                    <nav className="grid gap-4">
                      <Link href="#features" className="text-lg font-medium" prefetch={false} onClick={() => setIsMenuOpen(false)}>
                          Features
                      </Link>
                      <Link href="#testimonials" className="text-lg font-medium" prefetch={false} onClick={() => setIsMenuOpen(false)}>
                          Testimonials
                      </Link>
                      <Link href="#pricing" className="text-lg font-medium" prefetch={false} onClick={() => setIsMenuOpen(false)}>
                          Pricing
                      </Link>
                    </nav>
                    <div className="mt-8 pt-4 border-t">
                       <div className="flex flex-col gap-2">
                         <Button variant="ghost" asChild>
                             <Link href="/login" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                         </Button>
                         <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                             <Link href="/signup" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
                         </Button>
                      </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_550px] lg:gap-12 xl:grid-cols-[1fr_650px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                    Automate WhatsApp, Elevate Your Business
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    WhatsO uses AI to turn your WhatsApp into a sales and support powerhouse. Engage customers 24/7, answer questions instantly, and never miss a lead.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href="/signup">
                      Try WhatsO Free
                    </Link>
                  </Button>
                   <Button asChild size="lg" variant="outline">
                    <Link href="#">
                      Book a Demo
                    </Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://picsum.photos/650/450"
                width="650"
                height="450"
                alt="Hero"
                data-ai-hint="abstract tech illustration"
                className="mx-auto aspect-[16/11] overflow-hidden rounded-xl object-cover"
              />
            </div>
          </div>
        </section>
        
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary font-medium">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                  Everything You Need to Succeed
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform is packed with features designed to make your customer interactions faster, smarter, and more profitable.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 py-12 sm:grid-cols-2 md:gap-12 lg:grid-cols-3">
              <div className="grid gap-2">
                 <Bot className="h-8 w-8 text-accent" />
                <h3 className="text-xl font-bold font-headline">AI-Powered Automation</h3>
                <p className="text-muted-foreground">
                  Let our smart AI handle routine queries, freeing your team to focus on high-value interactions.
                </p>
              </div>
              <div className="grid gap-2">
                <Zap className="h-8 w-8 text-accent" />
                <h3 className="text-xl font-bold font-headline">24/7 Instant Responses</h3>
                <p className="text-muted-foreground">
                  Provide immediate support around the clock, improving customer satisfaction and loyalty.
                </p>
              </div>
              <div className="grid gap-2">
                <Rocket className="h-8 w-8 text-accent" />
                <h3 className="text-xl font-bold font-headline">Boost Sales & Leads</h3>
                <p className="text-muted-foreground">
                  Engage potential customers, qualify leads, and guide them through the sales funnel automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Loved by Teams Worldwide</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    See how businesses are transforming their customer communication with WhatsO.
                </p>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 py-12 lg:grid-cols-2 lg:gap-12">
                <Card>
                    <CardContent className="p-6 flex flex-col items-start gap-4">
                        <p className="text-muted-foreground">"WhatsO has been a game-changer for our sales team. We've seen a 40% increase in qualified leads since implementing their AI chatbot. It's like having a new team member working 24/7."</p>
                        <div className="flex items-center gap-3">
                             <Image src="https://picsum.photos/seed/t1/40/40" width="40" height="40" alt="User" data-ai-hint="person face" className="rounded-full"/>
                             <div>
                                <p className="font-semibold">Sarah L.</p>
                                <p className="text-sm text-muted-foreground">Head of Sales, TechCorp</p>
                             </div>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardContent className="p-6 flex flex-col items-start gap-4">
                        <p className="text-muted-foreground">"Our customer support response times have gone from hours to seconds. The AI handles most common questions, and our customers love the instant help. I can't recommend WhatsO enough!"</p>
                         <div className="flex items-center gap-3">
                             <Image src="https://picsum.photos/seed/t2/40/40" width="40" height="40" alt="User" data-ai-hint="woman smiling" className="rounded-full"/>
                             <div>
                                <p className="font-semibold">Maria G.</p>
                                <p className="text-sm text-muted-foreground">Support Lead, eCom World</p>
                             </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
          </div>
        </section>

        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Simple, Transparent Pricing</h2>
                <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Choose the plan that's right for you.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-md items-start gap-8 py-12 lg:max-w-4xl lg:grid-cols-2">
              <Card className="border-accent ring-2 ring-accent">
                <CardHeader>
                  <CardTitle className="font-headline">Pro</CardTitle>
                  <CardDescription>For growing businesses that need more power and automation.</CardDescription>
                  <div className="flex items-baseline gap-2 pt-4">
                    <span className="text-4xl font-bold">$49</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle className="text-accent h-4 w-4"/>5,000 Conversations</li>
                        <li className="flex items-center gap-2"><CheckCircle className="text-accent h-4 w-4"/>Advanced AI Model</li>
                        <li className="flex items-center gap-2"><CheckCircle className="text-accent h-4 w-4"/>Custom AI Training</li>
                        <li className="flex items-center gap-2"><CheckCircle className="text-accent h-4 w-4"/>Webhook Integrations</li>
                        <li className="flex items-center gap-2"><CheckCircle className="text-accent h-4 w-4"/>Priority Support</li>
                    </ul>
                    <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                        <Link href="/signup">Get Started with Pro</Link>
                    </Button>
                </CardContent>
              </Card>
              <Card>
                 <CardHeader>
                  <CardTitle className="font-headline">Enterprise</CardTitle>
                  <CardDescription>Custom solutions for large teams with specific needs.</CardDescription>
                  <div className="flex items-baseline gap-2 pt-4">
                    <span className="text-4xl font-bold">Custom</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle className="text-primary h-4 w-4"/>Unlimited Conversations</li>
                        <li className="flex items-center gap-2"><CheckCircle className="text-primary h-4 w-4"/>Bespoke AI Models</li>
                        <li className="flex items-center gap-2"><CheckCircle className="text-primary h-4 w-4"/>Dedicated Infrastructure</li>
                        <li className="flex items-center gap-2"><CheckCircle className="text-primary h-4 w-4"/>SLA & Dedicated Support</li>
                        <li className="flex items-center gap-2"><CheckCircle className="text-primary h-4 w-4"/>Custom Integrations</li>
                    </ul>
                    <Button asChild className="w-full" variant="outline">
                        <Link href="#">Contact Sales</Link>
                    </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t">
          <div className="container px-4 md:px-6 py-8">
            <div className="grid gap-8 lg:grid-cols-3">
                <div className="space-y-2">
                    <WhatsOLogo/>
                    <p className="text-muted-foreground text-sm max-w-xs">The future of customer communication is here. Automate, engage, and grow with WhatsO.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <h4 className="font-semibold">Product</h4>
                        <ul className="space-y-1">
                            <li><Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link></li>
                             <li><Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link></li>
                              <li><Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign In</Link></li>
                        </ul>
                    </div>
                     <div className="space-y-2">
                        <h4 className="font-semibold">Company</h4>
                        <ul className="space-y-1">
                            <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground">About Us</Link></li>
                             <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Careers</Link></li>
                              <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link></li>
                        </ul>
                    </div>
                     <div className="space-y-2">
                        <h4 className="font-semibold">Legal</h4>
                        <ul className="space-y-1">
                            <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
                             <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>
                 <div className="flex lg:justify-end items-start">
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" asChild><Link href="#"><Twitter className="h-4 w-4"/></Link></Button>
                        <Button variant="ghost" size="icon" asChild><Link href="#"><Github className="h-4 w-4"/></Link></Button>
                        <Button variant="ghost" size="icon" asChild><Link href="#"><Linkedin className="h-4 w-4"/></Link></Button>
                    </div>
                </div>
            </div>
            <div className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} WhatsO. All rights reserved.
            </div>
          </div>
      </footer>
    </div>
  );
}
