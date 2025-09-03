
import * as admin from 'firebase-admin';

// This file is used for server-side operations, like in API routes.
// It uses the Firebase Admin SDK, which requires service account credentials.

// Important: Your service account credentials should be set as an environment
// variable in your hosting environment (e.g., GOOGLE_APPLICATION_CREDENTIALS).
// They should not be hard-coded in the source code.

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
