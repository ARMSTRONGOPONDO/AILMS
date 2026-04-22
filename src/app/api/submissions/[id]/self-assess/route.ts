import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import QuizSubmission from '@/models/QuizSubmission';
import { apiHandler } from '@/lib/apiHandler';

export const PUT = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  const { questionIndex, isCorrect } = await req.json();
  await dbConnect();

  const submission = await QuizSubmission.findOne({ 
    _id: params.id, 
    studentId: session.user.id 
  });

  if (!submission) throw { status: 404, message: 'Submission not found' };

  // Update self-assessment
  if (!submission.selfAssessedCorrect) {
    submission.selfAssessedCorrect = [];
  }
  
  submission.selfAssessedCorrect[questionIndex] = isCorrect;
  
  // Recalculate score based on MCQ + Self-assessed correct
  // (Optional: handle this logic if you want self-assessment to actually change the DB score)
  // For now, we'll just store the preference.

  await submission.save();

  return { success: true };
});
