import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { apiHandler } from '@/lib/apiHandler';

export const PUT = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const { role } = await req.json();
  if (!['student', 'tutor'].includes(role)) {
    throw { status: 400, message: 'Invalid role' };
  }

  await dbConnect();
  const user = await User.findById(params.id);
  if (!user) throw { status: 404, message: 'User not found' };
  if (user.role === 'admin') throw { status: 403, message: 'Cannot change admin role' };

  user.role = role;
  await user.save();

  return { success: true };
});
