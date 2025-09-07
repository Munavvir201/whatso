import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Use the environment variable or fallback
const getApiKey = () => process.env.GOOGLE_GENERATIVE_AI_API_KEY || 'AIzaSyAdrA35VXMLrh4BcWY4RogyAMxN8qwz3vA';

export const ai = genkit({
  plugins: [googleAI({ apiKey: getApiKey() })],
  model: 'googleai/gemini-2.0-flash-exp',
});
