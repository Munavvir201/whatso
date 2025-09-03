import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WhatsappForm } from "../whatsapp-form";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
    </div>
  );
}
