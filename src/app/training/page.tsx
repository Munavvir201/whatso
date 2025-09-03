import { TrainingForm } from './training-form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function TrainingPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Custom Model Training</CardTitle>
          <CardDescription>
            Train the AI model with your client-specific data to improve response relevance and accuracy. Provide comprehensive text data and clear instructions on tone, style, and topics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingForm />
        </CardContent>
      </Card>
    </div>
  );
}
