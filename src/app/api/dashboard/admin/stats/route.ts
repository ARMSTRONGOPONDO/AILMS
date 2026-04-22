import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import { apiHandler } from '@/lib/apiHandler';

export const GET = apiHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();

  const [
    totalUsers,
    totalCourses,
    totalEnrollments,
    usersByRole,
    coursesByStatus,
    users,
    courses,
    suspendedCount
  ] = await Promise.all([
    User.countDocuments(),
    Course.countDocuments(),
    Enrollment.countDocuments(),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Course.aggregate([{ $group: { _id: '$isPublished', count: { $sum: 1 } } }]),
    User.find().select('-passwordHash').sort('-createdAt').limit(10),
    Course.find().populate('tutorId', 'name').sort('-createdAt').limit(10),
    User.countDocuments({ status: 'suspended' })
  ]);

  return {
    totalUsers,
    totalCourses,
    totalEnrollments,
    usersByRole,
    coursesByStatus,
    users,
    courses,
    suspendedCount
  };
});
