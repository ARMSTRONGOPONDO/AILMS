import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Quiz from '@/models/Quiz';
import Enrollment from '@/models/Enrollment';
import Lesson from '@/models/Lesson';
import Module from '@/models/Module';
import { apiHandler } from '@/lib/apiHandler';

export const GET = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  await dbConnect();
  const quiz = await Quiz.findById(params.id);
  if (!quiz) throw { status: 404, message: 'Quiz not found' };

  // Check enrollment if student
  if (session.user.role === 'student') {
    const lesson = await Lesson.findById(quiz.lessonId);
    const targetModule = await Module.findById(lesson?.moduleId);
    const isEnrolled = await Enrollment.findOne({
      studentId: session.user.id,
      courseId: targetModule?.courseId
    });
    if (!isEnrolled) throw { status: 403, message: 'Access denied' };
  }

  return quiz;
});
