import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { apiHandler } from '@/lib/apiHandler';
import { z } from 'zod';

export const GET = apiHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }

  return settings;
});

const settingsSchema = z.object({
  platformName: z.string().min(2).optional(),
  maxFileSizeMB: z.number().min(1).max(50).optional(),
  allowStudentReg: z.boolean().optional(),
  allowTutorReg: z.boolean().optional()
});

export const PATCH = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const body = await req.json();
  const data = settingsSchema.parse(body);

  await dbConnect();
  const settings = await Settings.findOneAndUpdate(
    {},
    { $set: data },
    { upsert: true, new: true }
  );

  return settings;
});
