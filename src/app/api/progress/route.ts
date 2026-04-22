import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Progress from '@/models/Progress';
import { apiHandler } from '@/lib/apiHandler';

export const POST = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  const { lessonId } = await req.json();
  await dbConnect();

  const progress = await Progress.findOneAndUpdate(
    { studentId: session.user.id, lessonId },
    { completed: true, completedAt: new Date() },
    { upsert: true, new: true }
  );

  return progress;
});
