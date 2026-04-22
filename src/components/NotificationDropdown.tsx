'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Bell, BookOpen, GraduationCap, Info, X, Users, Award } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface INotification {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const isAbortError = (error: unknown) => {
    if (!axios.isAxiosError(error)) return false;
    return (
      error.code === 'ERR_CANCELED' ||
      error.message?.toLowerCase().includes('aborted') ||
      error.message?.toLowerCase().includes('canceled')
    );
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get('/api/notifications');
      // apiHandler wraps response in .data.data or .data
      const data = res.data.data || [];
      setNotifications(data);
      setUnreadCount(data.length);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error('Failed to fetch notifications');
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30 seconds polling
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch (_error) {
      console.error('Failed to mark all as read');
    }
  };

  const handleNotificationClick = async (notif: INotification) => {
    try {
      await axios.put(`/api/notifications/${notif._id}/read`);
      setNotifications(prev => prev.filter(n => n._id !== notif._id));
      setUnreadCount(prev => prev - 1);
      setIsOpen(false);

      // Navigate based on type
      if (notif.type === 'enrollment' || notif.type === 'quiz_submission') {
        router.push('/dashboard/tutor');
      } else if (notif.type === 'course_update' || notif.type === 'new_quiz') {
        router.push('/dashboard/student/my-courses');
      }
    } catch (_error) {
      console.error('Failed to handle notification click');
    }
  };

  const markAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setUnreadCount(prev => prev - 1);
    } catch (_error) {
      console.error('Failed to mark as read');
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'enrollment': return <Users className="h-4 w-4 text-blue-500" />;
      case 'quiz_submission': return <Award className="h-4 w-4 text-green-500" />;
      case 'course_update': return <BookOpen className="h-4 w-4 text-indigo-500" />;
      case 'new_quiz': return <GraduationCap className="h-4 w-4 text-purple-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors rounded-full hover:bg-gray-100"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div 
                  key={notif._id} 
                  onClick={() => handleNotificationClick(notif)}
                  className="p-4 hover:bg-gray-50 transition-colors group relative text-left w-full cursor-pointer"
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">{getIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatRelativeTime(notif.createdAt)}</p>
                    </div>
                    <button 
                      onClick={(e) => markAsRead(e, notif._id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 text-xs">
                No new notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
