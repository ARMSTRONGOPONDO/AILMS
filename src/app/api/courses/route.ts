import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Course from '@/models/Course';
import User from '@/models/User';
import { apiHandler } from '@/lib/apiHandler';
import { z } from 'zod';

const courseSchema = z.object({
  title: z.string().min(3, 'Title is too short'),
  description: z.string().min(10, 'Description is too short'),
  category: z.string(),
  thumbnail: z.string().url().optional().or(z.literal('')),
});

export const POST = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const body = await req.json();
  const data = courseSchema.parse(body);
  
  await dbConnect();

  const course = await Course.create({
    ...data,
    tutorId: session.user.id,
  });

  return course;
});

export const GET = apiHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const tutorId = searchParams.get('tutorId');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 12;
  const skip = (page - 1) * limit;
  
  await dbConnect();
  
  let query: any = { isPublished: true };
  if (tutorId) {
    query = { tutorId };
  }

  const [courses, total] = await Promise.all([
    Course.find(query)
      .populate('tutorId', 'name avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Course.countDocuments(query)
  ]);

  return {
    courses,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  };
});
