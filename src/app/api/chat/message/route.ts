import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import ChatSession from '@/models/ChatSession';
import Course from '@/models/Course';
import Lesson from '@/models/Lesson';
import { apiHandler } from '@/lib/apiHandler';
import { callAI } from '@/lib/ai/callWithFallback';

// Simple delay helper
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const POST = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const { message, courseId, sessionId, lessonId } = await req.json();
  await dbConnect();

  // 1-second delay for stability
  await delay(1000);

  let chatSession;
  if (sessionId) {
    chatSession = await ChatSession.findById(sessionId);
  }

  if (!chatSession) {
    chatSession = new ChatSession({
      studentId: session.user.id,
      courseId: courseId || null,
      messages: []
    });
  }

  // Context from course and lesson
  let lessonContext = '';
  if (lessonId) {
    const lesson = await Lesson.findById(lessonId).select('title contentText');
    if (lesson?.contentText) {
      lessonContext = `
The student is currently studying this lesson: "${lesson.title}"
Here is the lesson content they are working from:
---
${lesson.contentText}
---
Answer their questions based on this material. If their question is outside this material, you can still help generally but note that it's beyond the current lesson.`;
    }
  }

  let courseTitle = '';
  if (courseId && !lessonId) {
    const course = await Course.findById(courseId);
    courseTitle = course ? course.title : '';
  }

  const systemPrompt = `You are an academic AI tutor for Pwani University students. You help students understand course material, clarify concepts, and guide them step by step. You are encouraging, clear, and educational. Never do assignments for students — guide them to the answer instead. ${courseTitle ? `The student is currently studying: ${courseTitle}.` : ''} ${lessonContext}`;

  try {
    const history = chatSession.messages.slice(-10).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const result = await callAI(
      { systemPrompt, userMessage: message, history, maxTokens: 800 },
      'chat'
    );

    if (!result.success) {
      throw new Error(result.error || 'AI call failed');
    }

    const aiText = result.response;

    // Save user message
    chatSession.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Save AI response
    chatSession.messages.push({
      role: 'assistant',
      content: aiText,
      timestamp: new Date()
    });

    await chatSession.save();

    return { 
      reply: aiText, 
      sessionId: chatSession._id 
    };
  } catch (error: any) {
    if (error?.status === 429) {
      throw { status: 429, message: 'AI service is busy. Please try again in a moment.' };
    }
    throw error;
  }
});
