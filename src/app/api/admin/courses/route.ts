import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import Quiz from '@/models/Quiz';
import { apiHandler } from '@/lib/apiHandler';

export const GET = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'all';

  await dbConnect();

  const query: any = {};
  if (status === 'published') query.isPublished = true;
  if (status === 'draft') query.isPublished = false;

  const courses = await Course.find(query)
    .populate('tutorId', 'name')
    .sort('-createdAt');

  // Enhance with enrollment counts
  const coursesWithStats = await Promise.all(courses.map(async (course) => {
    const enrollCount = await Enrollment.countDocuments({ courseId: course._id });
    return {
      ...course.toObject(),
      enrollmentCount: enrollCount
    };
  }));

  const stats = {
    totalPublished: await Course.countDocuments({ isPublished: true }),
    totalDraft: await Course.countDocuments({ isPublished: false }),
    totalEnrollments: await Enrollment.countDocuments()
  };

  return {
    courses: coursesWithStats,
    stats
  };
});
