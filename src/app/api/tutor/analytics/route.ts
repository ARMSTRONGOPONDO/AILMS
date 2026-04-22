import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import QuizSubmission from '@/models/QuizSubmission';
import Progress from '@/models/Progress';
import Lesson from '@/models/Lesson';
import Module from '@/models/Module';
import Quiz from '@/models/Quiz';
import mongoose from 'mongoose';
import { apiHandler } from '@/lib/apiHandler';

export const GET = apiHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  const tutorId = new mongoose.Types.ObjectId(session.user.id);

  // 1. Get tutor's courses
  const tutorCourses = await Course.find({ tutorId });
  
  const analytics = await Promise.all(tutorCourses.map(async (course) => {
    const courseId = course._id;

    // Student count
    const studentCount = await Enrollment.countDocuments({ courseId });

    // Completion rate
    const modules = await Module.find({ courseId });
    const moduleIds = modules.map(m => m._id);
    const lessons = await Lesson.find({ moduleId: { $in: moduleIds } });
    const lessonIds = lessons.map(l => l._id);
    const totalLessons = lessons.length;

    const allProgress = await Progress.find({ lessonId: { $in: lessonIds } });
    // Avg completion: sum(student_completed / total_lessons) / student_count
    let avgCompletion = 0;
    if (studentCount > 0 && totalLessons > 0) {
        avgCompletion = (allProgress.length / (studentCount * totalLessons)) * 100;
    }

    // Avg quiz score
    const quizzes = await Quiz.find({ lessonId: { $in: lessonIds } });
    const quizIds = quizzes.map(q => q._id);
    const submissions = await QuizSubmission.find({ quizId: { $in: quizIds } });
    
    let avgQuizScore = 0;
    if (submissions.length > 0) {
        avgQuizScore = (submissions.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / submissions.length) * 100;
    }

    // Most failed topics (grouped by lesson)
    // We'll look at lessons where avg quiz score is lowest
    const lessonStats = await Promise.all(lessons.map(async (lesson) => {
        const lessonQuizzes = quizzes.filter(q => q.lessonId.toString() === lesson._id.toString());
        const lQuizIds = lessonQuizzes.map(q => q._id);
        const lSubmissions = submissions.filter(s => lQuizIds.some(id => id.toString() === s.quizId.toString()));
        
        let lAvgScore = 100;
        if (lSubmissions.length > 0) {
            lAvgScore = (lSubmissions.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / lSubmissions.length) * 100;
        }

        return {
            lessonTitle: lesson.title,
            avgScore: lAvgScore,
            failureCount: lSubmissions.filter(s => (s.score / s.totalQuestions) < 0.5).length
        };
    }));

    const mostFailedLessons = lessonStats
        .filter(ls => ls.avgScore < 70)
        .sort((a, b) => a.avgScore - b.avgScore)
        .slice(0, 3);

    return {
      courseId,
      courseTitle: course.title,
      studentCount,
      completionRate: avgCompletion,
      avgQuizScore,
      mostFailedLessons
    };
  }));

  return { analytics };
});
