'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface DirectAIInput {
  message: string;
  conversationHistory: string;
  clientData?: string;
  userApiKey: string;
  userModel?: string;
}

export interface DirectAIOutput {
  response: string;
}

export async function generateAIResponse(input: DirectAIInput): Promise<DirectAIOutput> {
  try {
    console.log('🤖 Initializing Google AI with user API key...');
    
    // Initialize the Google AI client with user's API key
    const genAI = new GoogleGenerativeAI(input.userApiKey);
    
    // Get the model (default to gemini-pro if not specified)
    const modelName = input.userModel?.replace('googleai/', '') || 'gemini-pro';
    const model = genAI.getGenerativeModel({ model: modelName });
    
    console.log(`🤖 Using model: ${modelName}`);
    
    // Create the prompt
    const prompt = `You are an AI sales agent for WhatsApp conversations. Your goal is to engage customers effectively and guide them towards making a purchase.

**Conversation History:**
${input.conversationHistory}

**Client Data:**
${input.clientData || 'No client data provided.'}

**Customer Message:**
${input.message}

**Instructions:**
- Be friendly, helpful, and professional
- Use conversation history for context
- Ask clarifying questions when needed
- Keep responses concise and engaging
- Guide the conversation towards a sale

**Your Response:`;

    console.log('🤖 Generating response...');
    
    // Generate the response
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    console.log(`✅ AI response generated: "${text.substring(0, 100)}..."`);
    
    return { response: text };
    
  } catch (error: any) {
    console.error('🔴 AI generation failed:', error);
    console.error('🔴 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    throw new Error(`AI generation failed: ${error.message}`);
  }
}
