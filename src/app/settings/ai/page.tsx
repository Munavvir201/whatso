import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AiProviderForm } from "./ai-provider-form";

export default function AiSettingsPage() {
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
          <CardTitle className="font-headline text-2xl">Configure AI Provider</CardTitle>
          <CardDescription>
            Select your AI provider, enter your API key, and choose a model to power your chatbot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AiProviderForm />
        </CardContent>
      </Card>
    </div>
  );
}
