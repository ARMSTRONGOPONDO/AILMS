import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Settings from '@/models/Settings';
import { apiHandler } from '@/lib/apiHandler';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['student', 'tutor', 'admin'])
});

// Simple in-memory rate limiter for auth
const rateLimitMap = new Map<string, { count: number, lastAttempt: number }>();

function checkRateLimit(ip: string) {
  const now = Date.now();
  const limit = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  if (now - record.lastAttempt > windowMs) {
    rateLimitMap.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  record.lastAttempt = now;
  return true;
}

export const POST = apiHandler(async (req: Request) => {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous';
  
  if (!checkRateLimit(ip)) {
    throw { status: 429, message: 'Too many registration attempts. Please try again in 15 minutes.' };
  }

  const body = await req.json();
  const { name, email, password, role } = registerSchema.parse(body);

  await dbConnect();

  // Enforce system settings
  const settings = await Settings.findOne();
  if (settings) {
    if (role === 'student' && !settings.allowStudentReg) {
      throw { status: 403, message: 'Student registration is currently disabled.' };
    }
    if (role === 'tutor' && !settings.allowTutorReg) {
      throw { status: 403, message: 'Tutor registration is currently disabled.' };
    }
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw { status: 400, message: 'User already exists' };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await User.create({
    name,
    email,
    passwordHash: hashedPassword,
    role,
  });

  return { success: true, message: 'Account created' };
});
