'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyCoursesPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const res = await axios.get('/api/enrollments');
      const rawEnrollments = res.data.data || [];
      
      // Filter out enrollments with missing course data (in case a course was deleted)
      const validEnrollments = rawEnrollments.filter((e: any) => e.courseId && e.courseId._id);

      const enrollmentsWithProgress = await Promise.all(
        validEnrollments.map(async (e: any) => {
          try {
            const progressRes = await axios.get(`/api/progress/${e.courseId._id}`);
            return { ...e, progress: progressRes.data.data };
          } catch (err) {
            console.error(`Failed to fetch progress for course ${e.courseId._id}`, err);
            return { ...e, progress: { percentage: 0, completedLessons: 0, totalLessons: 0 } };
          }
        })
      );
      setEnrollments(enrollmentsWithProgress as any);
    } catch (error) {
      toast.error('Failed to fetch enrollments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading your courses...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Learning</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {enrollments.map((e: any) => (
          <div key={e._id} className="flex flex-col rounded-lg border bg-white shadow-sm overflow-hidden">
            <div className="h-32 w-full relative bg-gray-200">
              {e.courseId.thumbnail ? (
                <Image src={e.courseId.thumbnail} alt={e.courseId.title} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                   <BookOpen className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="p-4 space-y-4">
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{e.courseId.title}</h3>
                <p className="text-sm text-gray-500">by {e.courseId.tutorId?.name || 'Unknown Tutor'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-600">Progress</span>
                  <span className="text-indigo-600">{(e.progress?.percentage || 0)}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-500" 
                    style={{ width: `${(e.progress?.percentage || 0)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-left">
                  {(e.progress?.completedLessons || 0)} / {(e.progress?.totalLessons || 0)} Lessons
                </p>
              </div>

              <Link
                href={`/dashboard/student/courses/${e.courseId._id}/learn`}
                className="flex items-center justify-center w-full bg-indigo-50 text-indigo-700 py-2 rounded-md hover:bg-indigo-100 transition-colors text-sm font-semibold"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Continue Learning
              </Link>
            </div>
          </div>
        ))}
        {enrollments.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No courses yet</h3>
            <p className="mt-1 text-sm text-gray-500">You haven&apos;t enrolled in any courses yet.</p>
            <Link 
              href="/dashboard/student/courses"
              className="mt-4 inline-block text-indigo-600 font-semibold"
            >
              Browse Courses
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
