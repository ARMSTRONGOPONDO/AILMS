import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { apiHandler } from '@/lib/apiHandler';

export const GET = apiHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  await dbConnect();
  const notifications = await Notification.find({ 
    userId: session.user.id,
    read: false 
  }).sort('-createdAt').limit(20);

  return notifications;
});

export const PUT = apiHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, message: 'Unauthorized' };

  await dbConnect();
  await Notification.updateMany(
    { userId: session.user.id, read: false },
    { read: true }
  );

  return { success: true };
});

export const POST = apiHandler(async (req: Request) => {
  const { userId, type, message } = await req.json();
  await dbConnect();
  const notification = await Notification.create({ userId, type, message });
  return notification;
});
