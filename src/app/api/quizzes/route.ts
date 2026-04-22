import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Quiz from '@/models/Quiz';
import Lesson from '@/models/Lesson';
import Module from '@/models/Module';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import Notification from '@/models/Notification';
import { apiHandler } from '@/lib/apiHandler';
import { z } from 'zod';

const questionSchema = z.object({
  questionText: z.string().min(5),
  options: z.array(z.string()).min(0),
  correctOption: z.number(),
  explanation: z.string().default(''),
  modelAnswer: z.string().optional(),
  gradingCriteria: z.string().optional(),
});

const quizSchema = z.object({
  lessonId: z.string(),
  title: z.string().min(3),
  questions: z.array(questionSchema).min(1),
  aiGenerated: z.boolean().optional(),
  questionType: z.enum(['multiple-choice', 'true-false', 'open-ended', 'mixed']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  focusTopic: z.string().optional()
});

type RawQuestion = Record<string, unknown>;

function parseCorrectOption(
  options: string[],
  rawCorrect: unknown,
  rawCorrectAnswer: unknown
) {
  const normalizedOptions = options.map((opt) => opt.trim().toLowerCase());

  if (typeof rawCorrect === 'number' && Number.isFinite(rawCorrect)) {
    return rawCorrect;
  }

  if (typeof rawCorrect === 'string') {
    const trimmed = rawCorrect.trim().toLowerCase();
    if (/^-?\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) return numeric;
    }
  }

  if (typeof rawCorrectAnswer === 'number' && Number.isFinite(rawCorrectAnswer)) {
    return rawCorrectAnswer;
  }

  if (typeof rawCorrectAnswer === 'string') {
    const answer = rawCorrectAnswer.trim().toLowerCase();

    // Match by exact option text.
    const byValueIndex = normalizedOptions.findIndex((opt) => opt === answer);
    if (byValueIndex >= 0) return byValueIndex;

    // Support letter keys like "A", "B", "C", "D".
    const letter = answer.replace(/[^a-z]/g, '');
    if (letter.length === 1) {
      const idx = letter.charCodeAt(0) - 97;
      if (idx >= 0 && idx < options.length) return idx;
    }

    // Support "option 1", "2", etc.
    const numericMatch = answer.match(/\d+/);
    if (numericMatch) {
      const oneBased = Number(numericMatch[0]);
      if (oneBased >= 1 && oneBased <= options.length) return oneBased - 1;
    }

    // Special handling for True/False.
    if (answer === 'true') {
      const idx = normalizedOptions.findIndex((opt) => opt === 'true');
      if (idx >= 0) return idx;
    }
    if (answer === 'false') {
      const idx = normalizedOptions.findIndex((opt) => opt === 'false');
      if (idx >= 0) return idx;
    }
  }

  return -1;
}

function normalizeQuestion(raw: unknown) {
  const q = (raw || {}) as RawQuestion;
  const questionText = String(q.questionText ?? q.question ?? q.prompt ?? '').trim();
  const optionLike = q.options;
  let options = Array.isArray(optionLike)
    ? optionLike.map((opt) => String(opt))
    : [];

  // If AI omits options for a True/False question, reconstruct them.
  const isTrueFalseQuestion = /^true\s*or\s*false[:\s]/i.test(questionText);
  if (options.length === 0 && isTrueFalseQuestion) {
    options = ['True', 'False'];
  }

  const rawCorrect = q.correctOption ?? q.correctIndex;
  let correctOption = parseCorrectOption(options, rawCorrect, q.correctAnswer ?? q.answer);

  const questionType = String(q.questionType ?? q.type ?? '').toLowerCase();
  const hasOpenEndedSignals =
    questionType === 'open-ended' ||
    questionType === 'open_ended' ||
    typeof q.modelAnswer === 'string' ||
    typeof q.gradingCriteria === 'string';

  // If this looks objective but key parsing failed, avoid misclassifying as open-ended.
  if (!hasOpenEndedSignals && options.length > 0 && (correctOption < 0 || correctOption >= options.length)) {
    correctOption = 0;
  }

  return {
    questionText,
    options,
    correctOption,
    explanation: String(q.explanation ?? '').trim(),
    modelAnswer:
      typeof q.modelAnswer === 'string' ? q.modelAnswer.trim() : undefined,
    gradingCriteria:
      typeof q.gradingCriteria === 'string' ? q.gradingCriteria.trim() : undefined,
  };
}

export const POST = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const body = await req.json();
  const normalizedBody = {
    ...body,
    questions: Array.isArray(body?.questions)
      ? body.questions.map((q: unknown) => normalizeQuestion(q))
      : [],
  };
  const data = quizSchema.parse(normalizedBody);
  
  await dbConnect();

  const quiz = await Quiz.create(data);

  // Notify enrolled students
  try {
    const lesson = await Lesson.findById(data.lessonId);
    const targetModule = await Module.findById(lesson?.moduleId);
    const course = await Course.findById(targetModule?.courseId);

    if (course) {
      const enrollments = await Enrollment.find({ courseId: course._id });
      const studentIds = enrollments.map(e => e.studentId);

      if (studentIds.length > 0) {
        const notifications = studentIds.map(studentId => ({
          userId: studentId,
          type: 'new_quiz',
          message: `New quiz available in "${course.title}"`
        }));
        await Notification.insertMany(notifications);
      }
    }
  } catch (notifError) {
    console.error('Failed to send notifications:', notifError);
  }

  return quiz;
});
