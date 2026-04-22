import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Course from '@/models/Course';
import Module from '@/models/Module';
import { apiHandler } from '@/lib/apiHandler';
import { z } from 'zod';

const moduleSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  order: z.number().default(0)
});

export const POST = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const body = await req.json();
  const data = moduleSchema.parse(body);

  await dbConnect();
  const course = await Course.findOne({ _id: params.id, tutorId: session.user.id });
  if (!course) throw { status: 404, message: 'Course not found' };

  const newModule = await Module.create({
    courseId: params.id,
    ...data
  });

  return newModule;
});
