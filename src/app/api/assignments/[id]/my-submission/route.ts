import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import { apiHandler } from '@/lib/apiHandler';
import { startGradingWorker } from '@/lib/gradingQueue';

export const GET = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  
  const submission = await AssignmentSubmission.findOne({
    assignmentId: params.id,
    studentId: session.user.id
  });

  if (submission?.status === 'submitted') {
    // Opportunistically kick worker on polling requests
    void startGradingWorker();
  }

  return submission || null;
});
