import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import QuizGenerationJob from '@/models/QuizGenerationJob';
import { apiHandler } from '@/lib/apiHandler';
import { startQuizGenerationWorker } from '@/lib/quizGenerationQueue';

export const GET = apiHandler(async (_req: Request, { params }: { params: { jobId: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  const job = await QuizGenerationJob.findOne({ _id: params.jobId, tutorId: session.user.id });
  if (!job) {
    throw { status: 404, message: 'Quiz generation job not found' };
  }

  if (job.status === 'queued' || job.status === 'retrying' || job.status === 'processing') {
    void startQuizGenerationWorker();
  }

  return {
    jobId: job._id,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    nextRunAt: job.nextRunAt || null,
    questions: job.status === 'completed' ? job.questions : [],
    lastError: job.lastError || null
  };
});
