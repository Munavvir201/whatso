
import * as admin from "firebase-admin";

// This is the recommended and most reliable pattern for initializing the Firebase Admin SDK.
// It uses a service account, which explicitly grants your application the necessary permissions.

let app: admin.app.App;

/**
 * Initializes the Firebase Admin SDK if it hasn't been already.
 * This "lazy initialization" pattern prevents build errors by ensuring
 * the SDK is only initialized when it's actually needed, at which point
 * environment variables will be available.
 */
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    // IMPORTANT: You must set these environment variables in your hosting environment.
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // The private key needs to have its newline characters properly formatted.
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    // Throw an error if the required environment variables are not set. This makes
    // debugging much easier than letting the SDK fail silently.
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Missing Firebase Admin SDK credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
      );
    }

    try {
      console.log('Initializing Firebase Admin SDK...');
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("Firebase Admin SDK initialized SUCCESSFULLY.");

    } catch (error: any) {
      console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
      console.error('!!! CRITICAL: FIREBASE ADMIN SDK INITIALIZATION FAILED !!!');
      console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
      console.error("Root Cause:", error.message);
      // Stop the process if initialization fails.
      throw new Error(`Firebase Admin SDK failed to initialize: ${error.message}`);
    }
  } else {
    app = admin.app();
  }
}

// Call the function to ensure the SDK is ready.
initializeFirebaseAdmin();

// Export the initialized services and other useful modules.
export const db = admin.firestore();
export const auth = admin.auth();
export const FieldValue = admin.firestore.FieldValue;

