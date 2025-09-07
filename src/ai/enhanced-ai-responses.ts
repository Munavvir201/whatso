'use server';

export interface EnhancedAIInput {
  message: string;
  conversationHistory: string;
  clientData?: string;
  userApiKey: string;
  userModel?: string;
  responseType?: 'auto' | 'greeting' | 'pricing' | 'product' | 'support' | 'closing';
}

export interface EnhancedAIOutput {
  response: string;
  category: string;
  confidence: number;
}

// Response templates for different scenarios
const RESPONSE_TEMPLATES = {
  greeting: `
You are responding to a new customer greeting. Be warm, professional, and immediately introduce your key services.
- Welcome them warmly
- Briefly mention your main services
- Ask how you can help them today
- Keep it under 100 characters
Example: "Hi! Welcome to [Business]. We provide [service]. How can I assist you today? 😊"
  `,
  
  pricing: `
You are providing pricing information. Be clear, transparent, and emphasize value.
- Give specific prices if available in client data
- Mention value proposition
- Offer to discuss their specific needs
- Include a call-to-action
Example: "Our [service] starts at $X. This includes [benefits]. Would you like to discuss your specific requirements?"
  `,
  
  product: `
You are explaining product/service features. Focus on benefits and value.
- Highlight key features and benefits
- Use bullet points if multiple features
- Connect features to customer needs
- Ask about their specific requirements
Example: "Our [product] offers: ✓ Feature 1 ✓ Feature 2 ✓ Feature 3. Which aspect interests you most?"
  `,
  
  support: `
You are providing customer support. Be helpful, understanding, and solution-focused.
- Acknowledge their concern
- Provide clear solution or next steps
- Offer additional help
- Maintain professional empathy
Example: "I understand your concern. Here's how we can resolve this: [solution]. Is there anything else I can help with?"
  `,
  
  closing: `
You are encouraging the customer to take action. Be persuasive but not pushy.
- Create urgency or scarcity if appropriate
- Summarize the value proposition
- Provide clear next steps
- Make it easy to move forward
Example: "Ready to get started? I can set up a quick call to discuss your needs. When works best for you?"
  `
};

// Fast response categorization based on keywords
function categorizeMessage(message: string, conversationHistory: string): 'greeting' | 'pricing' | 'product' | 'support' | 'closing' {
  const lowerMessage = message.toLowerCase();
  const lowerHistory = conversationHistory.toLowerCase();
  
  // Greeting indicators
  if (lowerHistory.includes('no previous conversation') || 
      lowerMessage.match(/\b(hi|hello|hey|good morning|good afternoon|good evening)\b/)) {
    return 'greeting';
  }
  
  // Pricing indicators  
  if (lowerMessage.match(/\b(price|cost|pricing|fee|rate|charge|expensive|cheap|budget|afford)\b/)) {
    return 'pricing';
  }
  
  // Product/service info indicators
  if (lowerMessage.match(/\b(what|how|feature|service|product|tell me|explain|describe|details)\b/)) {
    return 'product';
  }
  
  // Support indicators
  if (lowerMessage.match(/\b(problem|issue|help|support|wrong|error|fix|trouble)\b/)) {
    return 'support';
  }
  
  // Closing indicators
  if (lowerMessage.match(/\b(ready|interested|yes|buy|purchase|order|proceed|next step|sign up)\b/)) {
    return 'closing';
  }
  
  return 'product'; // Default to product info
}

export async function generateEnhancedAIResponse(input: EnhancedAIInput): Promise<EnhancedAIOutput> {
  try {
    // Fast categorization
    const detectedCategory = input.responseType === 'auto' 
      ? categorizeMessage(input.message, input.conversationHistory)
      : (input.responseType || 'product');

    // Use fastest model for speed optimization
    const modelMap: { [key: string]: string } = {
      'gemini-2.5-flash': 'gemini-2.0-flash',
      'gemini-2.5-pro': 'gemini-2.0-flash',  // Use flash for speed
      'gemini-pro': 'gemini-2.0-flash',
      'gemini-flash': 'gemini-2.0-flash',
      'gemini-1.5-pro': 'gemini-1.5-flash',  // Use flash version for speed
      'gemini-1.5-flash': 'gemini-1.5-flash',
      'gemini-2.0-flash': 'gemini-2.0-flash'
    };
    
    const rawModel = input.userModel?.replace('googleai/', '') || 'gemini-2.0-flash';
    const modelName = modelMap[rawModel] || 'gemini-2.0-flash';

    // Build optimized prompt with category-specific template
    const categoryTemplate = RESPONSE_TEMPLATES[detectedCategory];
    const prompt = `${categoryTemplate}

BUSINESS CONTEXT:
${input.clientData || 'Professional business services'}

CONVERSATION HISTORY:
${input.conversationHistory || 'New conversation'}

CUSTOMER MESSAGE:
${input.message}

INSTRUCTIONS:
- Respond professionally and concisely
- Use the conversation context
- Match the ${detectedCategory.toUpperCase()} response style
- Keep under 160 characters when possible
- End with a question or call-to-action

YOUR RESPONSE:`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${input.userApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 150,  // Limit for faster responses
          temperature: 0.7,      // Balanced creativity
          topP: 0.8,            // Focused responses
          topK: 10              // Faster processing
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      generateFallbackResponse(detectedCategory, input.clientData);

    return { 
      response: generatedText.trim(), 
      category: detectedCategory,
      confidence: 0.85 
    };

  } catch (error: any) {
    console.error('Enhanced AI generation failed:', error.message);
    
    // Intelligent fallback based on category
    const category = categorizeMessage(input.message, input.conversationHistory);
    return { 
      response: generateFallbackResponse(category, input.clientData),
      category: category,
      confidence: 0.6
    };
  }
}

// Smart fallback responses based on category
function generateFallbackResponse(category: string, clientData?: string): string {
  const businessName = clientData?.match(/business name:?\s*([^\n]+)/i)?.[1] || 'our business';
  
  const fallbacks = {
    greeting: `Hi! Welcome to ${businessName}! 👋 How can I assist you today?`,
    pricing: `I'd be happy to discuss our pricing with you! What specific service are you interested in?`,
    product: `Great question! Let me share details about our services. What would you like to know more about?`,
    support: `I'm here to help resolve any concerns you have. Can you tell me more about the issue?`,
    closing: `I'd love to help you get started! Would you like to schedule a quick call to discuss your needs?`
  };

  return fallbacks[category as keyof typeof fallbacks] || 
         `Thank you for your message! I'm here to help with any questions about ${businessName}. How can I assist you?`;
}

// High-speed response for common queries (instant responses)
export const INSTANT_RESPONSES = {
  'hi': 'Hi there! 👋 Welcome! How can I help you today?',
  'hello': 'Hello! Welcome to our service! What can I assist you with?',
  'hey': 'Hey! Great to hear from you! What brings you here today?',
  'thank you': 'You\'re very welcome! Is there anything else I can help you with?',
  'thanks': 'My pleasure! Feel free to reach out if you need anything else!',
  'yes': 'Excellent! Let\'s move forward. What would you like to know next?',
  'no': 'No problem at all! Is there something else I can help you with?',
  'ok': 'Perfect! What would you like to explore next?',
  'okay': 'Great! How else can I assist you today?'
};

// Check if message matches instant response patterns
export function getInstantResponse(message: string): string | null {
  const cleanMessage = message.toLowerCase().trim();
  return INSTANT_RESPONSES[cleanMessage] || null;
}
