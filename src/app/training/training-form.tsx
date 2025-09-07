
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { trainAIWithClientData } from "@/ai/flows/train-ai-with-client-data";
import { useState, useEffect } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useTrainingContext } from "./training-context";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

const formSchema = z.object({
  clientData: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  trainingInstructions: z.string().min(20, {
    message: "Training instructions must be at least 20 characters.",
  }),
  chatFlow: z.string().optional(),
});

export function TrainingForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [trainingResult, setTrainingResult] = useState<string | null>(null);
  const { setClientData, setTrainingInstructions, setChatFlow } = useTrainingContext();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientData: "",
      websiteUrl: "",
      trainingInstructions: "Adopt a friendly and helpful tone. Prioritize sales-related queries. Never mention our competitors.",
      chatFlow: "1. Greet the user.\n2. Ask how you can help.\n3. If they ask about pricing, provide the link to the pricing page.\n4. If they want to book a demo, ask for their email address.",
    },
  });

  // Watch for changes and update the context
  const watchedClientData = form.watch("clientData");
  const watchedTrainingInstructions = form.watch("trainingInstructions");
  const watchedChatFlow = form.watch("chatFlow");

  useEffect(() => {
    setClientData(watchedClientData || "");
  }, [watchedClientData, setClientData]);
  
  useEffect(() => {
    setTrainingInstructions(watchedTrainingInstructions);
  }, [watchedTrainingInstructions, setTrainingInstructions]);
  
  useEffect(() => {
    setChatFlow(watchedChatFlow || "");
  }, [watchedChatFlow, setChatFlow]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to save training data.",
      });
      return;
    }

    setIsLoading(true);
    setTrainingResult(null);
    try {
      // Save training data to user settings
      const userSettingsRef = doc(db, "userSettings", user.uid);
      const trainingData = {
        clientData: values.clientData || "No text data provided.",
        trainingInstructions: values.trainingInstructions,
        chatFlow: values.chatFlow,
        lastUpdated: new Date().toISOString()
      };
      
      await setDoc(userSettingsRef, { trainingData }, { merge: true });
      
      // For now, we only use the text data. In a real app, you'd scrape the website.
      const result = await trainAIWithClientData({
          clientData: values.clientData || "No text data provided.",
          trainingInstructions: values.trainingInstructions,
          chatFlow: values.chatFlow
      });
      setTrainingResult(result.trainingSummary);
      toast({
        title: "Training Data Saved",
        description: "The AI model has been updated with your data and saved to your settings.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem with the training request.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col min-h-0">
          <Tabs defaultValue="text" className="flex-1 flex flex-col min-h-0">
             <TabsList>
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="website">Website</TabsTrigger>
                <TabsTrigger value="files" disabled>Files (Soon)</TabsTrigger>
             </TabsList>
             <TabsContent value="text" className="flex-1 flex flex-col min-h-0">
                <FormField
                    control={form.control}
                    name="clientData"
                    render={({ field }) => (
                    <FormItem className="flex-1 flex flex-col min-h-0 mt-4">
                        <FormLabel>Knowledge Base</FormLabel>
                        <FormDescription>
                        Paste in any text-based data like FAQs, product descriptions, or company info.
                        </FormDescription>
                        <FormControl className="flex-1">
                        <Textarea
                            placeholder="Paste your client-specific data here..."
                            className="min-h-[150px] flex-1"
                            {...field}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
             </TabsContent>
              <TabsContent value="website">
                <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                    <FormItem className="mt-4">
                        <FormLabel>Scrape Website</FormLabel>
                        <FormDescription>
                        Enter a URL to scrape the content for training data. (Note: This is a demo and does not actually scrape the site).
                        </FormDescription>
                        <FormControl>
                           <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
             </TabsContent>
             <TabsContent value="files">
                <div className="border-2 border-dashed rounded-lg p-12 text-center mt-4">
                    <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Drag and drop files</h3>
                    <p className="mt-1 text-sm text-muted-foreground">PDF, TXT, DOCX coming soon.</p>
                </div>
             </TabsContent>
          </Tabs>

          <div className="grid md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="trainingInstructions"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>AI Instructions</FormLabel>
                    <FormControl>
                    <Textarea
                        placeholder="E.g., 'Adopt a friendly and helpful tone...'"
                        className="min-h-[120px]"
                        {...field}
                    />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="chatFlow"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Chat Flow</FormLabel>
                    <FormControl>
                    <Textarea
                        placeholder="E.g., '1. Greet User. 2. Ask how you can help...'"
                        className="min-h-[120px]"
                        {...field}
                    />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>
          
          <div className="flex-shrink-0">
            <Button type="submit" disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Training Data
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
