import dbConnect from "@/lib/db";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Notification from "@/models/Notification";
import { callAI } from "@/lib/ai/callWithFallback";

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

function extractJsonObject(text: string) {
  const cleaned = text.replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start !== -1 && end !== -1 && end > start) {
    return cleaned.slice(start, end + 1);
  }

  return cleaned;
}

export function parseRetryDelayMs(err: any): number | null {
  // GoogleGenerativeAI errors often include errorDetails with RetryInfo.retryDelay like "48s"
  const details = err?.errorDetails;
  if (!Array.isArray(details)) return null;

  const retryInfo = details.find((d: any) => d?.['@type']?.includes('google.rpc.RetryInfo'));
  const retryDelay = retryInfo?.retryDelay;
  if (typeof retryDelay !== 'string') return null;

  const match = retryDelay.trim().match(/^(\d+)(s)?$/i);
  if (!match) return null;

  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds)) return null;
  return seconds * 1000;
}

async function generateWithRetry(model: any, prompt: string) {
  const maxAttempts = 4;
  let lastErr: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (err: any) {
      lastErr = err;
      const status = err?.status || err?.response?.status;
      // Retry on transient overload/rate errors
      if ((status === 503 || status === 429) && attempt < maxAttempts) {
        const serverSuggestedDelay = parseRetryDelayMs(err);
        const baseDelayMs = serverSuggestedDelay ?? (1000 * Math.pow(2, attempt - 1));
        // Add small jitter to avoid thundering herd
        const jitterMs = Math.floor(Math.random() * 250);
        await sleep(baseDelayMs + jitterMs);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function gradeSubmissionWithAI(
  submissionId: string,
  assignment: any,
  submissionText: string,
  extractedFileText: string,
  options?: { suppressFailureWrite?: boolean }
) {
  console.log(`[GRADE-WITH-AI] Starting function for submission ${submissionId}`);
  
  const fullSubmissionContent = [submissionText, extractedFileText]
    .filter(Boolean).join('\n\n').slice(0, 6000);

  console.log(`[GRADE-WITH-AI] Submission content length: ${fullSubmissionContent.length}`);
  
  if (!fullSubmissionContent.trim()) {
    console.log('[GRADE-WITH-AI] No content to grade, exiting');
    return { success: false, reason: 'empty_submission' };
  }

  const kpiList = assignment.gradingKPIs.map((k: any, i: number) =>
    `${i + 1}. ${k.label} (${k.weight}%): ${k.description}`
  ).join('\n');

  console.log(`[GRADE-WITH-AI] KPI list: ${kpiList.substring(0, 200)}...`);

  const prompt = `
You are an academic grader for ${assignment.courseId?.title || 'a university course'}.

ASSIGNMENT: "${assignment.title}"
DESCRIPTION: ${assignment.description || 'No description provided'}
PASSING SCORE: ${assignment.passingScore}%
${assignment.gradingInstructions ? `SPECIAL INSTRUCTIONS: ${assignment.gradingInstructions}` : ''}

GRADING CRITERIA (KPIs):
${kpiList}

STUDENT SUBMISSION:
---
${fullSubmissionContent}
---

Grade this submission against each KPI. Be fair, specific, and educational.

Return ONLY a valid JSON object with this exact structure:
{
  "overallScore": <number 0-100>,
  "isPassing": <boolean — true if overallScore >= ${assignment.passingScore}>,
  "remarks": "<2-3 paragraph overall feedback — constructive and specific>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "weaknesses": ["<specific area for improvement 1>", "<specific area for improvement 2>"],
  "kpiBreakdown": [
    {
      "kpiLabel": "<exact KPI label from above>",
      "score": <number 0-100 for this KPI>,
      "comment": "<one sentence specific comment on this KPI>"
    }
  ]
}

The overallScore must be the weighted average of kpiBreakdown scores based on KPI weights.
No markdown, no explanation outside the JSON.
`;

  console.log(`[AI-GRADING] Starting review for submission ${submissionId}...`);
  try {
    console.log(`[AI-GRADING] Calling AI fallback system...`);
    const startTime = Date.now();
    
    const result = await callAI(
      {
        systemPrompt: '',
        userMessage: prompt,
        expectJSON: true,
        maxTokens: 1200
      },
      'assignment_grading'
    );

    if (!result.success) {
      throw new Error(result.error || 'AI call failed');
    }

    const raw = result.response.trim();
    const extractedJson = extractJsonObject(raw);
    const duration = (Date.now() - startTime) / 1000;
    console.log(`[AI-GRADING] Gemini response received in ${duration}s`);
    console.log(`[AI-GRADING] Raw response (first 500 chars): ${raw.substring(0, 500)}...`);
    
    let parsed;
    try {
      parsed = JSON.parse(extractedJson);
      console.log('[AI-GRADING] Successfully parsed JSON response');
    } catch (parseError: any) {
      console.error('[AI-GRADING] Response was not valid JSON:', raw);
      console.error('[AI-GRADING] Parse error:', parseError.message);
      if (options?.suppressFailureWrite) {
        return { success: false, reason: 'invalid_json' };
      }
      await dbConnect();
      await AssignmentSubmission.findByIdAndUpdate(submissionId, { 
        status: 'ai_failed',
        aiRemarks: "AI returned an invalid response format. Manual review required."
      });
      return { success: false, reason: 'invalid_json' };
    }

    await dbConnect();
    console.log('[AI-GRADING] Database connected');
    
    // Validate parsed data has required fields
    const normalizedOverallScore = typeof parsed.overallScore === 'string'
      ? Number(parsed.overallScore)
      : parsed.overallScore;

    if (typeof normalizedOverallScore !== 'number' || Number.isNaN(normalizedOverallScore)) {
      console.error('[AI-GRADING] Missing or invalid overallScore:', parsed);
      if (options?.suppressFailureWrite) {
        return { success: false, reason: 'missing_score' };
      }
      await AssignmentSubmission.findByIdAndUpdate(submissionId, { 
        status: 'ai_failed',
        aiRemarks: "AI response missing score. Manual review required."
      });
      return { success: false, reason: 'missing_score' };
    }

    parsed.overallScore = Math.max(0, Math.min(100, normalizedOverallScore));
    
    console.log(`[AI-GRADING] Validated score: ${parsed.overallScore}`);
    
    // Save AI results ONLY if the tutor hasn't already graded it manually
    console.log(`[AI-GRADING] Attempting findOneAndUpdate for submission ${submissionId}`);
    const updateResult = await AssignmentSubmission.findOneAndUpdate(
      { _id: submissionId, status: { $in: ['submitted', 'ai_reviewed'] } },
      {
        status:         'ai_reviewed',
        aiGrade:        parsed.overallScore,
        aiRemarks:      parsed.remarks,
        aiStrengths:    parsed.strengths || [],
        aiWeaknesses:   parsed.weaknesses || [],
        aiKpiBreakdown: (parsed.kpiBreakdown || []).map((k: any) => ({
          kpiLabel: k.kpiLabel,
          score:    k.score,
          comment:  k.comment
        })),
        aiGradedAt:     new Date(),
        finalGrade:     parsed.overallScore,
        isPassing:      parsed.isPassing !== undefined ? parsed.isPassing : parsed.overallScore >= (assignment.passingScore || 50)
      },
      { new: true }
    );

    if (!updateResult) {
       console.log(`[AI-GRADING] findOneAndUpdate returned null for ${submissionId}`);
       console.log(`[AI-GRADING] Submission was already graded by a tutor or status changed. Skipping AI update.`);
       // Still try to update with direct findByIdAndUpdate as fallback
       const fallbackUpdate = await AssignmentSubmission.findById(submissionId);
       console.log(`[AI-GRADING] Fallback check - current submission status: ${fallbackUpdate?.status}`);
       
       if (fallbackUpdate && fallbackUpdate.status !== 'graded') {
         await AssignmentSubmission.findByIdAndUpdate(submissionId, {
           aiGrade:        parsed.overallScore,
           aiRemarks:      parsed.remarks,
           aiStrengths:    parsed.strengths || [],
           aiWeaknesses:   parsed.weaknesses || [],
           aiKpiBreakdown: (parsed.kpiBreakdown || []).map((k: any) => ({
             kpiLabel: k.kpiLabel,
             score:    k.score,
             comment:  k.comment
           })),
           aiGradedAt:     new Date(),
           finalGrade:     parsed.overallScore,
           isPassing:      parsed.isPassing !== undefined ? parsed.isPassing : parsed.overallScore >= (assignment.passingScore || 50)
         });
         console.log(`[AI-GRADING] Fallback update applied to ${submissionId}`);
         return { success: true, method: 'fallback' };
       }
       return { success: false, reason: 'already_graded' };
    }

    console.log(`[AI-GRADING] ✅ Submission ${submissionId} updated with AI results. New status: ${updateResult.status}`);
    console.log(`[AI-GRADING] Final grade: ${updateResult.finalGrade}, Is passing: ${updateResult.isPassing}`);

    // Notify student that their result is ready
    const submission = await AssignmentSubmission.findById(submissionId);
    if (submission) {
        await Notification.create({
          userId:  submission.studentId,
          type:    'assignment_graded',
          message: `Your assignment "${assignment.title}" has been reviewed. Score: ${parsed.overallScore}%`
        });
        console.log(`[AI-GRADING] Notification created for student ${submission.studentId}`);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ [AI-GRADING] AI grading error:', error);
    console.error('[AI-GRADING] Error details:', error.message);
    console.error('[AI-GRADING] Error stack:', error.stack);
    if (options?.suppressFailureWrite) {
      throw error;
    }
    await dbConnect();
    await AssignmentSubmission.findByIdAndUpdate(submissionId, { 
      status: 'ai_failed',
      aiRemarks: `AI review failed: ${error.message || 'Unknown error'}. Your tutor will review this manually.`
    });
    return { success: false, error: error.message };
  }
}
