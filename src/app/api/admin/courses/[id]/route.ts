import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import Quiz from '@/models/Quiz';
import Enrollment from '@/models/Enrollment';
import { apiHandler } from '@/lib/apiHandler';

export const PUT = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const { isPublished } = await req.json();
  await dbConnect();

  const course = await Course.findByIdAndUpdate(params.id, { isPublished }, { new: true });
  if (!course) throw { status: 404, message: 'Course not found' };

  return course;
});

export const DELETE = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  
  // Find all modules
  const modules = await Module.find({ courseId: params.id });
  const moduleIds = modules.map(m => m._id);

  // Find all lessons
  const lessons = await Lesson.find({ moduleId: { $in: moduleIds } });
  const lessonIds = lessons.map(l => l._id);

  // Hard delete everything
  await Promise.all([
    Quiz.deleteMany({ lessonId: { $in: lessonIds } }),
    Lesson.deleteMany({ moduleId: { $in: moduleIds } }),
    Module.deleteMany({ courseId: params.id }),
    Enrollment.deleteMany({ courseId: params.id }),
    Course.findByIdAndDelete(params.id)
  ]);

  return { success: true };
});
