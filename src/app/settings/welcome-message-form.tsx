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
import { sendWelcomeMessage } from "@/ai/flows/automated-welcome-message";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  serviceName: z.string().min(2, {
    message: "Service name must be at least 2 characters.",
  }),
});

export function WelcomeMessageForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>("Welcome to [Your Service]! We're excited to have you here. How can we help you today?");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceName: "WhatsO",
    },
  });

  async function onPreview(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setPreview(null);
    try {
      const result = await sendWelcomeMessage({ ...values, userName: "[User Name]"});
      setPreview(result.welcomeMessage);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not generate a preview.",
      });
      setPreview("Failed to generate preview.");
    } finally {
      setIsLoading(false);
    }
  }

  function onSave() {
    toast({
        title: "Settings Saved!",
        description: "Your new welcome message has been saved.",
    })
  }

  return (
    <div className="space-y-8">
        <Form {...form}>
            <form className="space-y-4">
            <FormField
                control={form.control}
                name="serviceName"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl>
                    <Input placeholder="Your awesome service" {...field} />
                    </FormControl>
                    <FormDescription>
                    This is the name of your service that will appear in the welcome message.
                    </FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
            </form>
        </Form>
        <div>
            <h4 className="font-medium mb-2">Message Preview</h4>
            <div className="rounded-md border bg-muted p-4 min-h-[100px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic">
                        {preview}
                    </p>
                )}
            </div>
        </div>
        <div className="flex gap-2">
            <Button onClick={form.handleSubmit(onPreview)} disabled={isLoading} variant="outline">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Preview
            </Button>
            <Button onClick={onSave} className="bg-accent hover:bg-accent/90 text-accent-foreground">Save Changes</Button>
        </div>
    </div>
  );
}
