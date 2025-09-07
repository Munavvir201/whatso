import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const userId = "iAcgFJStySc2hQVQ7LvCboz2Wl02";
        
        console.log('🧪 Testing training data save...');
        
        const testTrainingData = {
            clientData: "We are a premium coffee company selling high-quality beans",
            trainingInstructions: "Be friendly and helpful. Focus on coffee quality and customer satisfaction.",
            chatFlow: "1. Greet warmly\n2. Ask about coffee preferences\n3. Recommend products\n4. Close the sale",
            lastUpdated: new Date().toISOString()
        };
        
        console.log('💾 Saving training data:', testTrainingData);
        
        const userSettingsRef = doc(db, "userSettings", userId);
        await setDoc(userSettingsRef, { trainingData: testTrainingData }, { merge: true });
        
        console.log('✅ Training data saved successfully');
        
        return NextResponse.json({
            success: true,
            message: "Training data saved successfully",
            savedData: testTrainingData
        });
        
    } catch (error: any) {
        console.error('❌ Training data save failed:', error);
        
        return NextResponse.json({
            success: false,
            error: {
                message: error.message,
                name: error.name,
                stack: error.stack
            }
        }, { status: 500 });
    }
}
