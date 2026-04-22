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

export const POST = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  const { answers } = await req.json();
  await dbConnect();

  const quiz = await Quiz.findById(params.id);
  if (!quiz) throw { status: 404, message: 'Quiz not found' };

  const existingSubmission = await QuizSubmission.findOne({
    quizId: params.id,
    studentId: session.user.id,
  });

  if (existingSubmission && !existingSubmission.retakeAllowed) {
    throw {
      status: 409,
      message: 'You have already attempted this quiz. Ask your tutor to allow a retake.',
    };
  }

  let score = 0;
  const results = quiz.questions.map((q: any, idx: number) => {
    // Open-ended questions have correctOption = -1
    const isMCQ = q.correctOption !== -1;
    const isCorrect = isMCQ ? (q.correctOption === answers[idx]) : false;
    
    if (isMCQ && isCorrect) score++;

    return {
      questionText: q.questionText,
      selectedOption: isMCQ ? answers[idx] : null,
      selectedAnswer: !isMCQ ? answers[idx] : null,
      correctOption: q.correctOption,
      isCorrect,
      isOpenEnded: !isMCQ,
      explanation: q.explanation,
      modelAnswer: q.modelAnswer,
      gradingCriteria: q.gradingCriteria
    };
  });

  const submissionPayload = {
    answers,
    score,
    totalQuestions: quiz.questions.length,
    submittedAt: new Date(),
    selfAssessedCorrect: new Array(quiz.questions.length).fill(false),
  };

  const submission = existingSubmission
    ? await QuizSubmission.findByIdAndUpdate(
        existingSubmission._id,
        {
          ...submissionPayload,
          retakeAllowed: false,
          attemptCount: (existingSubmission.attemptCount || 1) + 1,
        },
        { new: true }
      )
    : await QuizSubmission.create({
        quizId: params.id,
        studentId: session.user.id,
        ...submissionPayload,
        retakeAllowed: false,
        attemptCount: 1,
      });

  // Notify tutor
  try {
    const lesson = await Lesson.findById(quiz.lessonId);
    const targetModule = await Module.findById(lesson?.moduleId);
    const course = await Course.findById(targetModule?.courseId);
    
    if (course) {
      await Notification.create({
        userId: course.tutorId,
        type: 'quiz_submission',
        message: `${session.user.name} completed a quiz in "${course.title}"`
      });
    }
  } catch (notifError) {
    console.error('Failed to send notification:', notifError);
  }

  return {
    submissionId: submission._id,
    score,
    totalQuestions: quiz.questions.length,
    percentage: (score / quiz.questions.length) * 100,
    results
  };
});
