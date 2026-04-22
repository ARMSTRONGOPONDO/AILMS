import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import { apiHandler } from '@/lib/apiHandler';

export const GET = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  await dbConnect();
  const course = await Course.findById(params.id).populate('tutorId', 'name avatar');
  if (!course) throw { status: 404, message: 'Course not found' };

  const modules = await Module.find({ courseId: params.id }).sort('order');
  const modulesWithLessons = await Promise.all(
    modules.map(async (mod) => {
      const lessons = await Lesson.find({ moduleId: mod._id }).sort('order');
      return { ...mod.toObject(), lessons };
    })
  );

  return { course, modules: modulesWithLessons };
});

export const PUT = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const data = await req.json();
  await dbConnect();

  const course = await Course.findOneAndUpdate(
    { _id: params.id, tutorId: session.user.id },
    data,
    { new: true }
  );

  if (!course) throw { status: 404, message: 'Course not found or unauthorized' };
  return course;
});

export const DELETE = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  const course = await Course.findOneAndDelete({ _id: params.id, tutorId: session.user.id });
  if (!course) throw { status: 404, message: 'Course not found or unauthorized' };

  const modules = await Module.find({ courseId: params.id });
  for (const mod of modules) {
    await Lesson.deleteMany({ moduleId: mod._id });
  }
  await Module.deleteMany({ courseId: params.id });

  return { success: true };
});
