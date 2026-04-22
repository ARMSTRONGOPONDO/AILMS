import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Assignment from '@/models/Assignment';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import { apiHandler } from '@/lib/apiHandler';
import { z } from 'zod';
import { unlink } from 'fs/promises';
import path from 'path';

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

export const GET = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  await dbConnect();
  const assignment = await Assignment.findById(params.id).populate('courseId', 'title');
  if (!assignment) throw { status: 404, message: 'Assignment not found' };
  return assignment;
});

export const PUT = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const body = await req.json();
  const data = assignmentSchema.parse(body);
  
  await dbConnect();
  
  const assignment = await Assignment.findById(params.id);
  if (!assignment) throw { status: 404, message: 'Assignment not found' };
  
  if (assignment.tutorId.toString() !== session.user.id) {
    throw { status: 403, message: 'Forbidden' };
  }

  // Validate KPI weights if AI grading is enabled
  if (data.aiGradingEnabled) {
    const kpis = data.gradingKPIs || [];
    const totalWeight = kpis.reduce((sum, kpi) => sum + kpi.weight, 0);
    if (totalWeight !== 100) {
      throw { status: 400, message: 'Total KPI weight must be exactly 100%' };
    }
  }

  const updated = await Assignment.findByIdAndUpdate(params.id, {
    ...data,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined
  }, { new: true });

  return updated;
});

export const DELETE = apiHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  const assignment = await Assignment.findById(params.id);
  if (!assignment) throw { status: 404, message: 'Assignment not found' };
  
  if (assignment.tutorId.toString() !== session.user.id) {
    throw { status: 403, message: 'Forbidden' };
  }

  // Find all submissions to delete files
  const submissions = await AssignmentSubmission.find({ assignmentId: params.id });
  for (const sub of submissions) {
    if (sub.fileUrl) {
      try {
        const filePath = path.join(process.cwd(), 'public', sub.fileUrl);
        await unlink(filePath);
      } catch (err) {
        console.error('Failed to delete file during assignment removal:', err);
      }
    }
  }

  await AssignmentSubmission.deleteMany({ assignmentId: params.id });
  await Assignment.findByIdAndDelete(params.id);

  return { success: true, message: 'Assignment and all submissions deleted' };
});
