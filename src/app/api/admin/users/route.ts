import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';
import QuizSubmission from '@/models/QuizSubmission';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import ChatSession from '@/models/ChatSession';
import { apiHandler } from '@/lib/apiHandler';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

export const GET = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || 'all';
  const status = searchParams.get('status') || 'all';

  await dbConnect();

  const query: any = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  if (role !== 'all') query.role = role;
  if (status !== 'all') query.status = status;

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(query).select('-passwordHash').sort('-createdAt').skip(skip).limit(limit),
    User.countDocuments(query)
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  };
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['student', 'tutor'])
});

export const POST = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const body = await req.json();
  const { name, email, password, role } = createUserSchema.parse(body);

  await dbConnect();
  const existing = await User.findOne({ email });
  if (existing) throw { status: 400, message: 'User already exists' };

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email,
    passwordHash: hashedPassword,
    role,
    status: 'active'
  });

  return user;
});
