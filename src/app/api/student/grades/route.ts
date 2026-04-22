import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import QuizSubmission from '@/models/QuizSubmission';
import Assignment from '@/models/Assignment';
import Quiz from '@/models/Quiz';
import Course from '@/models/Course';
import Lesson from '@/models/Lesson';
import User from '@/models/User';
import { apiHandler } from '@/lib/apiHandler';

// Explicitly register models for population
const _models = { Assignment, Quiz, Lesson, Course, User };

export const GET = apiHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  const studentId = session.user.id;

  const [assignments, quizzes] = await Promise.all([
    AssignmentSubmission.find({ studentId })
        .populate({
            path: 'assignmentId',
            select: 'title'
        })
        .populate({
            path: 'courseId',
            select: 'title _id'
        })
        .sort('-submittedAt'),
    QuizSubmission.find({ studentId })
        .populate({
            path: 'quizId',
            select: 'title lessonId',
            populate: {
                path: 'lessonId',
                select: 'title'
            }
        })
        .sort('-submittedAt')
  ]);

  // Manually populate course info for quizzes because Quiz model doesn't have courseId directly
  // We need to fetch it from the Lesson -> Module -> Course chain or just populate it if we can
  const quizzesWithCourse = await Promise.all(quizzes.map(async (q: any) => {
      const quizData = await Quiz.findById(q.quizId?._id).populate({
          path: 'lessonId',
          populate: {
              path: 'moduleId',
              populate: {
                  path: 'courseId',
                  select: 'title'
              }
          }
      });
      return {
          ...q.toObject(),
          courseTitle: quizData?.lessonId?.moduleId?.courseId?.title || 'Unknown Course',
          lessonTitle: quizData?.lessonId?.title || 'Unknown Lesson'
      };
  }));

  // Stats
  const gradedAssignments = assignments.filter(a => a.finalGrade !== undefined);
  const avgAssignmentGrade = gradedAssignments.length > 0
    ? gradedAssignments.reduce((acc, curr) => acc + (curr.finalGrade || 0), 0) / gradedAssignments.length
    : 0;

  const avgQuizScore = quizzes.length > 0
    ? quizzes.reduce((acc, curr) => acc + ((curr.score / curr.totalQuestions) * 100), 0) / quizzes.length
    : 0;

  const assignmentPassRate = assignments.length > 0
    ? (assignments.filter(a => a.isPassing).length / assignments.length) * 100
    : 0;

  const quizPassRate = quizzes.length > 0
    ? (quizzes.filter(q => (q.score / q.totalQuestions) >= 0.6).length / quizzes.length) * 100
    : 0;

  return {
    assignments,
    quizzes: quizzesWithCourse,
    stats: {
      avgAssignmentGrade,
      avgQuizScore,
      assignmentPassRate,
      quizPassRate,
      assignmentsPassed: assignments.filter(a => a.isPassing).length,
      totalAssignments: assignments.length,
      quizzesPassed: quizzes.filter(q => (q.score / q.totalQuestions) >= 0.6).length,
      totalQuizzes: quizzes.length
    }
  };
});
