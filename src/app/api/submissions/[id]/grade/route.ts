import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Assignment from '@/models/Assignment';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import Notification from '@/models/Notification';
import { apiHandler } from '@/lib/apiHandler';

export const PUT = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const { tutorGrade, tutorFeedback, acceptAIGrade } = await req.json();

  await dbConnect();
  
  const submission = await AssignmentSubmission.findById(params.id).populate('assignmentId');
  if (!submission) throw { status: 404, message: 'Submission not found' };

  const assignment = submission.assignmentId as any;
  if (assignment.tutorId.toString() !== session.user.id) {
    throw { status: 403, message: 'Forbidden' };
  }

  let finalGrade = 0;
  let isPassing = false;

  if (acceptAIGrade) {
    finalGrade = submission.aiGrade || 0;
    isPassing = finalGrade >= (assignment.passingScore || 50);
  } else {
    finalGrade = tutorGrade;
    isPassing = finalGrade >= (assignment.passingScore || 50);
  }

  submission.status = 'graded';
  submission.tutorGrade = tutorGrade;
  submission.tutorFeedback = tutorFeedback;
  submission.finalGrade = finalGrade;
  submission.isPassing = isPassing;
  submission.gradedBy = session.user.id;
  submission.gradedAt = new Date();

  // Fix: Ensure courseId is present to avoid validation error if missing in legacy docs
  if (!submission.courseId && assignment.courseId) {
    submission.courseId = assignment.courseId;
  }

  await submission.save();

  // Notify student
  await Notification.create({
    userId: submission.studentId,
    type: 'assignment_graded',
    message: `Your final grade for "${assignment.title}" is ready: ${finalGrade}%`
  });

  return submission;
});
