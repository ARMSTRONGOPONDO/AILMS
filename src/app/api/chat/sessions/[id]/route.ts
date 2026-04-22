import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import ChatSession from '@/models/ChatSession';
import { apiHandler } from '@/lib/apiHandler';

export const GET = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  await dbConnect();
  const chatSession = await ChatSession.findOne({ _id: params.id, studentId: session.user.id })
    .populate({ path: 'courseId', select: 'title' });
  if (!chatSession) throw { status: 404, message: 'Not found' };

  return chatSession;
});

export const DELETE = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  await dbConnect();
  await ChatSession.findOneAndDelete({ _id: params.id, studentId: session.user.id });

  return { success: true };
});
