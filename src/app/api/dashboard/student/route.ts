import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Enrollment from '@/models/Enrollment';
import Progress from '@/models/Progress';
import QuizSubmission from '@/models/QuizSubmission';
import Course from '@/models/Course';
import User from '@/models/User';
import Quiz from '@/models/Quiz';
import Lesson from '@/models/Lesson';
import mongoose from 'mongoose';
import { apiHandler } from '@/lib/apiHandler';

// Explicitly register models for population
const _models = { Quiz, Lesson, Course, User };

export const GET = apiHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  const studentId = new mongoose.Types.ObjectId(session.user.id);

  const [
    enrolledCount,
    completedLessonsCount,
    avgQuizScore,
    recentEnrollments,
    recentQuizResults
  ] = await Promise.all([
    Enrollment.countDocuments({ studentId }),
    Progress.countDocuments({ studentId, completed: true }),
    QuizSubmission.aggregate([
      { $match: { studentId } },
      { $group: { _id: null, avg: { $avg: { $divide: ["$score", "$totalQuestions"] } } } }
    ]),
    Enrollment.find({ studentId })
      .populate({
        path: 'courseId',
        populate: { path: 'tutorId', select: 'name' }
      })
      .sort('-updatedAt')
      .limit(3),
    QuizSubmission.find({ studentId })
      .populate({
          path: 'quizId',
          select: 'title lessonId'
      })
      .sort('-submittedAt')
      .limit(5)
  ]);

  return {
    enrolledCount,
    completedLessonsCount,
    avgQuizScore: avgQuizScore[0]?.avg * 100 || 0,
    recentEnrollments,
    recentQuizResults
  };
});
