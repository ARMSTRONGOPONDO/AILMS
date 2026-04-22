import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Progress from '@/models/Progress';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import { apiHandler } from '@/lib/apiHandler';
import mongoose from 'mongoose';

export const GET = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  if (!params.id || params.id === 'undefined' || !mongoose.Types.ObjectId.isValid(params.id)) {
    throw { status: 400, message: 'Invalid Course ID' };
  }

  await dbConnect();

  // Get all lessons for this course to calculate percentage
  const modules = await Module.find({ courseId: params.id });
  const moduleIds = modules.map(m => m._id);
  const lessons = await Lesson.find({ moduleId: { $in: moduleIds } });
  const lessonIds = lessons.map(l => l._id);

  // Get completed progress
  const completedProgress = await Progress.find({
    studentId: session.user.id,
    lessonId: { $in: lessonIds },
    completed: true
  });

  const totalLessons = lessons.length;
  const completedLessons = completedProgress.length;
  const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return {
    totalLessons,
    completedLessons,
    percentage,
    completedLessonIds: completedProgress.map(p => p.lessonId)
  };
});
