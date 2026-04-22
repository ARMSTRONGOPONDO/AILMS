'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ShieldCheck, 
  Search, 
  Trash2, 
  Eye, 
  Globe, 
  Lock,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Users,
  BookOpen
} from 'lucide-react';
import { clsx } from 'clsx';

export default function CourseManagementPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Detail Modal State
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [courseContent, setCourseContent] = useState<any>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/courses', {
        params: { status: statusFilter }
      });
      setCourses(res.data.data.courses);
      setStats(res.data.data.stats);
    } catch (error) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleTogglePublish = async (course: any) => {
    try {
      await axios.put(`/api/admin/courses/${course._id}`, {
        isPublished: !course.isPublished
      });
      toast.success(course.isPublished ? 'Course unpublished' : 'Course published');
      fetchCourses();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure? This will delete all content and enrollments for this course.')) return;
    try {
      await axios.delete(`/api/admin/courses/${id}`);
      toast.success('Course deleted');
      fetchCourses();
    } catch (error) {
      toast.error('Failed to delete course');
    }
  };

  const viewCourseDetail = async (courseId: string) => {
    setLoadingDetail(true);
    setSelectedCourse(courses.find(c => c._id === courseId));
    try {
      const res = await axios.get(`/api/courses/${courseId}`);
      setCourseContent(res.data.data);
    } catch (error) {
      toast.error('Failed to load course details');
      setSelectedCourse(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
          <p className="text-sm text-gray-500">Monitor, publish, and manage all academic content.</p>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center">
            <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center text-green-600 mr-4">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Published</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPublished}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center">
            <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 mr-4">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Drafts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDraft}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center">
            <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Enrollments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEnrollments}</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center space-x-4">
        <div className="flex bg-gray-100 p-1 rounded-lg">
           <button 
            onClick={() => setStatusFilter('all')}
            className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", statusFilter === 'all' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500")}
           >All</button>
           <button 
            onClick={() => setStatusFilter('published')}
            className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", statusFilter === 'published' ? "bg-white shadow-sm text-green-600" : "text-gray-500")}
           >Published</button>
           <button 
            onClick={() => setStatusFilter('draft')}
            className={clsx("px-4 py-1.5 text-xs font-bold rounded-md transition-all", statusFilter === 'draft' ? "bg-white shadow-sm text-amber-600" : "text-gray-500")}
           >Drafts</button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-600 uppercase tracking-wider">Course</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600 uppercase tracking-wider">Tutor</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600 uppercase tracking-wider">Enrollments</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                  </td>
                </tr>
              ) : courses.length > 0 ? (
                courses.map((course) => (
                  <tr key={course._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900">{course.title}</p>
                        <p className="text-xs text-gray-400 uppercase tracking-tighter font-bold">{course.category}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium text-left">
                      {course.tutorId?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center text-indigo-600 font-bold">
                        <Users className="h-3 w-3 mr-1.5" />
                        {course.enrollmentCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <span className={clsx(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        course.isPublished ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {course.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                       <button
                        onClick={() => viewCourseDetail(course._id)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Content"
                       >
                         <Eye className="h-4 w-4" />
                       </button>
                       <button
                        onClick={() => handleTogglePublish(course)}
                        className={clsx(
                          "p-2 rounded-lg transition-colors",
                          course.isPublished ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"
                        )}
                        title={course.isPublished ? 'Unpublish' : 'Publish'}
                       >
                         {course.isPublished ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                       </button>
                       <button
                        onClick={() => handleDeleteCourse(course._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Course"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No courses found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
           <div className="w-full max-w-4xl h-[85vh] rounded-2xl bg-white flex flex-col shadow-2xl overflow-hidden text-left">
              <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                 <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedCourse.title}</h2>
                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mt-1">Curriculum Preview</p>
                 </div>
                 <button onClick={() => setSelectedCourse(null)} className="p-2 hover:bg-gray-200 rounded-full"><X /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                 {loadingDetail ? (
                   <div className="flex flex-col items-center justify-center h-full space-y-4">
                      <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                      <p className="text-gray-400 font-medium">Fetching curriculum data...</p>
                   </div>
                 ) : (
                   <div className="space-y-6">
                      {courseContent?.modules?.map((mod: any, idx: number) => (
                        <div key={mod._id} className="border rounded-xl overflow-hidden">
                           <div className="bg-gray-50 p-4 border-b flex items-center justify-between">
                              <h3 className="font-bold text-gray-800">Module {idx+1}: {mod.title}</h3>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">{mod.lessons?.length || 0} Lessons</span>
                           </div>
                           <div className="divide-y">
                              {mod.lessons?.map((lesson: any) => (
                                <div key={lesson._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                   <div className="flex items-center">
                                      <div className="h-8 w-8 rounded bg-white border flex items-center justify-center text-indigo-600 mr-3">
                                         <BookOpen className="h-4 w-4" />
                                      </div>
                                      <div>
                                         <p className="text-sm font-semibold text-gray-700">{lesson.title}</p>
                                         <p className="text-[10px] text-gray-400 uppercase font-bold">{lesson.contentType}</p>
                                      </div>
                                   </div>
                                </div>
                              ))}
                              {(!mod.lessons || mod.lessons.length === 0) && (
                                <p className="p-4 text-xs text-gray-400 italic">No lessons in this module.</p>
                              )}
                           </div>
                        </div>
                      ))}
                      {(!courseContent?.modules || courseContent.modules.length === 0) && (
                        <div className="text-center py-20">
                           <BookOpen className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                           <p className="text-gray-400">This course has no modules yet.</p>
                        </div>
                      )}
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
