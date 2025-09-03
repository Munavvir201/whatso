'use server';

/**
 * @fileOverview Automatically sends a personalized welcome message to new users.
 *
 * - sendWelcomeMessage - A function to send the welcome message.
 * - SendWelcomeMessageInput - The input type for the sendWelcomeMessage function.
 * - SendWelcomeMessageOutput - The return type for the sendWelcomeMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SendWelcomeMessageInputSchema = z.object({
  userName: z.string().describe('The name of the new user.'),
  serviceName: z.string().describe('The name of the service.'),
});
export type SendWelcomeMessageInput = z.infer<typeof SendWelcomeMessageInputSchema>;

const SendWelcomeMessageOutputSchema = z.object({
  welcomeMessage: z.string().describe('The personalized welcome message.'),
});
export type SendWelcomeMessageOutput = z.infer<typeof SendWelcomeMessageOutputSchema>;

export async function sendWelcomeMessage(input: SendWelcomeMessageInput): Promise<SendWelcomeMessageOutput> {
  return sendWelcomeMessageFlow(input);
}

const welcomeMessagePrompt = ai.definePrompt({
  name: 'welcomeMessagePrompt',
  input: {schema: SendWelcomeMessageInputSchema},
  output: {schema: SendWelcomeMessageOutputSchema},
  prompt: `Compose a personalized welcome message for a new user named {{userName}} joining our service, {{serviceName}}. The message should be friendly, engaging, and offer a brief overview of what the service provides.`,
});

const sendWelcomeMessageFlow = ai.defineFlow(
  {
    name: 'sendWelcomeMessageFlow',
    inputSchema: SendWelcomeMessageInputSchema,
    outputSchema: SendWelcomeMessageOutputSchema,
  },
  async input => {
    const {output} = await welcomeMessagePrompt(input);
    return output!;
  }
);
