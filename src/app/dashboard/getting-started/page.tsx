import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Bot, KeyRound, BrainCircuit, ChevronRight } from "lucide-react";
import Link from "next/link";

const setupSteps = [
    {
        icon: KeyRound,
        title: "Connect WhatsApp API",
        description: "Link your WhatsApp Business account to start automating conversations.",
        href: "/settings/whatsapp",
        cta: "Connect",
    },
    {
        icon: Bot,
        title: "Configure Your AI",
        description: "Add your AI provider API key to bring your chatbot to life.",
        href: "/settings",
        cta: "Configure",
    },
    {
        icon: BrainCircuit,
        title: "Train Your Model",
        description: "Upload documents or website links to train the AI on your specific business.",
        href: "/training",
        cta: "Start Training",
    }
]

export default function GettingStartedPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <Rocket className="mx-auto h-12 w-12 text-primary" />
                <h1 className="text-3xl font-bold font-headline mt-4">Welcome to WhatsO!</h1>
                <p className="mt-2 text-muted-foreground">Let's get your AI-powered chat up and running in just a few minutes.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Your Setup Checklist</CardTitle>
                    <CardDescription>Follow these steps to complete your initial configuration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {setupSteps.map((step, index) => (
                        <div key={index} className="flex items-center p-4 border rounded-lg gap-4">
                            <div className="bg-primary/10 text-primary p-3 rounded-full">
                                <step.icon className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold">{step.title}</h3>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                            </div>
                            <Button asChild variant="ghost">
                                <Link href={step.href}>
                                    {step.cta} <ChevronRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="text-center">
                <Button variant="outline" asChild>
                    <Link href="/dashboard/chat">Skip for now, I'll explore first</Link>
                </Button>
            </div>
        </div>
    )
}
