'use server';
/**
 * @fileOverview Trains the AI model with client-specific data to improve response accuracy and relevance.
 *
 * - trainAIWithClientData - A function that trains the AI model using client-specific data.
 * - TrainAIWithClientDataInput - The input type for the trainAIWithClientData function.
 * - TrainAIWithClientDataOutput - The return type for the trainAIWithClientData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TrainAIWithClientDataInputSchema = z.object({
  clientData: z
    .string()
    .describe(
      'Client-specific data to train the AI model.  This should be comprehensive and well-formatted text data.'
    ),
  trainingInstructions: z
    .string()
    .describe(
      'Specific instructions on how to use the client data to improve the AI model responses. This should include the desired tone, style, and topics to focus on.'
    ),
  chatFlow: z
    .string()
    .optional()
    .describe('Instructions on how the conversation should flow.'),
});

export type TrainAIWithClientDataInput = z.infer<
  typeof TrainAIWithClientDataInputSchema
>;

const TrainAIWithClientDataOutputSchema = z.object({
  trainingSummary: z
    .string()
    .describe(
      'A summary of the training process and the expected improvements to the AI model responses.'
    ),
});

export type TrainAIWithClientDataOutput = z.infer<
  typeof TrainAIWithClientDataOutputSchema
>;

export async function trainAIWithClientData(
  input: TrainAIWithClientDataInput
): Promise<TrainAIWithClientDataOutput> {
  return trainAIWithClientDataFlow(input);
}

const trainAIWithClientDataPrompt = ai.definePrompt({
  name: 'trainAIWithClientDataPrompt',
  input: {schema: TrainAIWithClientDataInputSchema},
  output: {schema: TrainAIWithClientDataOutputSchema},
  prompt: `You are an AI model trainer.  Your goal is to take the provided client data and training instructions and use them to improve the AI model responses.

Client Data: {{{clientData}}}

Training Instructions: {{{trainingInstructions}}}

{{#if chatFlow}}
Chat Flow:
{{{chatFlow}}}
{{/if}}

Create a summary of the training process and the expected improvements to the AI model responses.

Summary: `,
});

const trainAIWithClientDataFlow = ai.defineFlow(
  {
    name: 'trainAIWithClientDataFlow',
    inputSchema: TrainAIWithClientDataInputSchema,
    outputSchema: TrainAIWithClientDataOutputSchema,
  },
  async input => {
    const {output} = await trainAIWithClientDataPrompt(input);
    return output!;
  }
);
