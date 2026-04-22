import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import Quiz from '@/models/Quiz';
import QuizSubmission from '@/models/QuizSubmission';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import User from '@/models/User';
import mongoose from 'mongoose';
import { apiHandler } from '@/lib/apiHandler';

// Explicitly register models for population
const _models = { Quiz, Lesson, Course, User, Module };

export const GET = apiHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  const tutorId = new mongoose.Types.ObjectId(session.user.id);

  // Get all courses by this tutor
  const tutorCourses = await Course.find({ tutorId });
  const courseIds = tutorCourses.map(c => c._id);

  // Get all modules and lessons to find quizzes
  const modules = await Module.find({ courseId: { $in: courseIds } });
  const moduleIds = modules.map(m => m._id);
  const lessons = await Lesson.find({ moduleId: { $in: moduleIds } });
  const lessonIds = lessons.map(l => l._id);
  const quizzes = await Quiz.find({ lessonId: { $in: lessonIds } });
  const quizIds = quizzes.map(q => q._id);

  const [
    totalStudents,
    totalQuizzes,
    avgClassScore,
    recentActivity,
    atRiskStudents
  ] = await Promise.all([
    Enrollment.countDocuments({ courseId: { $in: courseIds } }),
    Quiz.countDocuments({ lessonId: { $in: lessonIds } }),
    QuizSubmission.aggregate([
      { $match: { quizId: { $in: quizIds } } },
      { $group: { _id: null, avg: { $avg: { $divide: ["$score", "$totalQuestions"] } } } }
    ]),
    QuizSubmission.find({ quizId: { $in: quizIds } })
      .populate('studentId', 'name')
      .populate({
          path: 'quizId',
          select: 'title'
      })
      .sort('-submittedAt')
      .limit(10),
    QuizSubmission.aggregate([
      { $match: { quizId: { $in: quizIds } } },
      { $group: { 
          _id: '$studentId', 
          avgScore: { $avg: { $divide: ["$score", "$totalQuestions"] } },
          submissions: { $push: '$$ROOT' }
        } 
      },
      { $match: { avgScore: { $lt: 0.4 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' }
    ])
  ]);

  return {
    totalCourses: tutorCourses.length,
    totalStudents,
    totalQuizzes,
    avgClassScore: avgClassScore[0]?.avg * 100 || 0,
    recentActivity,
    atRiskStudents
  };
});
