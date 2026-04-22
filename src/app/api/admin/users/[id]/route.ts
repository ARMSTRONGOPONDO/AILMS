import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';
import QuizSubmission from '@/models/QuizSubmission';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import ChatSession from '@/models/ChatSession';
import { apiHandler } from '@/lib/apiHandler';

export const PUT = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const { status } = await req.json();
  if (!['active', 'suspended'].includes(status)) {
    throw { status: 400, message: 'Invalid status' };
  }

  await dbConnect();
  const user = await User.findById(params.id);
  if (!user) throw { status: 404, message: 'User not found' };
  if (user.role === 'admin') throw { status: 403, message: 'Cannot suspend admin' };

  user.status = status;
  await user.save();

  return { success: true };
});

export const DELETE = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  const user = await User.findById(params.id);
  if (!user) throw { status: 404, message: 'User not found' };
  if (user.role === 'admin') throw { status: 403, message: 'Cannot delete admin' };

  // Hard delete related data
  await Promise.all([
    Enrollment.deleteMany({ studentId: user._id }),
    QuizSubmission.deleteMany({ studentId: user._id }),
    AssignmentSubmission.deleteMany({ studentId: user._id }),
    ChatSession.deleteMany({ studentId: user._id }),
    User.findByIdAndDelete(user._id)
  ]);

  return { success: true };
});
