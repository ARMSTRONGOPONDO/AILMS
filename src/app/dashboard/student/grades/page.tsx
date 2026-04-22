'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Award, CheckCircle, XCircle, ChevronRight, BarChart3, TrendingUp, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import Link from 'next/link';

export default function StudentGradesPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGrades = async () => {
            try {
                const res = await axios.get('/api/student/grades');
                setData(res.data.data);
            } catch (error) {
                toast.error('Failed to load grades');
            } finally {
                setLoading(false);
            }
        };
        fetchGrades();
    }, []);

    if (loading) return <div className="p-8">Loading your academic record...</div>;
    if (!data) return <div className="p-8 text-center">No grade records found.</div>;

    const { stats } = data;

    return (
        <div className="space-y-12 text-left pb-20">
            <div>
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Academic Transcript</h1>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">Detailed performance across assignments and quizzes</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-100 flex flex-col justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Avg Assignment</p>
                    <h2 className="text-4xl font-black tracking-tighter mt-4">{stats.avgAssignmentGrade.toFixed(1)}%</h2>
                </div>
                <div className="bg-white border-2 border-gray-50 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Quiz Score</p>
                    <h2 className="text-4xl font-black text-indigo-600 tracking-tighter mt-4">{stats.avgQuizScore.toFixed(1)}%</h2>
                </div>
                <div className="bg-white border-2 border-gray-50 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assignments Passed</p>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tighter mt-4">{stats.assignmentsPassed} <span className="text-xl text-gray-300">/ {stats.totalAssignments}</span></h2>
                </div>
                <div className="bg-white border-2 border-gray-50 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quizzes Passed</p>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tighter mt-4">{stats.quizzesPassed} <span className="text-xl text-gray-300">/ {stats.totalQuizzes}</span></h2>
                </div>
            </div>

            {/* Assignments Section */}
            <div className="space-y-6">
                <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <BookOpen className="h-4 w-4" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Assignment History</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-gray-50 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Assignment</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Course</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">AI Grade</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Final Grade</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.assignments.map((sub: any) => (
                                <tr key={sub._id} className="hover:bg-gray-50/50 transition-all group">
                                    <td className="px-8 py-6">
                                        <p className="font-black text-gray-900 text-sm tracking-tight">{sub.assignmentId?.title}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{new Date(sub.submittedAt).toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">{sub.courseId?.title}</span>
                                    </td>
                                    <td className="px-8 py-6 text-center font-bold text-blue-500 text-sm">{sub.aiGrade || '--'}%</td>
                                    <td className="px-8 py-6 text-center">
                                        {sub.finalGrade !== undefined ? (
                                            <span className={clsx("text-lg font-black tracking-tighter", sub.isPassing ? "text-green-600" : "text-red-600")}>
                                                {sub.finalGrade}%
                                            </span>
                                        ) : <span className="text-gray-300 font-bold">--</span>}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center">
                                            {sub.status === 'graded' ? (
                                                <div className="flex items-center text-green-600 font-black text-[10px] uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                                    <CheckCircle className="h-3 w-3 mr-2" /> Confirmed
                                                </div>
                                            ) : sub.status === 'ai_reviewed' ? (
                                                <div className="flex items-center text-blue-600 font-black text-[10px] uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                                    <BarChart3 className="h-3 w-3 mr-2" /> AI Reviewed
                                                </div>
                                            ) : (
                                                <div className="flex items-center text-gray-400 font-black text-[10px] uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                                    <TrendingUp className="h-3 w-3 mr-2 animate-pulse" /> Pending
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <Link 
                                            href={`/dashboard/student/courses/${sub.courseId?._id}/learn`}
                                            className="p-2 hover:bg-white border-2 border-transparent hover:border-gray-100 rounded-xl transition-all inline-block group-hover:translate-x-1"
                                        >
                                            <ChevronRight className="h-5 w-5 text-gray-400" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {data.assignments.length === 0 && (
                                <tr><td colSpan={6} className="px-8 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">No assignments submitted yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quizzes Section */}
            <div className="space-y-6">
                <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Award className="h-4 w-4" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Quiz Results</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-gray-50 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Quiz Title</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Lesson Context</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Raw Score</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Percentage</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Result</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.quizzes.map((q: any) => {
                                const pct = (q.score / q.totalQuestions) * 100;
                                const passed = pct >= 60;
                                return (
                                    <tr key={q._id} className="hover:bg-gray-50/50 transition-all">
                                        <td className="px-8 py-6">
                                            <p className="font-black text-gray-900 text-sm tracking-tight">{q.quizId?.title}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{q.courseTitle}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg uppercase tracking-widest">{q.lessonTitle}</span>
                                        </td>
                                        <td className="px-8 py-6 text-center font-bold text-gray-600 text-sm">{q.score} / {q.totalQuestions}</td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={clsx("text-lg font-black tracking-tighter", passed ? "text-green-600" : "text-red-600")}>
                                                {pct.toFixed(0)}%
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            {passed ? (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-green-50 text-green-700 border border-green-100 uppercase tracking-widest">
                                                    <Star className="h-3 w-3 mr-2 fill-current" /> Passed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-100 uppercase tracking-widest">
                                                    <XCircle className="h-3 w-3 mr-2" /> Failed
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase">
                                            {new Date(q.submittedAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                );
                            })}
                            {data.quizzes.length === 0 && (
                                <tr><td colSpan={6} className="px-8 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">No quizzes taken yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
