'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { Search, Filter, BookOpen, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, enrollmentsRes] = await Promise.all([
        axios.get('/api/courses'),
        axios.get('/api/enrollments')
      ]);
      
      const coursesData = coursesRes.data.data?.courses || [];
      const enrollmentsData = enrollmentsRes.data.data || [];
      
      setCourses(coursesData);
      setEnrollments(enrollmentsData.filter((e: any) => e.courseId).map((e: any) => e.courseId._id));
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const enroll = async (courseId: string) => {
    try {
      await axios.post('/api/enrollments', { courseId });
      toast.success('Enrolled successfully!');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Enrollment failed');
    }
  };

  const filteredCourses = courses.filter((course: any) => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || course.category === category;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'Engineering', 'Data Science', 'Technology', 'Science', 'Math', 'Programming', 'Design'];

  if (loading) return <p>Loading courses...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Discover Courses</h1>
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              className="pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              className="pl-10 pr-8 py-2 rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm appearance-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCourses.map((course: any) => (
          <div key={course._id} className="flex flex-col rounded-lg border bg-white shadow-sm overflow-hidden">
            <div className="h-40 w-full relative bg-gray-200">
              {course.thumbnail ? (
                <Image src={course.thumbnail} alt={course.title} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                   <BookOpen className="h-12 w-12" />
                </div>
              )}
            </div>
            <div className="p-4 flex flex-1 flex-col">
              <span className="text-xs font-medium text-indigo-600 uppercase tracking-wider">
                {course.category}
              </span>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">{course.title}</h3>
              
              <div className="mt-3 flex items-center text-sm text-gray-500">
                <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                  <User className="h-3 w-3" />
                </div>
                <span>{course.tutorId.name}</span>
              </div>

              <div className="mt-auto pt-4 flex items-center justify-between">
                {enrollments.includes(course._id) ? (
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    Enrolled
                  </span>
                ) : (
                  <button
                    onClick={() => enroll(course._id)}
                    className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm font-semibold"
                  >
                    Enroll Now
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No courses found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
