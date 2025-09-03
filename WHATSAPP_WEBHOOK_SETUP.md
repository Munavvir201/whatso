# WhatsApp Webhook Setup Guide

This guide explains how to configure and use the WhatsApp Cloud API webhook endpoints in your application.

## Overview

The webhook implementation provides two endpoints:

1. **GET** `/api/webhooks/whatsapp/[userId]` - For webhook verification
2. **POST** `/api/webhooks/whatsapp/[userId]` - For receiving incoming messages

## Webhook Verification (GET Endpoint)

When Meta sends a verification request, the endpoint:

1. Extracts query parameters: `hub.mode`, `hub.verify_token`, `hub.challenge`
2. Validates that `hub.mode` equals `"subscribe"`
3. Checks that `hub.verify_token` matches the user's stored webhook secret
4. Returns the `hub.challenge` value with HTTP 200 if valid
5. Returns HTTP 403 if the token doesn't match

### Example Verification Request

```
GET /api/webhooks/whatsapp/user123?hub.mode=subscribe&hub.verify_token=my_secret_token&hub.challenge=test123
```

**Response (Success):**
```
Status: 200
Content-Type: text/plain
Body: test123
```

**Response (Invalid Token):**
```
Status: 403
Content-Type: application/json
Body: {"error": "Verification token mismatch"}
```

## Message Handling (POST Endpoint)

When Meta sends incoming messages, the endpoint:

1. Logs the complete webhook body for debugging
2. Validates the payload structure
3. Returns HTTP 200 quickly (as required by Meta)
4. Processes the message asynchronously in the background

### Example Message Payload

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "123456789",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "15551234567",
          "phone_number_id": "123456789"
        },
        "messages": [{
          "from": "15551234567",
          "id": "wamid.test123",
          "timestamp": "1234567890",
          "text": {
            "body": "Hello, this is a test message!"
          },
          "type": "text"
        }]
      },
      "field": "messages"
    }]
  }]
}
```

## Configuration

### 1. User Settings

Each user must configure their WhatsApp credentials in the database:

```javascript
// Firestore document: userSettings/{userId}
{
  whatsapp: {
    phoneNumberId: "123456789",
    accessToken: "EAAD...",
    webhookSecret: "my_secret_token"
  }
}
```

### 2. Meta for Developers Setup

1. Go to your Meta for Developers app
2. Navigate to WhatsApp → API Setup
3. Configure webhook:
   - **Webhook URL**: `https://yourdomain.com/api/webhooks/whatsapp/{userId}`
   - **Verify Token**: The same value as `webhookSecret` in user settings
   - **Webhook Fields**: Subscribe to `messages`

### 3. Environment Variables

Ensure these Firebase environment variables are set:

```bash
# Client-side (for user authentication)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Server-side (for Firebase Admin SDK)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
# OR set the service account key as an environment variable
```

## Testing

### Using the Test Script

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Run the test script:
   ```bash
   node test-webhook.js
   ```

The test script will:
- Test webhook verification with valid token
- Test webhook verification with invalid token
- Test message handling with sample payload

### Manual Testing

#### Test Verification Endpoint

```bash
curl "http://localhost:9002/api/webhooks/whatsapp/test-user?hub.mode=subscribe&hub.verify_token=my_secret_token&hub.challenge=test123"
```

Expected response: `test123` with status 200

#### Test Message Endpoint

```bash
curl -X POST "http://localhost:9002/api/webhooks/whatsapp/test-user" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "123456789",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "15551234567",
            "phone_number_id": "123456789"
          },
          "messages": [{
            "from": "15551234567",
            "id": "wamid.test123",
            "timestamp": "1234567890",
            "text": {
              "body": "Hello, this is a test message!"
            },
            "type": "text"
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

Expected response: `{"status":"ok"}` with status 200

## Error Handling

### Common Issues

1. **403 Forbidden**: Webhook verification token mismatch
   - Check that the token in Meta matches the user's `webhookSecret`

2. **404 Not Found**: User settings not found
   - Ensure the user has configured their WhatsApp credentials

3. **500 Internal Server Error**: Firebase connection issues
   - Check Firebase Admin SDK configuration
   - Verify service account credentials

### Debugging

The webhook logs all incoming requests and errors. Check your server logs for:

- Webhook verification attempts
- Incoming message payloads
- Processing errors
- AI response generation

## Security Considerations

1. **Webhook Secret**: Use a strong, unique secret for each user
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Consider implementing rate limiting for webhook endpoints
4. **Input Validation**: The webhook validates payload structure before processing

## Production Deployment

1. **Environment Variables**: Set all required environment variables
2. **Firebase Admin SDK**: Configure service account credentials
3. **HTTPS**: Ensure your domain has a valid SSL certificate
4. **Monitoring**: Set up logging and monitoring for webhook endpoints
5. **Error Handling**: Implement proper error handling and alerting

## API Reference

### GET `/api/webhooks/whatsapp/[userId]`

**Query Parameters:**
- `hub.mode` (required): Must be "subscribe"
- `hub.verify_token` (required): User's webhook secret
- `hub.challenge` (required): Challenge string from Meta

**Responses:**
- `200`: Returns the challenge string
- `400`: Invalid verification request
- `403`: Token mismatch
- `404`: User not found
- `500`: Internal server error

### POST `/api/webhooks/whatsapp/[userId]`

**Request Body:** WhatsApp webhook payload (JSON)

**Responses:**
- `200`: Message received and processed
- `500`: Processing error

**Note:** The endpoint returns 200 quickly and processes messages asynchronously to meet Meta's requirements.
