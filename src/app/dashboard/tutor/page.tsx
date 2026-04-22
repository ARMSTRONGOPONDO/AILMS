'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Users, GraduationCap, Award, AlertTriangle, Activity, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TutorDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    axios.get('/api/dashboard/tutor', { signal: controller.signal })
      .then(res => {
        if (isMounted) {
          setData(res.data.data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (axios.isCancel(err) || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
           return;
        }
        console.error(err);
        if (isMounted) {
          toast.error('Failed to load tutor dashboard');
          setLoading(false);
        }
      });
    return () => { 
      isMounted = false;
      controller.abort();
    };
  }, []);

  if (loading) return <div className="flex justify-center p-12">Loading...</div>;
  if (!data) return <div>Failed to load data.</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tutor Overview</h1>
          <p className="text-gray-500 text-sm">Monitor your courses and student performance.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-xl border shadow-sm text-left">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
            <BookOpen className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Total Courses</p>
          <p className="text-2xl font-bold text-gray-900">{data.totalCourses}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm text-left">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Total Students</p>
          <p className="text-2xl font-bold text-gray-900">{data.totalStudents}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm text-left">
          <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 mb-4">
            <GraduationCap className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Quizzes Created</p>
          <p className="text-2xl font-bold text-gray-900">{data.totalQuizzes}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm text-left">
          <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 mb-4">
            <BarChart3 className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Avg. Class Score</p>
          <p className="text-2xl font-bold text-gray-900">{data.avgClassScore?.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* At-Risk Students */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            At-Risk Students
          </h2>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {data.atRiskStudents?.map((item: any) => (
                <div key={item._id} className="p-4 flex items-center justify-between hover:bg-red-50/30 transition-colors">
                  <div className="flex items-center">
                    <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold mr-3">
                      {item.student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 text-left">{item.student.name}</p>
                      <p className="text-xs text-gray-500">{item.student.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{(item.avgScore * 100).toFixed(0)}%</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Avg Score</p>
                  </div>
                </div>
              ))}
              {data.atRiskStudents?.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No at-risk students identified. Great job!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Activity className="h-5 w-5 text-indigo-500 mr-2" />
            Recent Activity
          </h2>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
             <div className="divide-y divide-gray-100">
                {data.recentActivity?.map((activity: any) => (
                  <div key={activity._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                        <div className="h-8 w-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 mr-3">
                            <Award className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm text-gray-900">
                                <span className="font-bold">{activity.studentId.name}</span> completed <span className="font-medium text-indigo-600">{activity.quizId?.title || 'a quiz'}</span>
                            </p>
                            <p className="text-[10px] text-gray-400 uppercase">{new Date(activity.submittedAt).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="text-sm font-bold text-gray-700">
                        {activity.score}/{activity.totalQuestions}
                    </div>
                  </div>
                ))}
                {data.recentActivity?.length === 0 && (
                   <div className="p-8 text-center text-gray-500 text-sm">No recent activity.</div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
