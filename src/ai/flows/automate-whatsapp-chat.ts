// This file is machine-generated - edit with caution!
'use server';
/**
 * @fileOverview A WhatsApp chat automation AI agent for sales.
 *
 * - automateWhatsAppChat - A function that automates WhatsApp chats for sales.
 * - AutomateWhatsAppChatInput - The input type for the automateWhatsAppChat function.
 * - AutomateWhatsAppChatOutput - The return type for the automateWhatsAppChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutomateWhatsAppChatInputSchema = z.object({
  message: z.string().describe('The incoming message from the user.'),
  conversationHistory: z
    .string()
    .describe('The history of the conversation so far.'),
  clientData: z
    .string()
    .optional()
    .describe('Client-specific data to improve response relevance.'),
});
export type AutomateWhatsAppChatInput = z.infer<typeof AutomateWhatsAppChatInputSchema>;

const AutomateWhatsAppChatOutputSchema = z.object({
  response: z.string().describe('The AI-generated response to the user.'),
});
export type AutomateWhatsAppChatOutput = z.infer<typeof AutomateWhatsAppChatOutputSchema>;

export async function automateWhatsAppChat(
  input: AutomateWhatsAppChatInput
): Promise<AutomateWhatsAppChatOutput> {
  return automateWhatsAppChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'automateWhatsAppChatPrompt',
  input: {schema: AutomateWhatsAppChatInputSchema},
  output: {schema: AutomateWhatsAppChatOutputSchema},
  prompt: `You are an AI sales agent automating WhatsApp chats.

  Your goal is to efficiently handle customer inquiries and drive sales.
  Use the conversation history and client data to provide relevant and accurate responses.

  Conversation History:
  {{conversationHistory}}

  Client Data:
  {{#if clientData}}
  {{clientData}}
  {{else}}
  No client data provided.
  {{/if}}

  Incoming Message:
  {{message}}

  Response:
  `, // Provide a space after Response: for the AI to generate the response
});

const automateWhatsAppChatFlow = ai.defineFlow(
  {
    name: 'automateWhatsAppChatFlow',
    inputSchema: AutomateWhatsAppChatInputSchema,
    outputSchema: AutomateWhatsAppChatOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
