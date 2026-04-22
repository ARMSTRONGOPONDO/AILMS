'use client';
import { usePathname } from 'next/navigation';
import ChatWidget from './ChatWidget';

export default function ChatWidgetWrapper() {
  const pathname = usePathname();
  // Simple regex to find /courses/[courseId] in the URL
  const match = pathname.match(/\/courses\/([^/]+)/);
  const courseId = match ? match[1] : undefined;

  return <ChatWidget courseId={courseId} />;
}
