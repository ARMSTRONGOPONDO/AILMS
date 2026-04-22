'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, Mail, ChevronDown, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface IStudentStats {
    studentId: string;
    name: string;
    email: string;
    courses: string[];
    avgProgress: number;
    avgScore: number;
}

export default function MyStudentsPage() {
    const [students, setStudents] = useState<IStudentStats[]>([]);
    const [courses, setCourses] = useState<{ _id: string, title: string }[]>([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const url = selectedCourse 
                ? `/api/tutor/students?courseId=${selectedCourse}` 
                : '/api/tutor/students';
            const res = await axios.get(url);
            setStudents(res.data.data.students || []);
            setCourses(res.data.data.tutorCourses || []);
        } catch (_error) {
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    }, [selectedCourse]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const allowQuizRetake = async (student: IStudentStats) => {
        const quizId = window.prompt(`Enter quiz ID to unlock one retake for ${student.name}:`);
        if (!quizId) return;

        try {
            await axios.post(`/api/quizzes/${quizId}/retake`, {
                studentId: student.studentId,
                allowed: true
            });
            toast.success(`Retake unlocked for ${student.name}`);
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to unlock retake');
        }
    };

    return (
        <div className="space-y-8 text-left pb-20">
            <div>
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">My Students</h1>
                <p className="text-gray-500 text-sm">Monitor your students' progress and performance across all courses.</p>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search students by name or email..."
                        className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select 
                        className="pl-10 pr-8 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm appearance-none bg-white min-w-[200px]"
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                    >
                        <option value="">All Courses</option>
                        {courses.map(c => (
                            <option key={c._id} value={c._id}>{c.title}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Student</th>
                                <th className="text-left px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Enrolled Courses</th>
                                <th className="text-left px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Overall Progress</th>
                                <th className="text-left px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Avg Score</th>
                                <th className="text-right px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                [1,2,3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredStudents.length > 0 ? (
                                filteredStudents.map((student, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-4">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{student.name}</p>
                                                    <p className="text-xs text-gray-500 flex items-center"><Mail className="h-3 w-3 mr-1" /> {student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {student.courses.map((c: string, i: number) => (
                                                    <span key={i} className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-600 border">
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-32">
                                                <div className="flex justify-between mb-1 text-[10px] font-bold">
                                                    <span>{student.avgProgress.toFixed(0)}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={clsx(
                                                            "h-full transition-all duration-500",
                                                            student.avgProgress > 70 ? "bg-green-500" : student.avgProgress > 30 ? "bg-amber-500" : "bg-red-500"
                                                        )}
                                                        style={{ width: `${student.avgProgress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest",
                                                student.avgScore >= 70 ? "bg-green-100 text-green-700" : 
                                                student.avgScore >= 40 ? "bg-amber-100 text-amber-700" : 
                                                "bg-red-100 text-red-700"
                                            )}>
                                                {student.avgScore.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {student.avgScore < 40 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-red-50 text-red-600 border border-red-100">
                                                        AT RISK
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-green-50 text-green-600 border border-green-100">
                                                        STABLE
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => allowQuizRetake(student)}
                                                    className="inline-flex items-center px-3 py-1 rounded text-[10px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                                >
                                                    Allow Quiz Retake
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">No students found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
