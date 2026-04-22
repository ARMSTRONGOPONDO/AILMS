import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Assignment from '@/models/Assignment';
import { apiHandler } from '@/lib/apiHandler';
import { z } from 'zod';
import mongoose from 'mongoose';

const kpiSchema = z.object({
  label: z.string().min(1),
  description: z.string().min(1),
  weight: z.number().min(0).max(100),
});

const assignmentSchema = z.object({
  courseId: z.string(),
  title: z.string().min(3),
  description: z.string().min(10),
  rubric: z.string().min(10),
  dueDate: z.string().optional().or(z.literal('')),
  gradingKPIs: z.array(kpiSchema).optional(),
  passingScore: z.number().min(0).max(100).default(50),
  maxScore: z.number().default(100),
  aiGradingEnabled: z.boolean().default(true),
  gradingInstructions: z.string().optional(),
  allowResubmission: z.boolean().default(false),
});

const DEFAULT_KPIS = [
  { label: "Content Accuracy",    description: "Factual correctness",       weight: 40 },
  { label: "Depth of Analysis",   description: "Detail and explanation",    weight: 30 },
  { label: "Clarity of Writing",  description: "Clear and coherent prose",  weight: 30 }
];

export const POST = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const body = await req.json();
  const data = assignmentSchema.parse(body);
  
  await dbConnect();

  // Validate KPI weights if AI grading is enabled
  if (data.aiGradingEnabled) {
    const kpis = data.gradingKPIs || DEFAULT_KPIS;
    const totalWeight = kpis.reduce((sum, kpi) => sum + kpi.weight, 0);
    if (totalWeight !== 100) {
      throw { status: 400, message: 'Total KPI weight must be exactly 100%' };
    }
  }

  const assignment = await Assignment.create({
    ...data,
    gradingKPIs: data.gradingKPIs || DEFAULT_KPIS,
    tutorId: session.user.id,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined
  });

  return assignment;
});

export const GET = apiHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  const tutorId = searchParams.get('tutorId');

  await dbConnect();
  
  let query: any = {};
  if (courseId) {
    if (courseId !== 'undefined' && mongoose.Types.ObjectId.isValid(courseId)) {
        query.courseId = courseId;
    } else if (courseId === 'undefined') {
        throw { status: 400, message: 'Course ID is undefined' };
    }
  }
  if (tutorId) {
    if (tutorId !== 'undefined' && mongoose.Types.ObjectId.isValid(tutorId)) {
        query.tutorId = tutorId;
    }
  }

  const assignments = await Assignment.find(query).populate('courseId', 'title').sort('-createdAt');
  return assignments;
});
