'use server';

export interface SimpleAIInput {
  message: string;
  conversationHistory: string;
  clientData?: string;
  userApiKey: string;
  userModel?: string;
}

export interface SimpleAIOutput {
  response: string;
}

export async function generateSimpleAIResponse(input: SimpleAIInput): Promise<SimpleAIOutput> {
  try {
    // Map the model name to a valid Google API model
    const modelMap: { [key: string]: string } = {
      'gemini-2.5-flash': 'gemini-2.0-flash',
      'gemini-2.5-pro': 'gemini-2.0-flash-exp',
      'gemini-pro': 'gemini-2.0-flash',
      'gemini-flash': 'gemini-2.0-flash',
      'gemini-1.5-pro': 'gemini-1.5-pro',
      'gemini-1.5-flash': 'gemini-1.5-flash',
      'gemini-2.0-flash': 'gemini-2.0-flash'
    };
    
    const rawModel = input.userModel?.replace('googleai/', '') || 'gemini-2.0-flash';
    const modelName = modelMap[rawModel] || 'gemini-2.0-flash';
    
    // Create the prompt
    const prompt = `You are a helpful AI sales agent for WhatsApp conversations.

Conversation History:
${input.conversationHistory}

Client Data:
${input.clientData || 'No client data provided.'}

Customer Message:
${input.message}

Please provide a friendly, helpful response that engages the customer and guides them towards learning more about our products/services. Keep it concise and professional.

Response:`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${input.userApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('🔴 Google AI API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        model: modelName,
        apiUrl: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`
      });
      throw new Error(`Google AI API error: ${response.status} ${response.statusText} - ${errorData}`);
    }
    
    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
    
    return { response: generatedText };
    
  } catch (error: any) {
    console.error('🔴 AI generation failed:', error.message);
    
    // Return a fallback response instead of throwing
    const fallbackResponse = `Thank you for your message! I'm here to help you with any questions about our products and services. How can I assist you today?`;
    
    return { response: fallbackResponse };
  }
}
