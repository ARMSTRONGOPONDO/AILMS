import dbConnect from '@/lib/db';
import Lesson from '@/models/Lesson';
import QuizGenerationJob from '@/models/QuizGenerationJob';
import { parseRetryDelayMs } from '@/lib/gradeWithAI';
import { callAI } from '@/lib/ai/callWithFallback';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

declare global {
  // eslint-disable-next-line no-var
  var __quizQueueRunning: boolean | undefined;
}

function buildPrompt(lesson: any, cfg: { numberOfQuestions: number; questionType: string; difficulty: string; focusTopic?: string }) {
  const difficultyInstructions = {
    easy: 'Questions should test basic recall and simple understanding.',
    medium: 'Questions should require application of concepts and analysis.',
    hard: 'Questions should require synthesis, evaluation, and critical thinking.'
  } as const;

  const typeInstructions = {
    'multiple-choice': `Each question has exactly 4 options. Return:
      { "questionText": string, "options": string[4], "correctOption": number (0-3), "explanation": string }`,
    'true-false': `Each question is a statement. Return:
      { "questionText": string, "options": ["True", "False"], "correctOption": 0 or 1, "explanation": string }`,
    'open-ended': `Each question requires a written answer. Return:
      { "questionText": string, "options": [], "correctOption": -1, "modelAnswer": string, "gradingCriteria": string, "explanation": string }`,
    mixed: `Mix MCQ and True/False freely. Each must match one of the JSON structures above (MCQ or T/F).`
  } as const;

  return `
    You are an educational assessment expert.
    Generate ${cfg.numberOfQuestions} quiz questions based on the lesson content provided below.
    Difficulty: ${difficultyInstructions[cfg.difficulty as keyof typeof difficultyInstructions]}
    Question format: ${typeInstructions[cfg.questionType as keyof typeof typeInstructions]}
    ${cfg.focusTopic ? `Focus specifically on: ${cfg.focusTopic}` : ''}
    Return ONLY a valid JSON array. No markdown fences, no conversational text.

    LESSON CONTENT:
    ${lesson.contentText}
  `;
}

function extractQuestions(text: string) {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse AI response');
  return JSON.parse(jsonMatch[0]);
}

export async function enqueueQuizGenerationJob(payload: {
  lessonId: string;
  tutorId: string;
  numberOfQuestions: number;
  questionType: 'multiple-choice' | 'true-false' | 'open-ended' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  focusTopic?: string;
}) {
  await dbConnect();
  const created = await QuizGenerationJob.create({
    ...payload,
    status: 'queued',
    attempts: 0,
    maxAttempts: 6,
    nextRunAt: new Date()
  });
  return created;
}

export async function startQuizGenerationWorker() {
  if (global.__quizQueueRunning) return;
  global.__quizQueueRunning = true;

  try {
    await dbConnect();

    // Recover jobs that were left "processing" after a dev server restart/crash.
    await QuizGenerationJob.updateMany(
      {
        status: 'processing',
        updatedAt: { $lt: new Date(Date.now() - 2 * 60 * 1000) }
      },
      {
        status: 'retrying',
        nextRunAt: new Date(),
        lastError: 'Recovered stale processing job after worker restart.'
      }
    );

    while (true) {
      const job: any = await QuizGenerationJob.findOneAndUpdate(
        {
          status: { $in: ['queued', 'retrying'] },
          nextRunAt: { $lte: new Date() }
        },
        { status: 'processing', $inc: { attempts: 1 } },
        { sort: { createdAt: 1 }, returnDocument: 'after' }
      );

      if (!job) break;

      const lesson = await Lesson.findById(job.lessonId);
      if (!lesson || !lesson.contentText || lesson.contentText.trim().length < 50) {
        await QuizGenerationJob.findByIdAndUpdate(job._id, {
          status: 'failed',
          lastError: 'Lesson has insufficient content for AI quiz generation.'
        });
        continue;
      }

      try {
        const prompt = buildPrompt(lesson, {
          numberOfQuestions: job.numberOfQuestions,
          questionType: job.questionType,
          difficulty: job.difficulty,
          focusTopic: job.focusTopic
        });
        const result = await callAI(
          { systemPrompt: '', userMessage: prompt, expectJSON: true, maxTokens: 1500 },
          'quiz_generation'
        );
        if (!result.success) {
          throw new Error(result.error || 'AI call failed');
        }
        const questions = extractQuestions(result.response);

        await QuizGenerationJob.findByIdAndUpdate(job._id, {
          status: 'completed',
          questions,
          lastError: ''
        });
      } catch (err: any) {
        const status = err?.status || err?.response?.status;
        const canRetry = (status === 429 || status === 503) && job.attempts < job.maxAttempts;

        if (canRetry) {
          const retryMs = parseRetryDelayMs(err) ?? 15000;
          await QuizGenerationJob.findByIdAndUpdate(job._id, {
            status: 'retrying',
            nextRunAt: new Date(Date.now() + retryMs),
            lastError: String(err?.message || err)
          });
          await delay(250);
        } else {
          await QuizGenerationJob.findByIdAndUpdate(job._id, {
            status: 'failed',
            lastError: String(err?.message || err)
          });
        }
      }
    }
  } finally {
    global.__quizQueueRunning = false;
  }
}
