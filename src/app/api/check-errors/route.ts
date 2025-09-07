import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const errors = [];
    const checks = [];
    
    try {
        // Check 1: Environment variables
        const requiredEnvVars = [
            'NEXT_PUBLIC_FIREBASE_API_KEY',
            'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
            'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
            'FIREBASE_PROJECT_ID',
            'FIREBASE_CLIENT_EMAIL',
            'FIREBASE_PRIVATE_KEY'
        ];
        
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                errors.push(`Missing environment variable: ${envVar}`);
            } else {
                checks.push(`✅ ${envVar}: Set (length: ${process.env[envVar]?.length})`);
            }
        }
        
        // Check 2: Firebase Admin SDK
        try {
            const { db } = await import('@/lib/firebase-admin');
            checks.push('✅ Firebase Admin SDK: Imported successfully');
            
            // Test database connection
            const testDoc = await db.collection('test').doc('health').get();
            checks.push('✅ Firestore: Connection successful');
        } catch (firebaseError: any) {
            errors.push(`Firebase Admin SDK Error: ${firebaseError.message}`);
        }
        
        // Check 3: AI Module
        try {
            const { generateSimpleAIResponse } = await import('@/ai/simple-ai');
            checks.push('✅ AI Module: Imported successfully');
        } catch (aiError: any) {
            errors.push(`AI Module Error: ${aiError.message}`);
        }
        
        // Check 4: WhatsApp Module
        try {
            const { getWhatsAppCredentials } = await import('@/lib/whatsapp');
            checks.push('✅ WhatsApp Module: Imported successfully');
        } catch (whatsappError: any) {
            errors.push(`WhatsApp Module Error: ${whatsappError.message}`);
        }
        
        // Check 5: Dependencies
        const criticalDeps = ['axios', 'genkit', 'firebase-admin', 'firebase'];
        for (const dep of criticalDeps) {
            try {
                require.resolve(dep);
                checks.push(`✅ Dependency ${dep}: Found`);
            } catch (depError) {
                errors.push(`Missing dependency: ${dep}`);
            }
        }
        
    } catch (generalError: any) {
        errors.push(`General Error: ${generalError.message}`);
    }
    
    const hasErrors = errors.length > 0;
    
    return NextResponse.json({
        status: hasErrors ? 'ERROR' : 'OK',
        errorCount: errors.length,
        checkCount: checks.length,
        errors: errors,
        checks: checks,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
}
