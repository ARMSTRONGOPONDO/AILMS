'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, CheckCircle, Award, AlertTriangle, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await axios.get('/api/tutor/analytics');
            setAnalytics(res.data.data.analytics || []);
        } catch (_error) {
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Loading analytics...</div>;

    return (
        <div className="space-y-8 text-left pb-20">
            <div>
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Course Analytics</h1>
                <p className="text-gray-500 text-sm">Detailed performance metrics across your courses.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {analytics.map((course, idx) => (
                    <div key={idx} className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
                        <div className="p-8 md:w-1/3 bg-gray-50 border-r border-gray-100 flex flex-col justify-center">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Course Name</span>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-4">{course.courseTitle}</h2>
                            <div className="flex items-center text-sm font-bold text-gray-500">
                                <Users className="h-4 w-4 mr-2 text-indigo-400" />
                                {course.studentCount} Students Enrolled
                            </div>
                        </div>
                        
                        <div className="p-8 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center text-xs font-black text-gray-400 uppercase tracking-widest">
                                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Completion Rate
                                    </div>
                                    <span className="text-sm font-black text-gray-900">{course.completionRate.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500" style={{ width: `${course.completionRate}%` }} />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center text-xs font-black text-gray-400 uppercase tracking-widest">
                                        <Award className="h-4 w-4 mr-2 text-yellow-500" /> Avg Quiz Score
                                    </div>
                                    <span className="text-sm font-black text-gray-900">{course.avgQuizScore.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500" style={{ width: `${course.avgQuizScore}%` }} />
                                </div>
                            </div>

                            <div className="bg-red-50/50 rounded-2xl p-6 border border-red-100">
                                <h3 className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center mb-4">
                                    <AlertTriangle className="h-3.5 w-3.5 mr-2" /> Top Difficulty Topics
                                </h3>
                                <div className="space-y-3">
                                    {course.mostFailedLessons.length > 0 ? course.mostFailedLessons.map((lesson: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-50 shadow-sm">
                                            <span className="text-xs font-bold text-gray-700 truncate mr-4">{lesson.lessonTitle}</span>
                                            <span className="text-[10px] font-black text-red-500 whitespace-nowrap">{lesson.avgScore.toFixed(0)}% AVG</span>
                                        </div>
                                    )) : (
                                        <div className="text-[10px] font-bold text-gray-400 italic">No major difficulty areas identified.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {analytics.length === 0 && (
                <div className="bg-white p-12 rounded-3xl border-2 border-dashed text-center space-y-4">
                    <BarChart3 className="h-12 w-12 text-gray-200 mx-auto" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">No analytics data available yet.</p>
                </div>
            )}
        </div>
    );
}
