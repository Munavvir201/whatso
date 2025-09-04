
import { Rocket } from "lucide-react";
import Link from "next/link";
import { SetupSteps } from "./setup-steps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


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
                <CardContent>
                    <SetupSteps />
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
