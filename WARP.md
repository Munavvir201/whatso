# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common Development Commands

### Development Server
```bash
# Start development server with Turbopack
npm run dev

# Start Genkit development server for AI flows
npm run genkit:dev

# Start Genkit with watch mode for development
npm run genkit:watch
```

### Building and Deployment
```bash
# Type check the project
npm run typecheck

# Build for production
npm run build

# Build for Cloudflare deployment
npm run build:cloudflare

# Preview Cloudflare build locally
npm run preview

# Deploy to Cloudflare Pages
npm run deploy
```

### Linting and Quality
```bash
# Run ESLint
npm run lint

# Check for security vulnerabilities
npm audit
```

### Testing Webhooks
```bash
# Test webhook functionality (local development server must be running)
node test-webhook.js

# Debug webhook with more verbose output
node test-webhook-debug.js
```

## High-Level Architecture

### Core Application
**WhatsO** is a Next.js 15 application that provides AI-powered WhatsApp chat automation. The application enables businesses to automate WhatsApp conversations using configurable AI models (primarily Google's Gemini) while maintaining full manual override capabilities.

### Key Architectural Components

#### 1. Firebase Integration (Dual Setup)
- **Client-side Firebase** (`src/lib/firebase.ts`): Handles user authentication and real-time UI updates
- **Server-side Firebase Admin** (`src/lib/firebase-admin.ts`): Manages server-side operations, user settings, conversation storage
- **Data Structure**: `userSettings/{userId}/conversations/{phoneNumber}/messages/{messageId}`

#### 2. AI Processing Pipeline
- **Genkit Framework** (`src/ai/genkit.ts`): Primary AI orchestration using Google AI
- **Simple AI Fallback** (`src/ai/simple-ai.ts`): Direct Google AI API calls when Genkit fails
- **AI Flows** (`src/ai/flows/`): Structured AI conversation management with context awareness
- **Model Support**: Configurable Gemini models with user-specific API keys

#### 3. WhatsApp Integration
- **Webhook Handler** (`src/app/api/webhooks/whatsapp/[userId]/route.ts`): Processes incoming WhatsApp messages
- **WhatsApp Library** (`src/lib/whatsapp.ts`): Handles message sending, media downloads, credential management
- **Real-time Processing**: Asynchronous message processing with immediate webhook response (Meta requirement)

#### 4. Multi-Platform Deployment
- **Firebase Hosting**: Primary deployment platform
- **Cloudflare Pages**: Alternative deployment with specialized build process
- **Development**: Local development with webhook testing capabilities

### Data Flow Architecture

1. **Incoming Messages**: WhatsApp → Webhook → Firebase Storage → AI Processing → Response Generation → WhatsApp Send
2. **User Interface**: React components → Firebase Auth → Real-time Firestore listeners → Chat UI updates
3. **AI Training**: User uploads training data → Stored in Firestore → Integrated into AI prompts → Context-aware responses

### Key Configuration Requirements

#### Environment Variables (Production)
```bash
# Firebase Client (NEXT_PUBLIC_*)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Server
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# AI (Optional - fallback provided)
GOOGLE_GENERATIVE_AI_API_KEY=
```

#### User Settings Schema (Firestore)
```typescript
{
  whatsapp: {
    phoneNumberId: string,
    accessToken: string,
    webhookSecret: string,
    status: 'verified' | 'pending'
  },
  ai: {
    apiKey: string,
    model: string,
    status: 'verified' | 'pending'
  },
  trainingData: {
    clientData: string,
    trainingInstructions: string,
    chatFlow: string
  }
}
```

## Development Patterns

### AI Response Generation
The application uses a two-tier AI system:
1. **Primary**: Genkit-based flows with structured prompts and schemas
2. **Fallback**: Direct Google AI API calls for reliability

### Webhook Processing
- Immediate 200 response to Meta (required within 20 seconds)
- Asynchronous message processing in background
- Automatic media download and base64 encoding
- Context-aware conversation history retrieval

### Error Handling Philosophy
- Never fail webhooks (always return 200 to Meta)
- Graceful AI fallbacks with helpful error messages
- Comprehensive logging for debugging
- User-friendly error states in UI

### Component Architecture
- **shadcn/ui**: Base component system
- **Tailwind CSS**: Styling with custom chat-specific color scheme
- **React Hook Form + Zod**: Form validation
- **Custom hooks**: `use-auth.tsx` for authentication state

## Project-Specific Rules

### WhatsApp API Integration
- All webhook endpoints must respond within 20 seconds
- Media messages require asynchronous processing
- User credentials are stored per-user in Firestore
- Phone numbers are used as conversation identifiers

### AI Model Configuration
- Support for multiple Gemini model variants
- User-specific API keys take precedence over global keys
- Training data is integrated into conversation context
- Conversation history limited to last 10 messages for performance

### Firebase Security
- Admin SDK initialization is lazy-loaded to prevent build errors
- Environment validation with clear error messages
- Separate client/server Firebase configurations

### Development Testing
- Extensive API testing endpoints in `/api/` for debugging
- Webhook simulation tools for local development
- Test scripts for end-to-end webhook validation

### Deployment Targets
- Primary: Firebase Hosting with App Hosting
- Secondary: Cloudflare Pages with `@cloudflare/next-on-pages`
- Build configuration handles platform-specific optimizations
