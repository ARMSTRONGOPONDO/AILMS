'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, User, CheckCircle, Info, Clock, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface INotification {
    _id: string;
    type: string;
    message: string;
    read: boolean;
    createdAt: string;
}

export default function TutorNotificationsPage() {
    const [notifications, setNotifications] = useState<INotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get('/api/notifications');
            setNotifications(res.data.data || []);
        } catch (error) {
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await axios.put(`/api/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
        } catch (error) {
            toast.error('Failed to mark as read');
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await axios.delete(`/api/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n._id !== id));
            toast.success('Notification deleted');
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'enrollment': return <User className="h-5 w-5 text-blue-500" />;
            case 'quiz_submission': return <CheckCircle className="h-5 w-5 text-green-500" />;
            default: return <Info className="h-5 w-5 text-gray-500" />;
        }
    };

    if (loading) return <div className="p-8">Loading notifications...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 text-left pb-20">
            <div>
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Notifications</h1>
                <p className="text-gray-500 text-sm">Stay updated with student enrollments and quiz submissions.</p>
            </div>

            <div className="space-y-4">
                {notifications.length > 0 ? (
                    notifications.map((n) => (
                        <div 
                            key={n._id}
                            className={clsx(
                                "p-6 rounded-3xl border-2 transition-all flex items-start space-x-6",
                                n.read ? "bg-white border-gray-100" : "bg-indigo-50/30 border-indigo-100 shadow-sm"
                            )}
                        >
                            <div className={clsx(
                                "h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner",
                                n.read ? "bg-gray-50" : "bg-white"
                            )}>
                                {getIcon(n.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={clsx("text-sm leading-relaxed", n.read ? "text-gray-600" : "text-gray-900 font-bold")}>
                                    {n.message}
                                </p>
                                <div className="mt-2 flex items-center space-x-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {new Date(n.createdAt).toLocaleString()}</span>
                                    {!n.read && (
                                        <button onClick={() => markAsRead(n._id)} className="text-indigo-600 hover:underline">Mark as read</button>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={() => deleteNotification(n._id)}
                                className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-all"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    ))
                ) : (
                        <div className="bg-white p-12 rounded-3xl border-2 border-dashed text-center space-y-4">
                        <Bell className="h-12 w-12 text-gray-100 mx-auto" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">You&apos;re all caught up!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
