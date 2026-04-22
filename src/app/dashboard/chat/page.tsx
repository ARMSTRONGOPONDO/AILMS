'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, User, Bot, Loader2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get('/api/chat');
        setMessages(res.data.messages || []);
      } catch (_error) {
        toast.error('Failed to load chat history');
      } finally {
        setFetching(false);
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: IMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post('/api/chat', { message: input });
      const aiMessage: IMessage = { role: 'assistant', content: res.data.content, timestamp: new Date() };
      setMessages(prev => [...prev, aiMessage]);
    } catch (_error) {
      toast.error('Failed to get response from AI Tutor');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] max-w-4xl mx-auto bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-indigo-600 text-white flex items-center">
        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white">AI Tutor</h1>
          <p className="text-xs text-indigo-100">Ask me anything about your studies!</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
            <MessageSquare className="h-12 w-12 opacity-20" />
            <p>Start a conversation with your AI Tutor.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
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
                  : "bg-white text-gray-800 border rounded-tl-none prose prose-sm max-w-none"
              )}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center">
                <Bot className="h-4 w-4 text-gray-400" />
              </div>
              <div className="bg-white border p-4 rounded-2xl rounded-tl-none shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-4 border-t bg-white">
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Type your message here..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 border-gray-200"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
