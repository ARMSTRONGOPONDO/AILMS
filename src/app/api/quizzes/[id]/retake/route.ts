import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Quiz from '@/models/Quiz';
import QuizSubmission from '@/models/QuizSubmission';
import Lesson from '@/models/Lesson';
import Module from '@/models/Module';
import Course from '@/models/Course';
import Notification from '@/models/Notification';
import { apiHandler } from '@/lib/apiHandler';
import { z } from 'zod';

const retakeSchema = z.object({
  studentId: z.string(),
  allowed: z.boolean().default(true),
});

export const POST = apiHandler(
  async (req: Request, { params }: { params: { id: string } }) => {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'tutor') {
      throw { status: 401, message: 'Unauthorized' };
    }

    const body = await req.json();
    const { studentId, allowed } = retakeSchema.parse(body);

    await dbConnect();

    const quiz = await Quiz.findById(params.id);
    if (!quiz) throw { status: 404, message: 'Quiz not found' };

    const lesson = await Lesson.findById(quiz.lessonId);
    const targetModule = await Module.findById(lesson?.moduleId);
    const course = await Course.findById(targetModule?.courseId);
    if (!course || String(course.tutorId) !== session.user.id) {
      throw { status: 403, message: 'You cannot manage retakes for this quiz' };
    }

    const submission = await QuizSubmission.findOne({
      quizId: params.id,
      studentId,
    });
    if (!submission) {
      throw { status: 404, message: 'Student has not attempted this quiz yet' };
    }

    submission.retakeAllowed = allowed;
    await submission.save();

    if (allowed) {
      await Notification.create({
        userId: studentId,
        type: 'quiz_retake_unlocked',
        message: `Your tutor allowed a retake for quiz "${quiz.title}".`,
      });
    }

    return {
      quizId: params.id,
      studentId,
      retakeAllowed: submission.retakeAllowed,
    };
  }
);
