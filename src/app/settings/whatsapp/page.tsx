import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WhatsappForm } from "../whatsapp-form";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const guideSteps = [
    {
        title: "Step 1: Go to Your Meta for Developers App",
        content: "Navigate to the Meta for Developers portal and select the app you're using for the WhatsApp Business API. If you haven't created one, you'll need to do that first.",
        link: "https://developers.facebook.com/apps/"
    },
    {
        title: "Step 2: Find Your Phone Number ID",
        content: "In your app's dashboard, go to the 'WhatsApp' section from the sidebar. Under the 'API Setup' tab, you will see your Phone Number ID. Copy this value.",
    },
    {
        title: "Step 3: Generate a Permanent Access Token",
        content: "The temporary token expires in 24 hours. For production, you must generate a permanent token. Go to 'Business Settings' -> 'Users' -> 'System Users'. Add or select a System User, grant them 'Admin' access, and generate a new token with the 'whatsapp_business_messaging' and 'whatsapp_business_management' permissions. Copy this token securely.",
    },
    {
        title: "Step 4: Create a Webhook Verify Token",
        content: "This is a secret password you create yourself. It can be any random, strong string of text (e.g., 'super-secret-token-123'). You will enter this same token here and in the Meta dashboard in the next step.",
    },
    {
        title: "Step 5: Configure Your Webhook",
        content: "In the 'WhatsApp' -> 'API Setup' section, find the 'Webhooks' configuration. Click 'Edit' and paste the webhook URL provided by WhatsO. Then, paste the 'Webhook Verify Token' you just created in the step above. Subscribe to the 'messages' field.",
        link: "https://developers.facebook.com/docs/whatsapp/cloud-api/guides/configure-webhooks"
    }
]

export default function WhatsappSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard/getting-started">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Checklist
            </Link>
        </Button>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Connect WhatsApp API</CardTitle>
          <CardDescription>
            Enter your WhatsApp Business API credentials below. You can find these in your Meta for Developers dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsappForm />
        </CardContent>
      </Card>

       <Card className="mt-6">
        <CardHeader>
            <CardTitle className="font-headline">Setup Guide</CardTitle>
            <CardDescription>Follow these steps to find your credentials.</CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full">
               {guideSteps.map((step, index) => (
                 <AccordionItem value={`item-${index + 1}`} key={index}>
                    <AccordionTrigger className="text-left font-semibold">
                        {step.title}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2">
                        <p className="text-muted-foreground">{step.content}</p>
                        {step.link && (
                             <Button variant="link" asChild className="p-0 h-auto">
                                <a href={step.link} target="_blank" rel="noopener noreferrer">
                                    Go to Meta Docs <ExternalLink className="ml-2 h-3 w-3" />
                                </a>
                            </Button>
                        )}
                    </AccordionContent>
                </AccordionItem>
               ))}
            </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
