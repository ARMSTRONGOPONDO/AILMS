import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Assignment from '@/models/Assignment';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import Enrollment from '@/models/Enrollment';
import { apiHandler } from '@/lib/apiHandler';

export const GET = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  
  const assignment = await Assignment.findById(params.id).populate('courseId');
  if (!assignment || assignment.tutorId.toString() !== session.user.id) {
    throw { status: 403, message: 'Forbidden' };
  }

  const submissions = await AssignmentSubmission.find({ assignmentId: params.id })
    .populate('studentId', 'name email avatar')
    .sort('-submittedAt');

  // Summary stats
  const totalEnrolled = await Enrollment.countDocuments({ courseId: assignment.courseId });
  const totalSubmitted = submissions.length;
  const totalAIReviewed = submissions.filter(s => s.status === 'ai_reviewed').length;
  const totalGraded = submissions.filter(s => s.status === 'graded').length;
  
  const gradedSubmissions = submissions.filter(s => s.finalGrade !== undefined);
  const averageFinalGrade = gradedSubmissions.length > 0
    ? gradedSubmissions.reduce((acc, curr) => acc + (curr.finalGrade || 0), 0) / gradedSubmissions.length
    : 0;
    
  const passingCount = gradedSubmissions.filter(s => s.isPassing).length;

  return {
    assignment,
    submissions,
    summary: {
      totalEnrolled,
      totalSubmitted,
      totalAIReviewed,
      totalGraded,
      averageFinalGrade,
      passingCount
    }
  };
});
