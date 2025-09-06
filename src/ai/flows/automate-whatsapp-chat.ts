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
  prompt: `You are an AI sales agent responsible for automating WhatsApp conversations. Your primary objective is to engage potential customers effectively, answer their questions, and guide them towards making a purchase.

To ensure your responses are relevant and personalized, you will be provided with the following information:

- **Conversation History**: A log of the previous messages exchanged between you and the user. Use this to understand the context of the conversation and avoid repeating information.
- **Client Data**: Additional information about the client and their interests, which can be used to tailor your responses.
- **Incoming Message**: The latest message from the user that you need to respond to.

**Instructions:**

1.  **Analyze the incoming message**: Carefully read and understand the user's message to determine their intent and sentiment.
2.  **Leverage conversation history**: Refer to the previous messages to maintain context and provide a coherent response. Do not repeat questions you have already asked.
3.  **Utilize client data**: If available, use the client-specific data to personalize your responses and make them more relevant to the user's needs.
4.  **Drive the conversation forward**: Your responses should be engaging and encourage the user to continue the conversation. Ask clarifying questions when necessary and guide the user towards the next step in the sales process.
5.  **Be concise and clear**: Keep your responses brief and easy to understand. Avoid jargon and overly technical terms.
6.  **Maintain a professional and friendly tone**: Your tone should be warm, approachable, and professional at all times.

**Conversation History:**
{{conversationHistory}}

**Client Data:**
{{#if clientData}}
{{clientData}}
{{else}}
No client data provided.
{{/if}}

**Incoming Message:**
{{message}}

**Your Response:**
`,
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
