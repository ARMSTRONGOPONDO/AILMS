import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Assignment from '@/models/Assignment';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import Enrollment from '@/models/Enrollment';
import Notification from '@/models/Notification';
import Course from '@/models/Course';
import User from '@/models/User';
import { apiHandler } from '@/lib/apiHandler';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { enqueueGradingJob, startGradingWorker } from '@/lib/gradingQueue';

// Text extractors
import mammoth from 'mammoth';
const pdfParse = require('pdf-parse-fork');

export const POST = apiHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  
  // 2. Fetch the assignment with its gradingKPIs and course
  const assignment = await Assignment.findById(params.id);
  if (!assignment) throw { status: 404, message: 'Assignment not found' };
  
  // 3. Check student is enrolled in the course
  const enrollment = await Enrollment.findOne({ 
    studentId: session.user.id, 
    courseId: assignment.courseId 
  });
  if (!enrollment) throw { status: 403, message: 'Not enrolled in this course' };
  
  // 4. Prevent duplicate submission
  const existing = await AssignmentSubmission.findOne({
    assignmentId: params.id,
    studentId: session.user.id
  });
  if (existing) {
    return NextResponse.json({ 
      error: 'You have already submitted this assignment.',
      existingSubmission: existing 
    }, { status: 409 });
  }

  // 5. Parse FormData — get submissionText and/or file
  const formData = await req.formData();
  const submissionText = (formData.get('submissionText') as string) || '';
  const file = formData.get('file') as File;
  
  let fileUrl = '', fileName = '', fileType: 'pdf' | 'docx' | null = null, extractedText = '';

  if (file && file.size > 0) {
    // Save file to /public/uploads/assignments/
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      throw { status: 400, message: 'Only PDF and DOCX files are accepted' };
    }
    
    const filename = `${Date.now()}-${session.user.id}-${file.name.replace(/\s/g,'_')}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'assignments');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    
    fileUrl  = `/uploads/assignments/${filename}`;
    fileName = file.name;
    fileType = ext as 'pdf' | 'docx';
    
    // Extract text for AI grading
    try {
        if (ext === 'pdf') {
          extractedText = (await pdfParse(buffer)).text;
        } else if (ext === 'docx') {
          extractedText = (await mammoth.extractRawText({ buffer })).value;
        }
    } catch (err) {
        console.error('Text extraction failed:', err);
    }
  }

  // 6. Determine submission type
  const hasText = submissionText.trim().length > 0;
  const hasFile = fileUrl.length > 0;
  if (!hasText && !hasFile) throw { status: 400, message: 'Submit text, a file, or both' };
  const submissionType = hasText && hasFile ? 'both' : hasText ? 'text' : 'file';

  // 7. Create submission with status 'submitted'
  const submission = await AssignmentSubmission.create({
    assignmentId: params.id,
    studentId:    session.user.id,
    courseId:     assignment.courseId,
    submissionType,
    submissionText: submissionText.trim(),
    fileUrl,
    fileName,
    fileType,
    status: 'submitted'
  });

  // 8. Queue AI grading for background processing
  let aiGradingStatus: 'queued' | 'failed' | 'skipped' = 'skipped';
  console.log(`[SUBMIT-ROUTE] Assignment AI grading enabled: ${assignment.aiGradingEnabled}`);
  console.log(`[SUBMIT-ROUTE] Grading KPIs count: ${assignment.gradingKPIs?.length || 0}`);
  
  if (assignment.aiGradingEnabled && assignment.gradingKPIs?.length > 0) {
    try {
      console.log(`[SUBMIT-ROUTE] Queueing AI grading for ${submission._id}...`);
      console.log(`[SUBMIT-ROUTE] Submission text length: ${submissionText.length}`);
      console.log(`[SUBMIT-ROUTE] Extracted file text length: ${extractedText.length}`);

      await enqueueGradingJob({
        submissionId: String(submission._id),
        assignmentId: String(assignment._id),
        studentId: String(session.user.id),
        submissionText: submissionText.trim(),
        extractedFileText: extractedText || ''
      });
      aiGradingStatus = 'queued';
      // Fire-and-forget worker kick. The request should return immediately.
      void startGradingWorker();
    } catch (err: any) {
      console.error('[SUBMIT-ROUTE] AI grading queueing failed:', err);
      console.error('[SUBMIT-ROUTE] Error stack:', err.stack);
      aiGradingStatus = 'failed';
    }
  } else {
    console.log('[SUBMIT-ROUTE] AI grading disabled or no KPIs, skipping');
    aiGradingStatus = 'skipped';
  }

  // 9. Notify the tutor
  const course = await Course.findById(assignment.courseId).populate('tutorId');
  const student = await User.findById(session.user.id).select('name');
  if (course && student) {
      await Notification.create({
        userId:  course.tutorId._id,
        type:    'assignment_submitted',
        message: `${student.name} submitted "${assignment.title}" — ${aiGradingStatus === 'queued' ? 'AI review queued' : 'Manual review needed'}`
      });
  }

  // 10. Fetch updated submission to return the final state
  let updatedSubmission = await AssignmentSubmission.findById(submission._id);

  // Safety fallback: never leave students stuck in perpetual "submitted" state.
  // If AI grading failed/skipped and status is still submitted, move to manual review state.
  if (updatedSubmission && aiGradingStatus !== 'queued' && updatedSubmission.status === 'submitted') {
    updatedSubmission = await AssignmentSubmission.findByIdAndUpdate(
      submission._id,
      {
        status: 'ai_failed',
        aiRemarks: updatedSubmission.aiRemarks || 'AI review is unavailable right now. Your tutor will review this submission manually.'
      },
      { new: true }
    );
  }

  // 11. Return confirmation
  const finalStatus = (updatedSubmission as any)?.status;
  const aiGradingPending = finalStatus === 'submitted';

  const responseMessage =
    finalStatus === 'ai_reviewed'
      ? 'Assignment reviewed by AI successfully.'
      : finalStatus === 'submitted'
        ? 'Assignment submitted. AI review queued...'
        : 'Assignment submitted. AI is temporarily unavailable; your tutor will grade this manually.';

  const responsePayload = {
    success: true,
    message: responseMessage,
    submissionId: submission._id,
    aiGradingPending,
    data: updatedSubmission
  };
  
  console.log('[SUBMIT-ROUTE] Returning response:', responsePayload);
  return NextResponse.json(responsePayload);
});
