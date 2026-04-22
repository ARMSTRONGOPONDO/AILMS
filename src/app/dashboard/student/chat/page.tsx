'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Bot, User, Loader2, MessageSquare, BookOpen, X } from 'lucide-react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

interface IChatMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

interface IChatSession {
  _id: string;
  courseId?: { _id: string; title: string };
  messages: IChatMessage[];
}

interface IEnrollment {
  courseId: { _id: string; title: string };
}

export default function StudentChatPage() {
  const [sessions, setSessions] = useState<IChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<IChatSession | any>(null);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [enrolledCourses, setEnrolledCourses] = useState<IEnrollment[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchEnrolledCourses();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await axios.get('/api/chat/sessions');
      const data = res.data.data || [];
      setSessions(data);
    } catch (_error) {
      toast.error('Failed to load chat history');
    }
  };

  const fetchEnrolledCourses = async () => {
    try {
      const res = await axios.get('/api/enrollments');
      const data = res.data.data || [];
      setEnrolledCourses(data.filter((e: any) => e.courseId && e.courseId._id));
    } catch (_error) {
      console.error('Failed to fetch courses');
    }
  };

  const loadSession = async (id: string) => {
    if (!id || id === 'undefined') return;
    try {
      const res = await axios.get(`/api/chat/sessions/${id}`);
      const sessionData = res.data.data || res.data;
      setActiveSession(sessionData);
      setSelectedCourseId(sessionData.courseId?._id || sessionData.courseId || '');
    } catch (_error) {
      toast.error('Failed to load session');
    }
  };

  const startNewChat = () => {
    setActiveSession(null);
    setInput('');
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMsg = { role: 'user', content: input };
    if (activeSession) {
      setActiveSession({ ...activeSession, messages: [...(activeSession.messages || []), userMsg] });
    } else {
      setActiveSession({ messages: [userMsg] });
    }
    
    setInput('');
    setSending(true);

    try {
      // Find the recent lesson content if a course is selected
      let contextLessonId = undefined;
      if (selectedCourseId) {
        try {
          const progressRes = await axios.get(`/api/progress/${selectedCourseId}`);
          const prog = progressRes.data.data;
          // Use the last completed lesson or the first lesson as context
          if (prog.completedLessonIds?.length > 0) {
            contextLessonId = prog.completedLessonIds[prog.completedLessonIds.length - 1];
          } else {
            // Fetch first lesson of the course
            const lessonsRes = await axios.get(`/api/courses/${selectedCourseId}/lessons`);
            const firstModule = lessonsRes.data.data[0];
            if (firstModule?.lessons?.length > 0) {
              contextLessonId = firstModule.lessons[0]._id;
            }
          }
        } catch (err) {
          console.error('Failed to fetch context lesson', err);
        }
      }

      const res = await axios.post('/api/chat/message', {
        message: input,
        sessionId: activeSession?._id,
        courseId: selectedCourseId || undefined,
        lessonId: contextLessonId
      });

      const returnedSessionId = res.data?.data?.sessionId || res.data?.sessionId;
      if (!returnedSessionId) {
        throw new Error('Missing session id in chat response');
      }

      if (activeSession?._id) {
        loadSession(returnedSessionId);
      } else {
        fetchSessions();
        loadSession(returnedSessionId);
      }
    } catch (error: any) {
      toast.error(error.response?.status === 429 ? "AI is busy." : "Error sending message");
    } finally {
      setSending(false);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this chat?')) return;
    try {
      await axios.delete(`/api/chat/sessions/${id}`);
      toast.success('Chat deleted');
      if (activeSession?._id === id) setActiveSession(null);
      fetchSessions();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const getSelectedCourseTitle = () => {
    if (!selectedCourseId) return 'General Study Help';
    const enrollment = enrolledCourses.find(e => e.courseId._id === selectedCourseId);
    return enrollment?.courseId.title || 'General Study Help';
  };

  return (
    <div className="flex h-[calc(100vh-160px)] bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col bg-gray-50">
        <div className="p-4 border-b space-y-3">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" /> New Chat
          </button>
          
          <div className="bg-white p-3 rounded-lg border shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Chatting about:</p>
            <p className="text-xs font-bold text-gray-900 truncate mb-2">{getSelectedCourseTitle()}</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase flex items-center"
            >
              Change Topic <MessageSquare className="h-3 w-3 ml-1" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.map((s) => (
            <div
              key={s._id}
              onClick={() => loadSession(s._id)}
              className={clsx(
                "w-full text-left p-4 border-b hover:bg-gray-100 transition-colors flex flex-col group cursor-pointer",
                activeSession?._id === s._id ? "bg-white border-l-4 border-l-indigo-600" : ""
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <p className="text-xs font-bold text-indigo-600 uppercase truncate pr-4">
                  {s.courseId?.title || (s as any).courseId || 'General Chat'}
                </p>
                <button 
                  onClick={(e) => deleteSession(s._id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-500 rounded"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-sm font-bold text-gray-900 truncate">
                {s.messages[0]?.content || 'New Chat'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Topic Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-black text-gray-900 uppercase tracking-tighter">Select Chat Topic</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto">
              <button
                onClick={() => { setSelectedCourseId(''); setIsModalOpen(false); }}
                className={clsx(
                  "w-full text-left p-4 rounded-xl transition-all flex items-center group",
                  !selectedCourseId ? "bg-indigo-50 border-2 border-indigo-200" : "hover:bg-gray-50"
                )}
              >
                <div className={clsx("h-10 w-10 rounded-lg flex items-center justify-center mr-4", !selectedCourseId ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600")}>
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">General Study Help</p>
                  <p className="text-xs text-gray-500">Ask anything without specific course context</p>
                </div>
              </button>
              
              <div className="my-2 px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Enrolled Courses</div>
              
              {enrolledCourses.map((e) => (
                <button
                  key={e.courseId._id}
                  onClick={() => { setSelectedCourseId(e.courseId._id); setIsModalOpen(false); }}
                  className={clsx(
                    "w-full text-left p-4 rounded-xl transition-all flex items-center group",
                    selectedCourseId === e.courseId._id ? "bg-indigo-50 border-2 border-indigo-200" : "hover:bg-gray-50"
                  )}
                >
                  <div className={clsx("h-10 w-10 rounded-lg flex items-center justify-center mr-4", selectedCourseId === e.courseId._id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600")}>
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{e.courseId.title}</p>
                    <p className="text-xs text-gray-500 truncate">Use this course content as context</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {activeSession?.courseId && activeSession.courseId.title && (
          <div className="bg-indigo-50 border-b border-indigo-100 p-3 flex items-center justify-center">
            <span className="text-xs font-semibold text-indigo-700 flex items-center">
              <BookOpen className="h-3 w-3 mr-2" />
              Context: {activeSession.courseId.title}
            </span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!activeSession && !sending && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
               <Bot className="h-12 w-12 mb-4 opacity-20" />
               <p>Select a past chat or start a new one.</p>
            </div>
          )}
          {activeSession?.messages?.map((msg: any, idx: number) => (
            <div key={idx} className={clsx(
              "flex w-full",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}>
              <div className={clsx(
                "flex max-w-[80%] items-start space-x-3",
                msg.role === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
              )}>
                <div className={clsx(
                  "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                  msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-white border text-gray-600"
                )}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={clsx(
                  "p-4 rounded-2xl shadow-sm text-sm",
                  msg.role === 'user' 
                    ? "bg-indigo-600 text-white rounded-tr-none" 
                    : "bg-white text-gray-800 border rounded-tl-none"
                )}>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center"><Bot className="h-4 w-4 text-gray-400" /></div>
                <div className="bg-white border p-4 rounded-2xl rounded-tl-none shadow-sm"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /></div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={sendMessage} className="p-4 border-t">
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Ask anything..."
              className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-600 outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="bg-indigo-600 text-white p-2 px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-bold"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
