import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WelcomeMessageForm } from "./welcome-message-form";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { WhatsappForm } from "./whatsapp-form";
import { AiProviderForm } from "./ai/ai-provider-form";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-headline font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and automation settings.</p>
       </div>
      <Tabs defaultValue="ai" className="w-full">
        <TabsList>
          <TabsTrigger value="ai">AI Provider</TabsTrigger>
          <TabsTrigger value="welcome">Welcome Message</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="profile" disabled>Profile</TabsTrigger>
          <TabsTrigger value="billing" disabled>Billing</TabsTrigger>
          <TabsTrigger value="advanced" disabled>Advanced</TabsTrigger>
        </TabsList>
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">AI Provider Settings</CardTitle>
              <CardDescription>
                Connect your AI provider to power your chatbot.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <AiProviderForm />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="welcome">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Automated Welcome Message</CardTitle>
              <CardDescription>
                Customize the automated message sent to new users when they first interact with your service.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <WelcomeMessageForm />
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">WhatsApp API Settings</CardTitle>
              <CardDescription>
                Connect your WhatsApp Business Account to enable message automation.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <WhatsappForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
