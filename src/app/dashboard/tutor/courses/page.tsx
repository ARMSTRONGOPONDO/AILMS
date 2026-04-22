'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from '@/hooks/useSession';
import axios from 'axios';
import { Plus, Book, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ICourse } from '@/models/Course';

export default function TutorCoursesPage() {
  const { userId } = useSession();
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await axios.get(`/api/courses?tutorId=${userId}`);
      // apiHandler wraps response in .data.data
      setCourses(res.data.data.courses);
    } catch (_error) {
      toast.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchCourses();
    }
  }, [userId, fetchCourses]);

  const deleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await axios.delete(`/api/courses/${id}`);
      toast.success('Course deleted');
      fetchCourses();
    } catch (_error) {
      toast.error('Failed to delete course');
    }
  };

  if (loading) return <p>Loading courses...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <Link
          href="/dashboard/tutor/courses/new"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="-ml-0.5 mr-1.5 h-5 w-5" />
          Create Course
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course: any) => (
          <div key={course._id} className="flex flex-col rounded-lg border bg-white shadow-sm overflow-hidden">
            <div className="h-40 w-full relative bg-gray-200">
              {course.thumbnail && (
                <Image 
                  src={course.thumbnail} 
                  alt={course.title} 
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                  {course.category}
                </span>
                <span className={clsx(
                  "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                  course.isPublished ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                )}>
                  {course.isPublished ? "Published" : "Draft"}
                </span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-gray-900">{course.title}</h3>
              <p className="mt-1 flex-1 text-sm text-gray-500 line-clamp-2">{course.description}</p>
              
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <Link 
                  href={`/dashboard/tutor/courses/${course._id}/content`}
                  className="text-gray-400 hover:text-indigo-600"
                  title="Manage Content"
                >
                  <Book className="h-5 w-5" />
                </Link>
                <Link 
                  href={`/dashboard/tutor/courses/${course._id}/edit`}
                  className="text-gray-400 hover:text-blue-600"
                  title="Edit Details"
                >
                  <Edit className="h-5 w-5" />
                </Link>
                <button 
                  onClick={() => deleteCourse(course._id)}
                  className="text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {courses.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <Book className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No courses</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new course.</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { clsx } from 'clsx';
