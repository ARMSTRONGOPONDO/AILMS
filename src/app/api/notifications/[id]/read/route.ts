import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { apiHandler } from '@/lib/apiHandler';

export const PUT = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  await dbConnect();
  const notification = await Notification.findOneAndUpdate(
    { _id: params.id, userId: session.user.id },
    { read: true },
    { new: true }
  );

  if (!notification) throw { status: 404, message: 'Notification not found' };

  return { success: true };
});
