
import { TrainingForm } from './training-form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { TestChat } from './test-chat';
import { TrainingProvider } from './training-context';

export default function TrainingPage() {
  return (
    <TrainingProvider>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Custom Model Training</CardTitle>
              <CardDescription>
                Train the AI on your data. Provide documents, website links, or text to build its knowledge base. Then, test your changes in the chat on the right.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              <TrainingForm />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 flex flex-col min-h-0">
           <Card className="flex-1 flex flex-col min-h-0">
             <CardHeader>
                <CardTitle className="font-headline">Test Your AI</CardTitle>
                <CardDescription>Interact with the AI to see how it responds with your new training data.</CardDescription>
             </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
                <TestChat />
            </CardContent>
          </Card>
        </div>
      </div>
    </TrainingProvider>
  );
}
