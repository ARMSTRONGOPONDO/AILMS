import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import Course from '@/models/Course';
import { apiHandler } from '@/lib/apiHandler';

export const POST = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  const targetModule = await Module.findById(params.id);
  if (!targetModule) throw { status: 404, message: 'Module not found' };

  const course = await Course.findOne({ _id: targetModule.courseId, tutorId: session.user.id });
  if (!course) throw { status: 401, message: 'Unauthorized' };

  const data = await req.json();
  const lesson = await Lesson.create({
    moduleId: params.id,
    ...data
  });

  return lesson;
});
