import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Enrollment from '@/models/Enrollment';
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

  // Check enrollment
  const isEnrolled = await Enrollment.findOne({
    courseId: params.id,
    studentId: session.user.id
  });

  if (!isEnrolled) throw { status: 403, message: 'Not enrolled in this course' };

  const modules = await Module.find({ courseId: params.id }).sort('order');
  const modulesWithLessons = await Promise.all(
    modules.map(async (mod) => {
      const lessons = await Lesson.find({ moduleId: mod._id }).sort('order');
      return { ...mod.toObject(), lessons };
    })
  );

  return modulesWithLessons;
});
