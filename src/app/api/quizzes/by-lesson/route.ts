import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Quiz from '@/models/Quiz';
import QuizSubmission from '@/models/QuizSubmission';
import { apiHandler } from '@/lib/apiHandler';

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const lessonId = searchParams.get('lessonId');
  if (!lessonId) throw { status: 400, message: 'Missing lessonId' };

  await dbConnect();
  const quizzes = await Quiz.find({ lessonId }).lean();

  if (!session || session.user.role !== 'student') {
    return quizzes;
  }

  const submissions = await QuizSubmission.find({
    studentId: session.user.id,
    quizId: { $in: quizzes.map((quiz: any) => quiz._id) },
  })
    .select('quizId score totalQuestions retakeAllowed submittedAt')
    .lean();

  const submissionByQuizId = new Map(
    submissions.map((sub: any) => [String(sub.quizId), sub])
  );

  return quizzes.map((quiz: any) => {
    const submission = submissionByQuizId.get(String(quiz._id));
    const percentage =
      submission && submission.totalQuestions > 0
        ? Math.round((submission.score / submission.totalQuestions) * 100)
        : null;

    return {
      ...quiz,
      hasAttempted: Boolean(submission),
      retakeAllowed: Boolean(submission?.retakeAllowed),
      lastScorePercentage: percentage,
      submittedAt: submission?.submittedAt || null,
    };
  });
});
