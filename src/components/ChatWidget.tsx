'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, MessageCircle, X, Loader2, User, Bot, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';

export default function ChatWidget({ courseId }: { courseId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (courseId && courseId !== 'undefined') {
      fetchCourseLessons();
    }
  }, [courseId]);

  const fetchCourseLessons = async () => {
    try {
      const res = await axios.get(`/api/courses/${courseId}/lessons`);
      // apiHandler wraps response in .data.data or .data
      const data = res.data.data || res.data;
      if (Array.isArray(data)) {
        const allLessons = data.flatMap((m: any) => m.lessons || []);
        setLessons(allLessons);
      }
    } catch (_error) {
      console.error("Failed to fetch lessons for widget");
    }
  };

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen, messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post('/api/chat/message', {
        message: input,
        courseId,
        sessionId,
        lessonId: selectedLessonId || undefined
      });
      
      // res.data.data contains { reply, sessionId }
      const chatData = res.data.data;
      setMessages(prev => [...prev, { role: 'assistant', content: chatData.reply }]);
      setSessionId(chatData.sessionId);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Failed to get response.";
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-all"
      >
        {isOpen ? <X /> : <MessageCircle />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 bg-indigo-600 text-white flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                <span className="font-bold">AI Tutor</span>
              </div>
              <button onClick={clearChat} title="Clear Chat">
                <Trash2 className="h-4 w-4 opacity-70 hover:opacity-100" />
              </button>
            </div>
            
            {lessons.length > 0 && (
              <select 
                className="bg-indigo-700 text-white text-[10px] rounded border border-indigo-500 p-1 focus:outline-none w-full"
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
              >
                <option value="">General Course Help</option>
                {lessons.map(l => (
                  <option key={l._id} value={l._id}>Context: {l.title}</option>
                ))}
              </select>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-center text-gray-400 text-sm mt-10 px-6">
                Hi! I&apos;m your AI academic tutor. How can I help you today?
              </p>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={clsx(
                "flex w-full",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}>
                <div className={clsx(
                  "p-4 rounded-2xl shadow-sm text-sm",
                  msg.role === 'user' 
                    ? "bg-indigo-600 text-white rounded-tr-none" 
                    : "bg-white text-gray-800 border rounded-tl-none"
                )}>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 border-t bg-white flex space-x-2">
            <input
              type="text"
              placeholder="Ask a question..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 border-gray-200"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(e); }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
