'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Users, 
  BookOpen, 
  ShieldCheck, 
  Search, 
  Activity, 
  AlertCircle,
  ArrowRight,
  TrendingUp,
  UserX,
  PlusCircle,
  Settings,
  Cpu
} from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/dashboard/admin/stats');
      setData(res.data.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load admin stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIStatus = async () => {
    try {
      const res = await axios.get('/api/admin/ai-status');
      setAiStatus(res.data.data || res.data);
    } catch (_e) {
      // non-fatal
      setAiStatus(null);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAIStatus();
  }, []);

  if (loading) return <div className="flex justify-center p-12">Loading Admin Portal...</div>;
  if (!data) return <div>Failed to load data.</div>;

  return (
    <div className="space-y-8 text-left pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 font-medium">Global platform oversight and management.</p>
        </div>
        <div className="flex items-center space-x-3">
           <Link href="/dashboard/admin/settings" className="p-2 rounded-lg bg-white border shadow-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
             <Settings className="h-5 w-5" />
           </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 bg-blue-50/50 rounded-bl-full -mr-10 -mt-10 transition-all group-hover:bg-blue-100/50" />
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Total Users</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{data.totalUsers}</p>
          <Link href="/dashboard/admin/users" className="mt-4 flex items-center text-xs font-bold text-blue-600 hover:text-blue-700">
            Manage Users <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 bg-indigo-50/50 rounded-bl-full -mr-10 -mt-10 transition-all group-hover:bg-indigo-100/50" />
          <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
            <BookOpen className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Total Courses</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{data.totalCourses}</p>
          <Link href="/dashboard/admin/courses" className="mt-4 flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-700">
            Manage Courses <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 bg-green-50/50 rounded-bl-full -mr-10 -mt-10 transition-all group-hover:bg-green-100/50" />
          <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Enrollments</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{data.totalEnrollments}</p>
          <div className="mt-4 flex items-center text-xs font-bold text-green-600">
            <TrendingUp className="h-3 w-3 mr-1" /> Healthy Growth
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 bg-red-50/50 rounded-bl-full -mr-10 -mt-10 transition-all group-hover:bg-red-100/50" />
          <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 mb-4">
            <UserX className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Suspended</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{data.suspendedCount || 0}</p>
          <Link href="/dashboard/admin/users?status=suspended" className="mt-4 flex items-center text-xs font-bold text-red-600 hover:text-red-700">
            Review Access <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Actions Section */}
        <div className="lg:col-span-1 space-y-6">
           <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              Pending Actions
           </h2>
           <div className="space-y-4">
              {/* AI Status */}
              {aiStatus?.providers?.length > 0 && (
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900 flex items-center">
                      <Cpu className="h-4 w-4 text-indigo-600 mr-2" />
                      AI Status
                    </p>
                    <button
                      onClick={fetchAIStatus}
                      className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {aiStatus.providers.map((p: any) => (
                      <div key={p.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span
                            className={clsx(
                              'h-2.5 w-2.5 rounded-full',
                              p.status === 'active' ? 'bg-green-500' : p.status === 'minute_limited' ? 'bg-amber-500' : 'bg-red-500'
                            )}
                          />
                          <span className="font-bold text-gray-800 uppercase">{p.name}</span>
                        </div>
                        <span className="text-gray-500 font-medium">
                          {p.requestsToday}/{p.dailyLimit} ({p.percentUsed}%)
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px] text-gray-400 font-semibold">
                    Total today: {aiStatus.totalRequestsToday} • Recommended: {aiStatus.recommendedProvider}
                  </p>
                </div>
              )}
              {data.suspendedCount > 0 && (
                <div className="bg-white p-4 rounded-xl border-l-4 border-l-red-500 shadow-sm flex items-start">
                   <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">Suspended Users</p>
                      <p className="text-xs text-gray-500 mt-1">{data.suspendedCount} accounts require review.</p>
                      <Link href="/dashboard/admin/users?status=suspended" className="inline-block mt-3 text-[10px] font-black uppercase text-red-600 hover:underline tracking-widest">View List</Link>
                   </div>
                </div>
              )}
              {data.totalCourses > 0 && (
                <div className="bg-white p-4 rounded-xl border-l-4 border-l-amber-500 shadow-sm flex items-start">
                   <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">Content Review</p>
                      <p className="text-xs text-gray-500 mt-1">Audit draft courses for quality assurance.</p>
                      <Link href="/dashboard/admin/courses?status=draft" className="inline-block mt-3 text-[10px] font-black uppercase text-amber-600 hover:underline tracking-widest">Open Drafts</Link>
                   </div>
                </div>
              )}
              <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white">
                 <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Quick Create</p>
                 <h3 className="text-lg font-black mt-1">Onboard New Tutor</h3>
                 <p className="text-xs opacity-70 mt-2">Manually create a tutor account bypassing registration rules.</p>
                 <Link href="/dashboard/admin/users" className="mt-6 flex items-center justify-center w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20 font-bold text-sm">
                    <PlusCircle className="h-4 w-4 mr-2" /> Add User
                 </Link>
              </div>
           </div>
        </div>

        {/* Recent Registered Users */}
        <div className="lg:col-span-2 space-y-6 text-left">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <Activity className="h-5 w-5 text-indigo-500 mr-2" />
              Recent Platform Activity
            </h2>
          </div>
          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">User</th>
                            <th className="text-left px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                            <th className="text-left px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.users?.map((user: any) => (
                            <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 flex items-center">
                                    <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs mr-3">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900">{user.name}</p>
                                        <p className="text-[10px] text-gray-400">{user.email}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                        user.role === 'admin' ? "bg-red-100 text-red-700" :
                                        user.role === 'tutor' ? "bg-purple-100 text-purple-700" :
                                        "bg-blue-100 text-blue-700"
                                    )}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-xs font-medium">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
