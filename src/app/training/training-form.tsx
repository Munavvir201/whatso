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
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  clientData: z.string().min(100, {
    message: "Client data must be at least 100 characters.",
  }),
  trainingInstructions: z.string().min(20, {
    message: "Training instructions must be at least 20 characters.",
  }),
});

export function TrainingForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [trainingResult, setTrainingResult] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientData: "",
      trainingInstructions: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setTrainingResult(null);
    try {
      const result = await trainAIWithClientData(values);
      setTrainingResult(result.trainingSummary);
      toast({
        title: "Training Started",
        description: "The AI model has started training with your data.",
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
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="clientData"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Client Data</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Paste your client-specific data here. E.g., product descriptions, company info, FAQs..."
                    className="min-h-[200px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This is the knowledge base the AI will use to answer questions.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="trainingInstructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Training Instructions</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide specific instructions. E.g., 'Adopt a friendly and helpful tone. Prioritize sales-related queries. Never mention our competitors.'"
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Guide the AI on how to behave and what to focus on.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Training
          </Button>
        </form>
      </Form>
      {trainingResult && (
        <Card className="mt-8 bg-primary/5">
            <CardHeader>
                <CardTitle className="font-headline">Training Summary</CardTitle>
                <CardDescription>The AI model has been updated based on your input.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm">{trainingResult}</p>
            </CardContent>
        </Card>
      )}
    </>
  );
}
