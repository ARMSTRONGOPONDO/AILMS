import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import ChatSession from '@/models/ChatSession';
import { geminiModel } from '@/lib/gemini';
import { apiHandler } from '@/lib/apiHandler';

export const POST = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  const { message, courseId } = await req.json();
  await dbConnect();

  // Find or create session
  let chatSession = await ChatSession.findOne({
    studentId: session.user.id,
    courseId: courseId || null
  });

  if (!chatSession) {
    chatSession = new ChatSession({
      studentId: session.user.id,
      courseId: courseId || null,
      messages: []
    });
  }

  // Add user message
  const userMessageContent = message;
  chatSession.messages.push({
    role: 'user',
    content: userMessageContent,
    timestamp: new Date()
  });

  // Prepare history for Gemini: must be alternating user/model
  const history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  
  // We filter previous messages (excluding the one we just added)
  const previousMessages = chatSession.messages.slice(0, -1);
  let lastRole: 'user' | 'model' | '' = '';

  for (const msg of previousMessages) {
    const currentRole: 'user' | 'model' = msg.role === 'user' ? 'user' : 'model';
    // Only push if it alternates
    if (currentRole !== lastRole) {
      history.push({
        role: currentRole,
        parts: [{ text: msg.content }],
      });
      lastRole = currentRole;
    }
  }

  // Gemini startChat history MUST end with a 'model' message if history is not empty
  if (history.length > 0 && history[history.length - 1].role !== 'model') {
    history.pop();
  }

  const chat = geminiModel.startChat({
    history: history,
  });

  const result = await chat.sendMessage(userMessageContent);
  const response = await result.response;
  const aiText = response.text();

  // Add AI response
  chatSession.messages.push({
    role: 'assistant',
    content: aiText,
    timestamp: new Date()
  });

  await chatSession.save();

  return { 
    role: 'assistant', 
    content: aiText,
    sessionId: chatSession._id 
  };
});

export const GET = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');

  await dbConnect();
  const chatSession = await ChatSession.findOne({
    studentId: session.user.id,
    courseId: courseId || null
  });

  return chatSession || { messages: [] };
});
