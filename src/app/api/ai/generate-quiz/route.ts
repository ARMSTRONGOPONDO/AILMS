import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Lesson from '@/models/Lesson';
import { apiHandler } from '@/lib/apiHandler';
import { enqueueQuizGenerationJob, startQuizGenerationWorker } from '@/lib/quizGenerationQueue';

// Simple delay helper
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const POST = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const { 
    lessonId, 
    numberOfQuestions = 5, 
    questionType = 'multiple-choice', 
    difficulty = 'medium', 
    focusTopic = '' 
  } = await req.json();

  await dbConnect();

  // 1-second delay for stability between consecutive requests
  await delay(1000);

  const lesson = await Lesson.findById(lessonId);

  if (!lesson || !lesson.contentText || lesson.contentText.trim().length < 50) {
    throw { 
      status: 400, 
      message: 'This lesson has no content yet. Add text, a PDF, or a document before generating a quiz.' 
    };
  }

  const job = await enqueueQuizGenerationJob({
    lessonId,
    tutorId: session.user.id,
    numberOfQuestions,
    questionType,
    difficulty,
    focusTopic
  });

  void startQuizGenerationWorker();

  return {
    queued: true,
    jobId: job._id,
    message: 'Quiz generation queued.',
    questionType,
    difficulty,
    focusTopic
  };
});
