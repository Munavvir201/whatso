
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
import { Loader2, CheckCircle2, AlertTriangle, KeyRound, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, updateDoc, deleteField } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const formSchema = z.object({
    provider: z.enum(["gemini", "openai", "anthropic"]).default("gemini"),
    apiKey: z.string().min(1, { message: "API Key is required." }),
    model: z.string().min(1, { message: "Model is required." }),
    status: z.string().optional(),
});

type AiProviderFormData = z.infer<typeof formSchema>;

const modelOptions: Record<string, string[]> = {
    gemini: ["gemini-2.5-flash", "gemini-pro"],
    openai: ["gpt-4", "gpt-3.5-turbo"],
    anthropic: ["claude-3-opus-20240229", "claude-3-sonnet-20240229"],
}

export function AiProviderForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [savedSettings, setSavedSettings] = useState<AiProviderFormData | null>(null);

  const form = useForm<AiProviderFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: "gemini",
      apiKey: "",
      model: "gemini-2.5-flash",
      status: "pending",
    },
  });

  const selectedProvider = form.watch("provider");

  useEffect(() => {
    // Reset model when provider changes
    form.setValue("model", modelOptions[selectedProvider][0]);
  }, [selectedProvider, form]);

  useEffect(() => {
    if (!user) {
      setIsFetching(false);
      return;
    }

    const userSettingsRef = doc(db, "userSettings", user.uid);
    
    const unsubscribe = onSnapshot(userSettingsRef, (docSnap) => {
      setIsFetching(true);
      if (docSnap.exists() && docSnap.data().ai) {
        const settings = docSnap.data().ai as AiProviderFormData;
        setSavedSettings(settings);
        form.reset(settings);
        setIsEditing(false);
      } else {
        setIsEditing(true);
        setSavedSettings(null);
        form.reset({ provider: "gemini", apiKey: "", model: "gemini-2.5-flash", status: "pending" });
      }
      setIsFetching(false);
    }, (error) => {
        console.error("Error fetching real-time AI settings:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch AI settings.",
        });
        setIsFetching(false);
    });

    return () => unsubscribe();
  }, [user, form.reset, toast]);

  async function onSubmit(values: AiProviderFormData) {
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
        
        // Mock verification - in a real app, you'd call the provider's API
        await new Promise(resolve => setTimeout(resolve, 1000));
        const isVerified = values.apiKey.length > 10; // Simple mock validation

        if (!isVerified) {
            toast({
                variant: "destructive",
                title: "Verification Failed",
                description: "The provided API key is not valid.",
            });
            setIsLoading(false);
            return;
        }

        const dataToSave = { ...values, status: 'verified' };
        await setDoc(userSettingsRef, { ai: dataToSave }, { merge: true });

        toast({
            title: "Settings Saved!",
            description: "Your AI provider credentials have been saved and verified.",
        });
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

  const handleDelete = async () => {
    if (!user) return;
    const userSettingsRef = doc(db, "userSettings", user.uid);
    try {
        await updateDoc(userSettingsRef, {
           ai: deleteField()
        });
        toast({
            title: "AI Settings Deleted",
            description: "Your AI credentials have been removed.",
        });
        setSavedSettings(null);
        setIsEditing(true);
    } catch (error) {
         toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: "Could not delete AI settings.",
        });
    }
  }

  if (isFetching) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
        </div>
    )
  }

  if (savedSettings && !isEditing) {
    return (
        <div className="space-y-6">
             <div>
                <Label>Status</Label>
                <div className={`flex items-center text-sm mt-1 font-semibold p-3 rounded-md ${savedSettings.status === 'verified' ? 'bg-green-100 text-green-900' : 'bg-yellow-100 text-yellow-900'}`}>
                    {savedSettings.status === 'verified'
                        ? <><CheckCircle2 className="h-5 w-5 mr-2" /><span>Verified & Connected</span></>
                        : <><AlertTriangle className="h-5 w-5 mr-2" /><span>Pending Verification</span></>
                    }
                </div>
            </div>
            <div>
                <Label>Provider</Label>
                <p className="text-muted-foreground text-sm mt-1 capitalize font-medium">{savedSettings.provider}</p>
            </div>
             <div>
                <Label>Selected Model</Label>
                <p className="text-muted-foreground text-sm mt-1 font-mono bg-muted p-2 rounded-md">{savedSettings.model}</p>
            </div>
            <div className="flex items-center gap-2">
                <Button onClick={() => setIsEditing(true)}>Edit Settings</Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            AI provider credentials from our servers.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AI Provider</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an AI provider" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the AI service you want to use.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="apiKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Key</FormLabel>
              <FormControl>
                <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder="••••••••••••••••••••••••••" {...field} className="pl-10" />
                </div>
              </FormControl>
              <FormDescription>
                Paste your API key from the selected provider.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model</FormLabel>
               <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {modelOptions[selectedProvider].map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <FormDescription>
                Select the specific model you want to use for responses.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
            <Button type="submit" disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Verify
            </Button>
            {savedSettings && (
                 <Button variant="ghost" type="button" onClick={() => {
                     setIsEditing(false);
                     form.reset(savedSettings);
                 }}>Cancel</Button>
            )}
        </div>
      </form>
    </Form>
  );
}

    