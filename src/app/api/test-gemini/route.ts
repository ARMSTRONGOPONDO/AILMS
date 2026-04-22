import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  console.log('[TEST-GEMINI] Starting test...');
  console.log('[TEST-GEMINI] API Key present:', !!process.env.GEMINI_API_KEY);
  console.log('[TEST-GEMINI] API Key starts with:', process.env.GEMINI_API_KEY?.substring(0, 10));
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const testModelName = process.env.GEMINI_TEST_MODEL || process.env.GEMINI_GRADING_MODEL || 'gemini-flash-latest';
    const model = genAI.getGenerativeModel({ model: testModelName });
    
    console.log(`[TEST-GEMINI] Model initialized (${testModelName}), calling API...`);
    
    const result = await model.generateContent('Say "Hello" in exactly one word');
    const response = await result.response;
    const text = response.text();
    
    console.log('[TEST-GEMINI] Response:', text);
    
    return NextResponse.json({
      success: true,
      message: 'Gemini API is working!',
      response: text
    });
  } catch (error: any) {
    console.error('[TEST-GEMINI] ERROR:', error.message);
    console.error('[TEST-GEMINI] Full error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}
