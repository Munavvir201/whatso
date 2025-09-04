
'use client'

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from "@/components/ui/button";
import { KeyRound, Bot, BrainCircuit, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from '@/components/ui/skeleton';

const setupStepsConfig = [
    {
        id: 'whatsapp',
        icon: KeyRound,
        title: "Connect WhatsApp API",
        description: "Link your WhatsApp Business account to start automating conversations.",
        href: "/settings/whatsapp",
        cta: "Connect",
        completedCta: "Connected",
    },
    {
        id: 'ai',
        icon: Bot,
        title: "Configure Your AI",
        description: "Add your AI provider API key to bring your chatbot to life.",
        href: "/settings",
        cta: "Configure",
        completedCta: "Configured",

    },
    {
        id: 'training',
        icon: BrainCircuit,
        title: "Train Your Model",
        description: "Upload documents or website links to train the AI on your specific business.",
        href: "/training",
        cta: "Start Training",
        completedCta: "Trained",
    }
]

export function SetupSteps() {
    const { user } = useAuth();
    const [setupStatus, setSetupStatus] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchStatus() {
            if (!user) { 
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            const userSettingsRef = doc(db, "userSettings", user.uid);
            const docSnap = await getDoc(userSettingsRef);
            const data = docSnap.data();

            const status: Record<string, boolean> = {};
            if (data?.whatsapp?.status === 'verified') {
                status.whatsapp = true;
            }
            // TODO: Add checks for other setup steps once implemented

            setSetupStatus(status);
            setIsLoading(false);
        }

        fetchStatus();
    }, [user]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                    <div key={index} className="flex items-center p-4 border rounded-lg gap-4">
                       <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                           <Skeleton className="h-4 w-1/3" />
                           <Skeleton className="h-4 w-2/3" />
                        </div>
                        <Skeleton className="h-10 w-24" />
                    </div>
                ))}
            </div>
        )
    }


    return (
        <div className="space-y-4">
            {setupStepsConfig.map((step) => {
                const isCompleted = setupStatus[step.id] || false;
                return (
                    <div key={step.id} className="flex items-center p-4 border rounded-lg gap-4">
                        <div className={`p-3 rounded-full ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                            <step.icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold">{step.title}</h3>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                        <Button asChild variant={isCompleted ? "secondary" : "ghost"} disabled={isCompleted}>
                            <Link href={step.href}>
                                {isCompleted ? (
                                    <><CheckCircle2 className="mr-2 h-4 w-4"/> {step.completedCta}</>
                                ) : (
                                    <>{step.cta} <ChevronRight className="ml-2 h-4 w-4" /></>
                                )}
                            </Link>
                        </Button>
                    </div>
                )
            })}
        </div>
    )

}