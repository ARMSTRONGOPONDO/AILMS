import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import ChatSession from '@/models/ChatSession';
import { apiHandler } from '@/lib/apiHandler';

export const GET = apiHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  await dbConnect();
  const sessions = await ChatSession.find({ studentId: session.user.id })
    .populate({ path: 'courseId', select: 'title' })
    .sort('-updatedAt');

  return sessions;
});
