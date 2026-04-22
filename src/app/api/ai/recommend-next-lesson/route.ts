import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Enrollment from '@/models/Enrollment';
import Progress from '@/models/Progress';
import QuizSubmission from '@/models/QuizSubmission';
import Lesson from '@/models/Lesson';
import Module from '@/models/Module';
import Course from '@/models/Course';
import User from '@/models/User';
import Quiz from '@/models/Quiz';
import { geminiModel } from '@/lib/gemini';
import { apiHandler } from '@/lib/apiHandler';
import mongoose from 'mongoose';

// Explicitly register models for population
const _models = { Quiz, Lesson, Course, User };
const RECOMMENDATION_AI_TIMEOUT_MS = 10000;

export const POST = apiHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  const studentId = new mongoose.Types.ObjectId(session.user.id);

  // 1. Fetch student's current learning context with safety
  const [enrollments, progress, submissions] = await Promise.all([
    Enrollment.find({ studentId }).populate('courseId'),
    Progress.find({ studentId, completed: true }),
    QuizSubmission.find({ studentId }).populate({
        path: 'quizId',
        populate: { path: 'lessonId', select: 'title' }
    })
  ]);

  // Filter out invalid enrollments (e.g. if course was deleted)
  const validEnrollments = enrollments.filter(e => e.courseId);
  
  if (validEnrollments.length === 0) {
    return [];
  }

  const enrolledCourseIds = validEnrollments.map(e => (e.courseId as any)._id);
  const completedLessonIds = progress.map(p => p.lessonId.toString());

  // 2. Fetch all available lessons in those courses
  const modules = await Module.find({ courseId: { $in: enrolledCourseIds } });
  const allLessons = await Lesson.find({ 
    moduleId: { $in: modules.map(m => m._id) } 
  }).populate({
    path: 'moduleId',
    populate: { path: 'courseId', select: 'title' }
  });

  const remainingLessons = allLessons.filter(l => 
    l && l._id && !completedLessonIds.includes(l._id.toString())
  );

  if (remainingLessons.length === 0) {
    return [];
  }

  // 3. Prepare performance data for AI
  const quizPerformance = submissions.map(s => {
    const quiz: any = s.quizId;
    return {
      lesson: quiz?.lessonId?.title || 'Unknown',
      score: (s.totalQuestions > 0) ? (s.score / s.totalQuestions) * 100 : 0
    };
  });

  const weakTopics = quizPerformance
    .filter(p => p.score < 60)
    .map(p => p.lesson);

  const availableLessonsList = remainingLessons.slice(0, 15).map(l => ({
    id: l._id,
    title: l.title,
    course: (l.moduleId as any)?.courseId?.title || 'Course'
  }));

  const buildFallbackRecommendations = () => {
    // Prefer lessons whose titles match weak topics; otherwise pick the first remaining.
    const weakSet = new Set(weakTopics.map(t => (t || '').toLowerCase()).filter(Boolean));
    const scored = remainingLessons.map((lesson: any) => {
      const title = (lesson?.title || '').toLowerCase();
      const weakHit = [...weakSet].some(w => w && title.includes(w));
      return { lesson, score: weakHit ? 1 : 0 };
    });
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 3).map(({ lesson }) => {
      const mod: any = lesson.moduleId;
      const course: any = mod?.courseId;
      return {
        lessonId: lesson._id,
        reason: weakSet.size
          ? 'Recommended based on your recent quiz performance to strengthen weak areas.'
          : 'Recommended as a logical next lesson in your course.',
        lessonTitle: lesson.title,
        courseTitle: course?.title || 'Course',
        courseId: course?._id
      };
    }).filter((r: any) => r.courseId);
  };

  const generateWithRetry = async (promptText: string) => {
    const maxAttempts = 2;
    let lastErr: any;

    const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Recommendation AI timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await withTimeout(
          geminiModel.generateContent(promptText),
          RECOMMENDATION_AI_TIMEOUT_MS
        );
      } catch (err: any) {
        lastErr = err;
        const status = err?.status || err?.response?.status;
        // Retry on transient overload/rate errors
        const msg = String(err?.message || '');
        const isTimeout = msg.toLowerCase().includes('timed out');
        if ((status === 503 || status === 429 || isTimeout) && attempt < maxAttempts) {
          const backoffMs = 750 * Math.pow(2, attempt - 1);
          await new Promise(res => setTimeout(res, backoffMs));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  };

  // 4. Prompt Gemini for recommendations
  const prompt = `You are an adaptive learning system. Given this student's learning data:
   - Completed lessons count: ${progress.length}
   - Recent quiz performance: ${JSON.stringify(quizPerformance.slice(0, 5))}
   - Struggling topics: ${JSON.stringify(weakTopics.slice(0, 3))}
   
   Based on these available lessons in their courses: ${JSON.stringify(availableLessonsList)}
   
   Return ONLY a valid JSON array of the top 3 recommended lesson IDs with a brief reason for each.
   Reinforce weak areas first, then suggest next logical foundations.
   
   Format:
   [{"lessonId": "ID_HERE", "reason": "Reason here"}]`;

  try {
    const result = await generateWithRetry(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Improved JSON extraction
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Gemini returned non-JSON text:', text);
      return [];
    }
    
    const recommendations = JSON.parse(jsonMatch[0]);

    // Attach full lesson details to recommendations
    const fullRecommendations = recommendations.map((rec: any) => {
      const lesson = allLessons.find(l => l._id.toString() === rec.lessonId);
      if (!lesson) return null;
      
      const mod: any = lesson.moduleId;
      const course: any = mod?.courseId;

      return {
        lessonId: lesson._id,
        reason: rec.reason,
        lessonTitle: lesson.title,
        courseTitle: course?.title || 'Course',
        courseId: course?._id
      };
    }).filter((r: any) => r !== null && r.courseId);

    return fullRecommendations;
  } catch (error) {
    console.error('Recommendation Engine Error:', error);
    return buildFallbackRecommendations();
  }
});
