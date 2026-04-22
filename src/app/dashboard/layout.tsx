'use client';

import { useSession } from '@/hooks/useSession';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { 
  LayoutDashboard, 
  BookOpen, 
  PlusCircle, 
  LogOut, 
  User as UserIcon,
  MessageSquare,
  Menu,
  X,
  Users,
  Settings,
  ShieldCheck,
  BarChart3,
  Award
} from 'lucide-react';
import { clsx } from 'clsx';
import ChatWidgetWrapper from '@/components/ChatWidgetWrapper';
import NotificationDropdown from '@/components/NotificationDropdown';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, isLoading, isAuthenticated } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
      </div>
    );
  }

  const navigation = [
    { name: 'Dashboard', href: role === 'admin' ? '/dashboard/admin' : '/dashboard', icon: LayoutDashboard },
    ...(role === 'admin'
      ? [
          { name: 'User Management', href: '/dashboard/admin/users', icon: Users },
          { name: 'Course Management', href: '/dashboard/admin/courses', icon: ShieldCheck },
          { name: 'System Settings', href: '/dashboard/admin/settings', icon: Settings },
        ]
      : role === 'tutor'
      ? [
          { name: 'My Courses', href: '/dashboard/tutor/courses', icon: BookOpen },
          { name: 'Create Course', href: '/dashboard/tutor/courses/new', icon: PlusCircle },
          { name: 'My Students', href: '/dashboard/tutor/students', icon: Users },
          { name: 'Analytics', href: '/dashboard/tutor/analytics', icon: BarChart3 },
          { name: 'Notifications', href: '/dashboard/tutor/notifications', icon: MessageSquare },
        ]
      : [
          { name: 'My Learning', href: '/dashboard/student/my-courses', icon: BookOpen },
          { name: 'Browse Courses', href: '/dashboard/student/courses', icon: PlusCircle },
          { name: 'AI Tutor', href: '/dashboard/student/chat', icon: MessageSquare },
          { name: 'Grades', href: '/dashboard/student/grades', icon: Award },
        ]),
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-xl font-bold text-indigo-600">AI-LMS</span>
      </div>
      <nav className="mt-6 flex-1 space-y-1 px-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon
                className={clsx(
                  'mr-3 h-5 w-5',
                  isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col border-r bg-white">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white animate-in slide-in-from-left duration-300">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button onClick={() => setIsMobileMenuOpen(false)} className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-4 sm:px-8">
          <div className="flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-gray-500 lg:hidden rounded-md hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="ml-2 lg:ml-0 text-sm font-medium text-gray-500 capitalize">
              {role} Portal
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <NotificationDropdown />
            <div className="flex items-center space-x-2 sm:space-x-3 border-l pl-2 sm:pl-4 min-w-0">
              <div className="text-right hidden sm:block min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 flex-shrink-0">
                <UserIcon className="h-5 w-5" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8">
          {children}
          {role === 'student' && <ChatWidgetWrapper />}
        </main>
      </div>
    </div>
  );
}
