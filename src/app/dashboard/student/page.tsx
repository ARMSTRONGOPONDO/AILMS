'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '@/hooks/useSession';
import { BookOpen, CheckCircle, Award, PlayCircle, MessageCircle, LayoutGrid, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

export default function StudentDashboard() {
  const { user } = useSession();
  const [data, setData] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
        try {
            const [dashRes, enrollRes] = await Promise.all([
                axios.get('/api/dashboard/student'),
                axios.get('/api/enrollments')
            ]);
            
            if (isMounted) {
                setData(dashRes.data.data);
                
                const enrollments = enrollRes.data.data || [];
                const coursesWithProgress = await Promise.all(enrollments.map(async (e: any) => {
                    if (!e.courseId || !e.courseId._id) return null;
                    try {
                        const progressRes = await axios.get(`/api/progress/${e.courseId._id}`);
                        return {
                            ...e.courseId,
                            progress: progressRes.data.data
                        };
                    } catch (err) {
                        return {
                            ...e.courseId,
                            progress: { percentage: 0, completedLessons: 0, totalLessons: 0 }
                        };
                    }
                }));
                setCourses(coursesWithProgress.filter(Boolean));
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            if (isMounted) {
                toast.error('Failed to load dashboard');
                setLoading(false);
            }
        }
    };

    fetchData();

    // Fetch AI recommendations
    axios.post('/api/ai/recommend-next-lesson', {}, { timeout: 15000 })
      .then(res => {
        if (isMounted && res.data.success) {
            setRecommendations(res.data.data);
        }
      })
      .catch(err => {
        console.error('Failed to load recommendations', err);
      })
      .finally(() => {
        if (isMounted) setLoadingRecs(false);
      });

    return () => { isMounted = false; };
  }, []);

  if (loading) return <div className="flex justify-center p-12">Loading...</div>;
  if (!data) return <div>Failed to load data.</div>;

  return (
    <div className="space-y-8 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
          <p className="text-gray-500 text-sm">Here is what&apos;s happening with your learning today.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center">
          <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Enrolled Courses</p>
            <p className="text-2xl font-bold text-gray-900">{data.enrolledCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center">
          <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center text-green-600 mr-4">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Lessons Completed</p>
            <p className="text-2xl font-bold text-gray-900">{data.completedLessonsCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center">
          <div className="h-12 w-12 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600 mr-4">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Avg. Quiz Score</p>
            <p className="text-2xl font-bold text-gray-900">{(data.avgQuizScore || 0).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
            Recommended for You (AI)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loadingRecs ? (
                [1,2,3].map(i => <div key={i} className="bg-white p-6 rounded-xl border border-purple-100 h-32 animate-pulse" />)
            ) : recommendations.length > 0 ? (
                recommendations.map((rec: any, idx: number) => (
                    <Link key={idx} href={`/dashboard/student/courses/${rec.courseId}/learn`}>
                        <div className="bg-white p-5 rounded-xl border-2 border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all h-full flex flex-col text-left">
                            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-tighter mb-2">{rec.courseTitle}</span>
                            <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{rec.lessonTitle}</h3>
                            <p className="text-xs text-gray-500 line-clamp-2 flex-1 italic">"{rec.reason}"</p>
                            <div className="mt-4 flex items-center text-purple-600 text-xs font-bold uppercase tracking-widest">
                                Study Next <ArrowRight className="h-3 w-3 ml-1" />
                            </div>
                        </div>
                    </Link>
                ))
            ) : (
                <div className="col-span-full bg-gray-50 p-6 rounded-xl border border-dashed text-center text-sm text-gray-500">
                    Complete more lessons and quizzes to get personalized recommendations!
                </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Continue Learning */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Continue Learning</h2>
          <div className="grid gap-4">
            {courses.map((course: any) => (
              <Link key={course._id} href={`/dashboard/student/courses/${course._id}/learn`}>
                <div className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4">
                        <LayoutGrid className="h-5 w-5" />
                        </div>
                        <div>
                        <p className="font-semibold text-gray-900">{course.title}</p>
                        <p className="text-xs text-gray-500">Tutor: {course.tutorId?.name || 'Tutor'}</p>
                        </div>
                    </div>
                    <PlayCircle className="h-8 w-8 text-indigo-600" />
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4 border-t pt-4">
                     <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div 
                            className="h-full bg-indigo-600 transition-all duration-500" 
                            style={{ width: `${course.progress?.percentage || 0}%` }}
                        />
                     </div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                        {course.progress?.completedLessons || 0} of {course.progress?.totalLessons || 0} lessons completed — {course.progress?.percentage || 0}%
                     </p>
                  </div>
                </div>
              </Link>
            ))}
            {courses.length === 0 && (
                <div className="bg-white p-8 rounded-xl border border-dashed text-center text-gray-500 text-sm">
                    You haven&apos;t enrolled in any courses yet.
                </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-3">
             <Link href="/dashboard/student/courses" className="flex items-center p-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium text-sm transition-colors">
                <BookOpen className="h-4 w-4 mr-2" /> Browse Courses
             </Link>
             <Link href="/dashboard/student/chat" className="flex items-center p-3 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium text-sm transition-colors">
                <MessageCircle className="h-4 w-4 mr-2" /> Chat with AI Tutor
             </Link>
             <Link href="/dashboard/student/my-courses" className="flex items-center p-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-colors">
                <LayoutGrid className="h-4 w-4 mr-2" /> View All My Courses
             </Link>
          </div>
        </div>
      </div>

      {/* Recent Quiz Results */}
      <div className="space-y-4">
         <h2 className="text-lg font-bold text-gray-900">Recent Quiz Results</h2>
         <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="text-left px-6 py-3 font-semibold text-gray-600 uppercase tracking-wider">Quiz</th>
                        <th className="text-left px-6 py-3 font-semibold text-gray-600 uppercase tracking-wider">Score</th>
                        <th className="text-left px-6 py-3 font-semibold text-gray-600 uppercase tracking-wider text-right">Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.recentQuizResults?.map((r: any) => (
                        <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">{r.quizId?.title || 'Unknown Quiz'}</td>
                            <td className="px-6 py-4">
                                <span className={clsx(
                                    "px-2 py-1 rounded text-[10px] font-bold uppercase",
                                    (r.score / r.totalQuestions) >= 0.7 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                )}>
                                    {r.score}/{r.totalQuestions} ({(r.score/r.totalQuestions * 100).toFixed(0)}%)
                                </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500 text-right">
                                {new Date(r.submittedAt).toLocaleDateString()}
                            </td>
                        </tr>
                    ))}
                    {data.recentQuizResults?.length === 0 && (
                        <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">No quizzes taken yet.</td></tr>
                    )}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
