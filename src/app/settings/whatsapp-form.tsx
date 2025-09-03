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
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

const formSchema = z.object({
    phoneNumberId: z.string().min(1, { message: "Phone Number ID is required." }),
    accessToken: z.string().min(1, { message: "Access Token is required." }),
    webhookSecret: z.string().min(1, { message: "Webhook Secret is required." }),
});

export function WhatsappForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phoneNumberId: "",
      accessToken: "",
      webhookSecret: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
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
        // Create a reference to the user's specific settings document
        const userSettingsRef = doc(db, "userSettings", user.uid);

        // Save the WhatsApp credentials to this document
        await setDoc(userSettingsRef, { 
            whatsapp: values 
        }, { merge: true });

        toast({
            title: "Settings Saved!",
            description: "Your WhatsApp API credentials have been saved securely.",
        });

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
        <Button type="submit" disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Credentials
        </Button>
      </form>
    </Form>
  );
}
