import dbConnect from '@/lib/db';
import GradingJob from '@/models/GradingJob';
import Assignment from '@/models/Assignment';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import Notification from '@/models/Notification';
import { buildFallbackReview } from '@/lib/fallbackReview';
import { gradeSubmissionWithAI, parseRetryDelayMs } from '@/lib/gradeWithAI';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

declare global {
  // eslint-disable-next-line no-var
  var __gradingQueueRunning: boolean | undefined;
}

async function applyFallbackReview(submissionId: string, assignment: any, submissionText: string, extractedFileText: string) {
  const fallback = buildFallbackReview(assignment, submissionText, extractedFileText);
  await AssignmentSubmission.findByIdAndUpdate(
    submissionId,
    {
      status: 'ai_reviewed',
      aiGrade: fallback.overallScore,
      aiRemarks: fallback.remarks,
      aiStrengths: fallback.strengths,
      aiWeaknesses: fallback.weaknesses,
      aiKpiBreakdown: fallback.kpiBreakdown,
      aiGradedAt: new Date(),
      finalGrade: fallback.overallScore,
      isPassing: fallback.isPassing
    }
  );
}

export async function enqueueGradingJob(payload: {
  submissionId: string;
  assignmentId: string;
  studentId: string;
  submissionText: string;
  extractedFileText: string;
}) {
  await dbConnect();
  await GradingJob.findOneAndUpdate(
    { submissionId: payload.submissionId },
    {
      $setOnInsert: {
        ...payload,
        status: 'queued',
        attempts: 0,
        maxAttempts: 6,
        nextRunAt: new Date()
      }
    },
    { upsert: true }
  );
}

export async function startGradingWorker() {
  if (global.__gradingQueueRunning) return;
  global.__gradingQueueRunning = true;

  try {
    await dbConnect();

    while (true) {
      const job = await GradingJob.findOneAndUpdate(
        {
          status: { $in: ['queued', 'retrying'] },
          nextRunAt: { $lte: new Date() }
        },
        {
          status: 'processing',
          $inc: { attempts: 1 }
        },
        {
          sort: { createdAt: 1 },
          returnDocument: 'after'
        }
      );

      if (!job) break;

      const assignment = await Assignment.findById(job.assignmentId).populate('courseId', 'title');
      if (!assignment) {
        await AssignmentSubmission.findByIdAndUpdate(job.submissionId, {
          status: 'ai_failed',
          aiRemarks: 'Assignment no longer exists. Manual review required.'
        });
        await GradingJob.findByIdAndUpdate(job._id, {
          status: 'failed',
          lastError: 'Assignment not found'
        });
        continue;
      }

      try {
        const result = await gradeSubmissionWithAI(
          job.submissionId.toString(),
          assignment,
          job.submissionText || '',
          job.extractedFileText || '',
          { suppressFailureWrite: true }
        );

        if (result?.success) {
          await GradingJob.findByIdAndUpdate(job._id, { status: 'completed' });
        } else {
          await applyFallbackReview(job.submissionId.toString(), assignment, job.submissionText || '', job.extractedFileText || '');
          await GradingJob.findByIdAndUpdate(job._id, {
            status: 'completed',
            usedFallback: true,
            lastError: `Primary grading returned: ${result?.reason || 'unknown'}`
          });
        }
      } catch (err: any) {
        const status = err?.status || err?.response?.status;
        const canRetry = (status === 429 || status === 503) && job.attempts < job.maxAttempts;

        if (canRetry) {
          const retryMs = parseRetryDelayMs(err) ?? 15000;
          await GradingJob.findByIdAndUpdate(job._id, {
            status: 'retrying',
            nextRunAt: new Date(Date.now() + retryMs),
            lastError: String(err?.message || err)
          });
          await sleep(250);
        } else {
          await applyFallbackReview(job.submissionId.toString(), assignment, job.submissionText || '', job.extractedFileText || '');
          await GradingJob.findByIdAndUpdate(job._id, {
            status: 'completed',
            usedFallback: true,
            lastError: String(err?.message || err)
          });
        }
      }

      const finalSubmission = await AssignmentSubmission.findById(job.submissionId);
      if (finalSubmission?.status === 'ai_reviewed') {
        await Notification.create({
          userId: finalSubmission.studentId,
          type: 'assignment_graded',
          message: `Your assignment "${assignment.title}" has been reviewed. Score: ${finalSubmission.finalGrade ?? finalSubmission.aiGrade ?? 0}%`
        });
      }
    }
  } finally {
    global.__gradingQueueRunning = false;
  }
}
