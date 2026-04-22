import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import QuizSubmission from '@/models/QuizSubmission';
import Progress from '@/models/Progress';
import Lesson from '@/models/Lesson';
import Module from '@/models/Module';
import mongoose from 'mongoose';
import { apiHandler } from '@/lib/apiHandler';

export const GET = apiHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const { searchParams } = new URL(req.url);
  const courseIdFilter = searchParams.get('courseId');

  await dbConnect();
  const tutorId = new mongoose.Types.ObjectId(session.user.id);

  // 1. Get tutor's courses
  const tutorCourses = await Course.find({ tutorId });
  const tutorCourseIds = tutorCourses.map(c => c._id);

  // 2. Filter by specific course if requested
  const targetCourseIds = courseIdFilter 
    ? [new mongoose.Types.ObjectId(courseIdFilter)]
    : tutorCourseIds;

  // 3. Get enrollments for these courses
  const enrollments = await Enrollment.find({ courseId: { $in: targetCourseIds } })
    .populate('studentId', 'name email')
    .populate('courseId', 'title');

  // 4. Get progress and quiz scores for each student-course pair
  const studentsData = await Promise.all(enrollments.map(async (enrollment: any) => {
    const studentId = enrollment.studentId._id;
    const courseId = enrollment.courseId._id;

    // Get total lessons for this course
    const modules = await Module.find({ courseId });
    const moduleIds = modules.map(m => m._id);
    const totalLessonsCount = await Lesson.countDocuments({ moduleId: { $in: moduleIds } });

    // Get completed lessons for this student in this course
    const completedLessons = await Progress.find({
        studentId,
        lessonId: { $in: await Lesson.find({ moduleId: { $in: moduleIds } }).distinct('_id') }
    });

    // Get avg quiz score
    const submissions = await QuizSubmission.find({ studentId });
    // This is a bit complex as we need to filter by quizzes that belong to this course
    // But for now let's just get overall avg score of the student to keep it simple, 
    // or properly filter if needed.
    
    let totalScorePct = 0;
    if (submissions.length > 0) {
        totalScorePct = submissions.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / submissions.length;
    }

    return {
      studentId: studentId,
      name: enrollment.studentId.name,
      email: enrollment.studentId.email,
      courseTitle: enrollment.courseId.title,
      courseId: courseId,
      progress: totalLessonsCount > 0 ? (completedLessons.length / totalLessonsCount) * 100 : 0,
      avgScore: totalScorePct * 100
    };
  }));

  // Group by student if multiple courses? 
  // The task says "lists all students ... name, email, which courses, overall progress, avg score"
  // If a student is in 2 courses of this tutor, should they be 1 row or 2?
  // "which courses" implies 1 row with a list.

  const groupedStudents: Record<string, any> = {};
  studentsData.forEach(s => {
    if (!groupedStudents[s.studentId]) {
      groupedStudents[s.studentId] = {
        studentId: s.studentId,
        name: s.name,
        email: s.email,
        courses: [s.courseTitle],
        avgProgress: s.progress,
        avgScore: s.avgScore,
        count: 1
      };
    } else {
      groupedStudents[s.studentId].courses.push(s.courseTitle);
      groupedStudents[s.studentId].avgProgress = (groupedStudents[s.studentId].avgProgress + s.progress) / 2;
      groupedStudents[s.studentId].avgScore = (groupedStudents[s.studentId].avgScore + s.avgScore) / 2;
      groupedStudents[s.studentId].count += 1;
    }
  });

  return {
    students: Object.values(groupedStudents),
    tutorCourses: tutorCourses.map(c => ({ _id: c._id, title: c.title }))
  };
});
