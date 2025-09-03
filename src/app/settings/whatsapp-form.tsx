
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Copy, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
    phoneNumberId: z.string().min(1, { message: "Phone Number ID is required." }),
    accessToken: z.string().min(1, { message: "Access Token is required." }),
    webhookSecret: z.string().min(1, { message: "Webhook Secret is required." }),
});

type WhatsappFormData = z.infer<typeof formSchema>;

export function WhatsappForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<WhatsappFormData | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");

  const form = useForm<WhatsappFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phoneNumberId: "",
      accessToken: "",
      webhookSecret: "",
    },
  });

  useEffect(() => {
    async function fetchSettings() {
      if (!user) {
        setIsFetching(false);
        return;
      };

      if (window.location.origin) {
        setWebhookUrl(`${window.location.origin}/api/webhooks/whatsapp/${user.uid}`);
      }

      setIsFetching(true);
      const userSettingsRef = doc(db, "userSettings", user.uid);
      const docSnap = await getDoc(userSettingsRef);

      if (docSnap.exists() && docSnap.data().whatsapp) {
        const creds = docSnap.data().whatsapp as WhatsappFormData;
        setSavedCredentials(creds);
        form.reset(creds);
      } else {
        setIsEditing(true); // If no data, go straight to editing mode
      }
      setIsFetching(false);
    }

    fetchSettings();
  }, [user, form]);

  async function onSubmit(values: WhatsappFormData) {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to save settings.",
        });
        return;
    }

    setIsLoading(true);
    try {
        const userSettingsRef = doc(db, "userSettings", user.uid);
        await setDoc(userSettingsRef, { whatsapp: values }, { merge: true });

        toast({
            title: "Settings Saved!",
            description: "Your WhatsApp API credentials have been saved securely.",
        });
        setSavedCredentials(values);
        setIsEditing(false);

    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Error Saving Settings",
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
        setIsLoading(false);
    }
  }
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
        toast({ title: "Copied!", description: "Webhook URL copied to clipboard."});
    }, (err) => {
        toast({ variant: "destructive", title: "Failed to copy", description: "Could not copy URL to clipboard."});
    });
  }

  if (isFetching) {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-32" />
        </div>
    )
  }

  if (savedCredentials && !isEditing) {
    return (
        <div className="space-y-6">
            <div>
                <Label>Your Phone Number ID</Label>
                <p className="text-muted-foreground text-sm mt-1 font-mono bg-muted p-2 rounded-md">{savedCredentials.phoneNumberId}</p>
            </div>
             <div>
                <Label>Your Webhook URL</Label>
                 <div className="flex items-center space-x-2">
                    <Input readOnly value={webhookUrl} className="font-mono" />
                    <Button variant="outline" size="icon" onClick={copyToClipboard}><Copy className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Paste this in your Meta for Developers app webhook configuration.</p>
            </div>
            <Button onClick={() => setIsEditing(true)}>Edit Credentials</Button>
        </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {webhookUrl && (
             <div>
                <Label>Your Webhook URL</Label>
                 <div className="flex items-center space-x-2">
                    <Input readOnly value={webhookUrl} className="font-mono" />
                    <Button variant="outline" size="icon" onClick={copyToClipboard}><Copy className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Paste this in your Meta for Developers app webhook configuration.</p>
            </div>
        )}
        <FormField
          control={form.control}
          name="phoneNumberId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number ID</FormLabel>
              <FormControl>
                <Input placeholder="1029384756" {...field} />
              </FormControl>
              <FormDescription>
                The ID for the phone number you want to use.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="accessToken"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Access Token</FormLabel>
              <FormControl>
                <Input type="password" placeholder="EAAD..." {...field} />
              </FormControl>
               <FormDescription>
                Your permanent WhatsApp Business Platform access token.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="webhookSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Webhook Verify Token</FormLabel>
              <FormControl>
                <Input placeholder="Your secret token" {...field} />
              </FormControl>
               <FormDescription>
                A secret token of your choice to verify webhook requests.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
            <Button type="submit" disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Credentials
            </Button>
            {savedCredentials && (
                 <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            )}
        </div>
      </form>
    </Form>
  );
}

