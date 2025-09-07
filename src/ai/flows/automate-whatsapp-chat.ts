'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'genkit';

export interface AutomateWhatsAppChatInput {
  message: string;
  conversationHistory: string;
  clientData?: string;
  userApiKey: string;
  userModel?: string;
}

export interface AutomateWhatsAppChatOutput {
  response: string;
}

export async function automateWhatsAppChat(
  input: AutomateWhatsAppChatInput
): Promise<AutomateWhatsAppChatOutput> {
  try {
    console.log('🤖 Creating AI instance with user API key...');
    
    const modelName = input.userModel || 'gemini-pro';
    const googleAIPlugin = googleAI({ apiKey: input.userApiKey });
    const userAI = genkit({
      plugins: [googleAIPlugin],
      model: `googleai/${modelName}`,
    });
    
    console.log(`🤖 AI instance created with model: ${modelName}`);
    
    // Create the prompt schema
    const inputSchema = z.object({
      message: z.string(),
      conversationHistory: z.string(),
      clientData: z.string().optional(),
    });
    
    const outputSchema = z.object({
      response: z.string(),
    });
    
    // Define the prompt
    const prompt = userAI.definePrompt({
      name: 'whatsappChatPrompt',
      input: { schema: inputSchema },
      output: { schema: outputSchema },
      prompt: `You are an AI sales agent for WhatsApp conversations. Your goal is to engage customers effectively and guide them towards making a purchase.

**Conversation History:**
{{conversationHistory}}

**Client Data:**
{{#if clientData}}
{{clientData}}
{{else}}
No client data provided.
{{/if}}

**Customer Message:**
{{message}}

**Instructions:**
- Be friendly, helpful, and professional
- Use conversation history for context
- Ask clarifying questions when needed
- Keep responses concise and engaging
- Guide the conversation towards a sale

**Your Response:**`,
    });
    
    console.log('🤖 Generating AI response...');
    
    const result = await prompt({
      message: input.message,
      conversationHistory: input.conversationHistory,
      clientData: input.clientData || 'No client data provided',
    });
    
    console.log('✅ AI response generated successfully');
    
    return { response: result.output!.response };
    
  } catch (error: any) {
    console.error('🔴 AI generation failed:', error);
    throw new Error(`AI generation failed: ${error.message}`);
  }
}
