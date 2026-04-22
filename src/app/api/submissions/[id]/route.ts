import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import Assignment from '@/models/Assignment';
import { apiHandler } from '@/lib/apiHandler';
import { unlink } from 'fs/promises';
import path from 'path';

export const DELETE = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  
  const submission = await AssignmentSubmission.findById(params.id).populate('assignmentId');
  if (!submission) {
    throw { status: 404, message: 'Submission not found' };
  }

  // Check ownership
  if (submission.studentId.toString() !== session.user.id) {
    throw { status: 403, message: 'Forbidden' };
  }

  const assignment = submission.assignmentId as any;
  if (!assignment.allowResubmission) {
      throw { status: 403, message: 'Resubmission is not allowed for this assignment' };
  }

  // Optional: prevent delete if tutor has already finalized grade? 
  // Task 9 says "Resubmit deletes old submission and lets student submit again" if status is 'ai_reviewed' or 'graded'

  // Delete associated file if exists
  if (submission.fileUrl) {
      try {
          const filePath = path.join(process.cwd(), 'public', submission.fileUrl);
          await unlink(filePath);
      } catch (err) {
          console.error('Failed to delete file:', err);
      }
  }

  await AssignmentSubmission.findByIdAndDelete(params.id);

  return { success: true, message: 'Submission removed successfully' };
});
