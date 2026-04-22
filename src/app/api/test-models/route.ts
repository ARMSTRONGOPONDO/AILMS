import { NextResponse } from 'next/server';
import User from '@/models/User';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import Enrollment from '@/models/Enrollment';
import Progress from '@/models/Progress';
import Quiz from '@/models/Quiz';
import QuizSubmission from '@/models/QuizSubmission';
import ChatSession from '@/models/ChatSession';
import Notification from '@/models/Notification';

export async function GET() {
  return NextResponse.json({
    models: {
      User: !!User,
      Course: !!Course,
      Module: !!Module,
      Lesson: !!Lesson,
      Enrollment: !!Enrollment,
      Progress: !!Progress,
      Quiz: !!Quiz,
      QuizSubmission: !!QuizSubmission,
      ChatSession: !!ChatSession,
      Notification: !!Notification,
    },
  });
}
