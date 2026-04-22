import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { apiHandler } from '@/lib/apiHandler';

export const POST = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  let body;
  try {
    body = await req.json();
  } catch (e) {
    throw { status: 400, message: 'Invalid or empty request body' };
  }

  const { courseId } = body;
  await dbConnect();

  const course = await Course.findById(courseId);
  if (!course || !course.isPublished) {
    throw { status: 404, message: 'Course not found or not published' };
  }

  const existing = await Enrollment.findOne({
    studentId: session.user.id,
    courseId,
  });

  if (existing) throw { status: 400, message: 'Already enrolled' };

  const enrollment = await Enrollment.create({
    studentId: session.user.id,
    courseId,
  });

  try {
    await Notification.create({
      userId: course.tutorId,
      type: 'enrollment',
      message: `A new student enrolled in "${course.title}"`
    });
  } catch (notifError) {
    console.error('Failed to send notification:', notifError);
  }

  return enrollment;
});

export const GET = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  await dbConnect();
  try {
    const enrollments = await Enrollment.find({ studentId: session.user.id })
      .populate({
        path: 'courseId',
        populate: { path: 'tutorId', select: 'name avatar' }
      })
      .sort('-enrolledAt');

    return enrollments;
  } catch (err) {
    console.error('Enrollment Fetch Error:', err);
    throw err;
  }
});
