import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import Notification from '@/models/Notification';
import { apiHandler } from '@/lib/apiHandler';

export const POST = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  const course = await Course.findOne({ _id: params.id, tutorId: session.user.id });
  if (!course) throw { status: 404, message: 'Course not found' };

  course.isPublished = !course.isPublished;
  await course.save();

  // If newly published, notify enrolled students
  if (course.isPublished) {
    try {
      const enrollments = await Enrollment.find({ courseId: params.id });
      const studentIds = enrollments.map(e => e.studentId);
      
      if (studentIds.length > 0) {
        const notifications = studentIds.map(studentId => ({
          userId: studentId,
          type: 'course_update',
          message: `"${course.title}" has new content`
        }));
        await Notification.insertMany(notifications);
      }
    } catch (notifError) {
      console.error('Failed to send notifications:', notifError);
    }
  }

  return course;
});
