'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { 
  CheckCircle2, 
  Video, 
  Menu,
  Award,
  Play,
  ClipboardList,
  Loader2,
  Clock,
  BookMarked,
  Info,
  ChevronRight,
  ExternalLink,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  FileType2,
  File,
  Download,
  CheckCircle,
  ListChecks,
  UploadCloud,
  X,
  Sparkles,
  ArrowUp,
  Settings2,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { IModule } from '@/models/Module';
import { ILesson } from '@/models/Lesson';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

export default function LearnPage() {
  const { id } = useParams() as { id: string };
  const [modules, setModules] = useState<(IModule & { lessons: (ILesson & { quizzes: any[] })[] })[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [activeLesson, setActiveLesson] = useState<(ILesson & { quizzes: any[] }) | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<any | null>(null);
  const [progress, setProgress] = useState<{ percentage: number; completedLessonIds: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Viewer States
  const [isPdfExpanded, setIsPdfExpanded] = useState(false);
  const [isDocxExpanded, setIsDocxExpanded] = useState(false);

  // Submission State
  const [submissionType, setSubmissionType] = useState<'text' | 'file' | 'both'>('text');
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [fetchingSubmission, setFetchingSubmission] = useState(false);

  const fetchSubmission = useCallback(async (assignmentId: string) => {
    setFetchingSubmission(true);
    try {
      const res = await axios.get(`/api/assignments/${assignmentId}/my-submission`);
      setSubmissionResult(res.data.data);
    } catch (_error) {
      setSubmissionResult(null);
    } finally {
      setFetchingSubmission(false);
    }
  }, []);

  const fetchContent = useCallback(async () => {
    if (!id || id === 'undefined') return;
    try {
      const [lessonsRes, progressRes, assignRes] = await Promise.all([
        axios.get(`/api/courses/${id}/lessons`),
        axios.get(`/api/progress/${id}`),
        axios.get(`/api/assignments?courseId=${id}`)
      ]);
      
      const modulesWithQuizzes = await Promise.all(lessonsRes.data.data.map(async (mod: any) => {
        const lessonsWithQuizzes = await Promise.all((mod.lessons || []).map(async (lesson: any) => {
          const quizRes = await axios.get(`/api/quizzes/by-lesson?lessonId=${lesson._id}`);
          return { ...lesson, quizzes: quizRes.data.data || [] };
        }));
        return { ...mod, lessons: lessonsWithQuizzes };
      }));

      setModules(modulesWithQuizzes);
      setProgress(progressRes.data.data);
      setAssignments(assignRes.data.data || []);
      
      if (modulesWithQuizzes.length > 0 && modulesWithQuizzes[0].lessons.length > 0 && !activeLesson && !activeAssignment) {
        setActiveLesson(modulesWithQuizzes[0].lessons[0]);
      }
    } catch (_error) {
      toast.error('Failed to fetch course content');
    } finally {
      setLoading(false);
    }
  }, [id, activeLesson, activeAssignment]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    if (activeAssignment && !submissionResult) {
      // Only fetch if we don't have a submission yet
      fetchSubmission(activeAssignment._id);
    }
  }, [activeAssignment, fetchSubmission, submissionResult]);

  // Reset viewer states when lesson changes
  useEffect(() => {
    setIsPdfExpanded(false);
    setIsDocxExpanded(false);
  }, [activeLesson?._id]);

  const markComplete = async (lessonId: string) => {
    try {
      await axios.post('/api/progress', { lessonId });
      toast.success('Lesson completed!');
      
      const progressRes = await axios.get(`/api/progress/${id}`);
      setProgress(progressRes.data.data);
    } catch (_error) {
      toast.error('Failed to update progress');
    }
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submissionType === 'text' && !submissionText.trim()) {
        return toast.error('Please write your response');
    }
    if (submissionType === 'file' && !submissionFile) {
        return toast.error('Please upload a file');
    }
    if (submissionType === 'both' && (!submissionText.trim() || !submissionFile)) {
        return toast.error('Please provide both text and file');
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('submissionType', submissionType);
      if (submissionText) formData.append('submissionText', submissionText);
      if (submissionFile) formData.append('file', submissionFile);

      console.log('[SUBMIT] Sending submission...');
      const res = await axios.post(`/api/assignments/${activeAssignment._id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log('[SUBMIT] Response received:', res.data);
      console.log('[SUBMIT] aiGradingPending:', res.data.aiGradingPending);
      
      setSubmissionResult(res.data.data);
      if (res.data.aiGradingPending) {
        toast.success('Assignment submitted. AI review in progress...');
      } else if (res.data.data?.status === 'ai_failed') {
        toast('Assignment submitted. AI review unavailable — pending tutor review.', { icon: 'ℹ️' });
      } else {
        toast.success('Assignment submitted successfully!');
      }
      
      // Start polling for AI review if pending
      if (res.data.aiGradingPending) {
         console.log('[SUBMIT] Starting AI polling...');
         pollForAIReview(activeAssignment._id);
      } else {
         console.log('[SUBMIT] AI grading not pending, skipping poll');
      }
    } catch (error: any) {
      console.error('[SUBMIT] Error:', error);
      toast.error(error.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const pollForAIReview = async (assignId: string) => {
     let attempts = 0;
     const maxAttempts = 30; // Increased from 20 to 30
     const delay = 3000; // Reduced from 5s to 3s for faster feedback
     
     console.log(`[POLLING] Starting poll for assignment ${assignId}...`);
     
     const check = async () => {
        attempts++;
        console.log(`[POLLING] Attempt ${attempts}/${maxAttempts} for ${assignId}`);
        
        try {
           const res = await axios.get(`/api/assignments/${assignId}/my-submission`);
           const sub = res.data.data;
           
           console.log(`[POLLING] Status check: ${sub?.status || 'no data'}`);
           
           // Check if AI has completed review (status changed from 'submitted')
           if (sub && sub.status !== 'submitted') {
              console.log(`[POLLING] Review complete for ${assignId}. Status: ${sub.status}`);
              setSubmissionResult(sub);
              if (sub.status === 'ai_reviewed' || sub.status === 'graded') {
                toast.success('AI Review Complete!');
              } else if (sub.status === 'ai_failed') {
                toast('AI review unavailable — pending tutor review.', { icon: 'ℹ️' });
              } else {
                toast.success('Status updated.');
              }
              return;
           }
        } catch (e: any) {
           console.error('[POLLING] Error during poll:', e);
        }
        
        if (attempts < maxAttempts) {
           setTimeout(check, delay);
        } else {
           console.warn(`[POLLING] Max attempts reached for ${assignId}. Stopped polling.`);
           toast('Review is taking longer than expected. Please refresh in a moment.', { icon: '⏳' });
        }
     };
     
     setTimeout(check, delay);
  };

  const handleResubmit = async () => {
     if (!confirm('Are you sure you want to resubmit? This will delete your current submission.')) return;
     try {
        await axios.delete(`/api/submissions/${submissionResult._id}`);
        setSubmissionResult(null);
        setSubmissionText('');
        setSubmissionFile(null);
        toast.success('Ready for resubmission');
     } catch (error) {
        toast.error('Resubmit failed');
     }
  };

  if (loading) return <div className="flex justify-center p-12">Loading learning view...</div>;

  const getIcon = (type: string) => {
      switch(type) {
          case 'text': return <FileText className="h-4 w-4 mr-3 text-green-500" />;
          case 'pdf': return <FileType2 className="h-4 w-4 mr-3 text-red-500" />;
          case 'docx': return <File className="h-4 w-4 mr-3 text-orange-500" />;
          case 'video': return <Video className="h-4 w-4 mr-3 text-blue-500" />;
          default: return <FileText className="h-4 w-4 mr-3 text-gray-500" />;
      }
  };

  return (
    <div className="fixed inset-0 top-16 left-64 flex bg-gradient-to-b from-gray-50 to-white overflow-hidden text-left">
      {/* Sidebar */}
      <div className={clsx(
        "flex flex-col border-r border-gray-200/80 bg-white transition-all duration-300 shadow-sm",
        sidebarOpen ? "w-80" : "w-0 overflow-hidden"
      )}>
        <div className="p-5 border-b bg-white/95 backdrop-blur flex items-center justify-between">
          <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm">Curriculum</h2>
          <div className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full uppercase">
            {progress?.percentage}% Done
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {modules.map((mod) => (
            <div key={mod._id as string} className="border-b border-gray-100/80">
              <div className="bg-gray-50 px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                <ChevronRight className="h-3 w-3 mr-2 text-indigo-300" />
                {mod.title}
              </div>
              <div className="divide-y divide-gray-50">
                {mod.lessons.map((lesson: ILesson) => {
                  const isCompleted = progress?.completedLessonIds.includes(lesson._id as string);
                  const isActive = activeLesson?._id === lesson._id;
                  
                  return (
                    <button
                      key={lesson._id as string}
                      onClick={() => { setActiveLesson(lesson as any); setActiveAssignment(null); setSubmissionResult(null); setSubmissionText(''); setSubmissionFile(null); }}
                      className={clsx(
                        "flex w-full items-center px-5 py-4 text-sm transition-all hover:bg-indigo-50/40 group",
                        isActive ? "bg-indigo-50/50 border-l-4 border-l-indigo-600 shadow-sm" : "text-gray-500 border-l-4 border-l-transparent"
                      )}
                    >
                      <div className="flex-shrink-0 mr-4">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className={clsx("h-5 w-5 rounded-full border-2", isActive ? "border-indigo-600" : "border-gray-200")} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center">
                            {getIcon(lesson.contentType)}
                            <p className={clsx("text-xs truncate transition-all", isActive ? "text-indigo-900 font-bold" : "text-gray-700 group-hover:text-indigo-600")}>{lesson.title}</p>
                         </div>
                         <div className="flex items-center mt-1 space-x-2 pl-7">
                            <span className="text-[9px] font-bold uppercase text-gray-400 tracking-tighter">{lesson.contentType}</span>
                            {lesson.estimatedDuration && <span className="text-[9px] font-bold text-gray-300 uppercase">· {lesson.estimatedDuration}m</span>}
                         </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Assignments Sidebar */}
          {assignments.length > 0 && (
            <div className="mt-6">
             <div className="bg-indigo-50 px-5 py-3 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                  Assignments
               </div>
               <div className="divide-y divide-gray-100">
                 {assignments.map(assign => (
                    <button
                      key={assign._id}
                      onClick={() => { setActiveAssignment(assign); setActiveLesson(null); setSubmissionResult(null); setSubmissionText(''); setSubmissionFile(null); }}
                      className={clsx(
                        "flex w-full items-center px-5 py-4 text-sm transition-all hover:bg-indigo-50/40 group border-l-4",
                        activeAssignment?._id === assign._id ? "bg-indigo-50/50 border-l-indigo-600 shadow-sm" : "text-gray-500 border-l-transparent"
                      )}
                    >
                      <ClipboardList className={clsx("h-5 w-5 mr-4", activeAssignment?._id === assign._id ? "text-indigo-600" : "text-gray-300")} />
                      <span className={clsx("text-xs font-bold transition-all text-left", activeAssignment?._id === assign._id ? "text-indigo-900" : "group-hover:text-indigo-600")}>{assign.title}</span>
                    </button>
                 ))}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative z-10">
        <div className="h-1 w-full bg-gray-100">
          <div 
            className="h-full bg-indigo-600 transition-all duration-1000 ease-out" 
            style={{ width: `${progress?.percentage}%` }}
          />
        </div>

        <div className="flex items-center p-5 lg:p-6 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-xl mr-6 transition-all active:scale-90 border border-gray-100 shadow-sm"
          >
            <Menu className="h-5 w-5 text-gray-500" />
          </button>
          <div className="flex-1">
             <h1 className="text-xl lg:text-2xl font-black text-gray-900 tracking-tight flex items-center">
               {activeLesson?.title || activeAssignment?.title || 'Select a topic'}
               {activeLesson?.estimatedDuration && (
                 <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-gray-100 text-gray-800 border">
                    <Clock className="h-3 w-3 mr-1" /> ~{activeLesson.estimatedDuration} min
                 </span>
               )}
             </h1>
             {activeLesson?.prerequisites && (
                <div className="mt-2 flex items-center text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl w-fit border border-amber-100">
                   <Info className="h-3 w-3 mr-2" />
                   Before this lesson: {activeLesson.prerequisites}
                </div>
             )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar relative">
          {activeLesson ? (
            <div className="max-w-5xl mx-auto space-y-10 text-left pb-40 animate-in fade-in duration-500">
              {/* 2. Overview Section */}
              {activeLesson.overview && (
                 <div className="space-y-4 bg-white border border-gray-100 rounded-3xl p-6 lg:p-8 shadow-sm">
                    <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Overview</h2>
                    <p className="text-base lg:text-lg text-gray-700 leading-relaxed font-medium">{activeLesson.overview}</p>
                 </div>
              )}

              {/* 3. Learning Objectives */}
              {activeLesson.objectives && activeLesson.objectives.length > 0 && (
                 <div className="bg-indigo-50/60 p-6 lg:p-8 rounded-3xl border border-indigo-100 space-y-6">
                    <h2 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center">
                       <ListChecks className="h-4 w-4 mr-2" /> What You&apos;ll Learn
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {activeLesson.objectives.map((obj, i) => (
                          <div key={i} className="flex items-start bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                             <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                             <span className="text-sm font-bold text-gray-700">{obj}</span>
                          </div>
                       ))}
                    </div>
                 </div>
              )}

              {/* 4. Main Content Area */}
              <div className="space-y-10 border-t border-gray-100 pt-10">
                {activeLesson.contentType === 'video' && activeLesson.contentUrl && (
                  <div className="space-y-8">
                    <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border-8 border-gray-100 transition-transform hover:scale-[1.01]">
                      <iframe 
                          src={activeLesson.contentUrl.replace('watch?v=', 'embed/')}
                          className="w-full h-full"
                          allowFullScreen
                      ></iframe>
                    </div>
                    {activeLesson.contentBody && (
                       <div className="space-y-4">
                          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Video Summary</h2>
                          <p className="text-sm text-gray-900 leading-relaxed font-medium bg-gray-50 p-6 rounded-2xl">{activeLesson.contentBody}</p>
                       </div>
                    )}
                    {activeLesson.videoTimestamps && (
                       <div className="space-y-4">
                          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Key Timestamps</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                             {activeLesson.videoTimestamps.split(',').map((ts, i) => (
                                <div key={i} className="bg-white p-3 rounded-xl border flex items-center text-xs font-bold text-gray-600 hover:border-indigo-200 transition-all cursor-default">
                                   <Clock className="h-3.5 w-3.5 mr-2 text-indigo-400" />
                                   {ts.trim()}
                                </div>
                             ))}
                          </div>
                       </div>
                    )}
                  </div>
                )}

                {activeLesson.contentType === 'text' && (
                  <div className="space-y-12">
                    {activeLesson.contentSections && activeLesson.contentSections.length > 0 ? (
                      activeLesson.contentSections.map((sec, i) => (
                        <div key={i} className="space-y-6">
                           <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
                              <span className="h-8 w-1 bg-indigo-600 mr-4 rounded-full" />
                              {sec.sectionTitle}
                           </h3>
                           <div className="prose prose-indigo max-w-none prose-sm leading-relaxed text-gray-700 font-medium">
                              <ReactMarkdown>{sec.sectionBody}</ReactMarkdown>
                           </div>
                           {i < activeLesson.contentSections.length - 1 && <hr className="border-gray-100" />}
                        </div>
                      ))
                    ) : (
                      activeLesson.contentBody && (
                        <div className="prose prose-indigo max-w-none">
                           <ReactMarkdown>{activeLesson.contentBody}</ReactMarkdown>
                        </div>
                      )
                    )}
                  </div>
                )}

                {(activeLesson.contentType === 'pdf' || activeLesson.contentType === 'docx') && activeLesson.contentUrl && (
                  <div className="space-y-6">
                    {activeLesson.contentBody && (
                       <p className="text-sm text-gray-600 bg-gray-50 p-6 rounded-2xl border-l-4 border-indigo-600 italic">
                          {activeLesson.contentBody}
                       </p>
                    )}
                    
                    <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                       <div 
                        className="p-6 flex items-center justify-between cursor-pointer group"
                        onClick={() => activeLesson.contentType === 'pdf' ? setIsPdfExpanded(!isPdfExpanded) : setIsDocxExpanded(!isDocxExpanded)}
                       >
                          <div className="flex items-center">
                             <div className={clsx("h-12 w-12 rounded-2xl flex items-center justify-center mr-4 shadow-inner", activeLesson.contentType === 'pdf' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")}>
                                <FileText className="h-6 w-6" />
                             </div>
                             <div>
                                <p className="font-black text-gray-900 uppercase tracking-tighter text-sm">{activeLesson.contentType.toUpperCase()} ATTACHMENT</p>
                                <p className="text-xs text-gray-400 font-bold">Review the attached material below</p>
                             </div>
                          </div>
                          <div className="flex items-center space-x-3">
                             <a 
                              href={activeLesson.contentUrl} 
                              download 
                              onClick={e => e.stopPropagation()}
                              className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                             >
                                <Download className="h-5 w-5" />
                             </a>
                             <button className="flex items-center bg-indigo-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                               {(activeLesson.contentType === 'pdf' ? isPdfExpanded : isDocxExpanded) ? <><ChevronUp className="h-3 w-3 mr-2" /> Hide Preview</> : <><ChevronDown className="h-3 w-3 mr-2" /> Preview Content</>}
                             </button>
                          </div>
                       </div>

                       {((activeLesson.contentType === 'pdf' && isPdfExpanded) || (activeLesson.contentType === 'docx' && isDocxExpanded)) && (
                         <div className="border-t bg-gray-50 p-4 animate-in slide-in-from-top-4 duration-300">
                           <div className="h-[560px] bg-white rounded-2xl overflow-hidden border shadow-inner flex flex-col">
                               <div className="p-3 border-b bg-white flex justify-end">
                                  <a href={activeLesson.contentUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-indigo-600 uppercase flex items-center hover:underline">
                                     <ExternalLink className="h-3 w-3 mr-1.5" /> Fullscreen View
                                  </a>
                               </div>
                               <iframe src={activeLesson.contentUrl} className="w-full h-full"></iframe>
                            </div>
                         </div>
                       )}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Key Terms Section */}
              {activeLesson.keyTerms && activeLesson.keyTerms.length > 0 && (
                 <div className="space-y-6 border-t border-gray-100 pt-10">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                       <BookMarked className="h-4 w-4 mr-2" /> Key Terms & Glossary
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {activeLesson.keyTerms.map((kt, i) => (
                          <div key={i} className="p-5 lg:p-6 rounded-2xl bg-gray-50/60 border border-gray-200 group hover:border-indigo-200 transition-all">
                             <p className="text-sm font-black text-gray-900 uppercase tracking-tight mb-2 transition-colors group-hover:text-indigo-600">{kt.term}</p>
                             <p className="text-xs text-gray-500 font-medium leading-relaxed">{kt.definition}</p>
                          </div>
                       ))}
                    </div>
                 </div>
              )}

              {/* 6. Additional Notes */}
              {activeLesson.additionalNotes && (
                 <div className="p-8 rounded-[2.5rem] bg-blue-50 border border-blue-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-1 w-full bg-blue-400" />
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center">
                       <Info className="h-3.5 w-3.5 mr-2" /> Tutor&apos;s Note
                    </h4>
                    <p className="text-sm text-blue-900/80 leading-relaxed font-bold italic">{activeLesson.additionalNotes}</p>
                 </div>
              )}

              {/* Quizzes */}
              {activeLesson.quizzes && activeLesson.quizzes.length > 0 && (
                <div className="space-y-6 border-t pt-10">
                  <h3 className="text-lg font-black text-gray-900 flex items-center tracking-tight">
                    <Award className="h-6 w-6 mr-3 text-yellow-500" />
                    Knowledge Check
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {activeLesson.quizzes.map((quiz: any) => (
                      <div
                        key={quiz._id}
                        className={clsx(
                          "flex items-center justify-between p-8 rounded-[2.5rem] text-white shadow-2xl transition-all group overflow-hidden relative",
                          quiz.hasAttempted && !quiz.retakeAllowed
                            ? "bg-slate-500"
                            : "bg-indigo-600 hover:bg-indigo-700"
                        )}
                      >
                        <div className="absolute right-0 top-0 p-4 opacity-10 transition-transform group-hover:scale-125 group-hover:rotate-12"><Award className="h-24 w-24" /></div>
                        <div className="relative z-10">
                          <p className="font-black text-xl uppercase tracking-tight">{quiz.title}</p>
                          <div className="flex items-center mt-2 space-x-4">
                             <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest">{quiz.questions.length} Questions</span>
                             <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest">Type: {quiz.questionType?.replace('-', ' ') || 'Assessment'}</span>
                             {quiz.hasAttempted && (
                               <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest">
                                 Score: {quiz.lastScorePercentage ?? 0}%
                               </span>
                             )}
                          </div>
                        </div>
                        {quiz.hasAttempted && !quiz.retakeAllowed ? (
                          <div className="relative z-10 flex items-center bg-white/90 text-slate-600 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl cursor-not-allowed">
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Already Attempted
                          </div>
                        ) : (
                          <Link
                            href={`/dashboard/student/courses/${id}/quiz/${quiz._id}`}
                            className="relative z-10 flex items-center bg-white text-indigo-600 px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl"
                          >
                            <Play className="h-4 w-4 mr-2 fill-current" /> {quiz.retakeAllowed ? 'Retake Quiz' : 'Start Quiz'}
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeAssignment ? (
            <div className="max-w-4xl mx-auto space-y-12 pb-40 animate-in fade-in duration-500">
               {fetchingSubmission ? (
                  <div className="bg-white p-20 rounded-[3rem] border-2 border-gray-50 shadow-sm flex flex-col items-center justify-center space-y-6">
                     <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
                     <p className="font-black text-gray-400 uppercase tracking-widest text-sm">Retrieving your work...</p>
                  </div>
               ) : !submissionResult ? (
                  <>
                    <div className="bg-white p-10 rounded-[3rem] border-2 border-gray-50 shadow-sm space-y-8 relative overflow-hidden text-left">
                        <div className="absolute top-0 right-0 p-8 opacity-5"><ClipboardList className="h-32 w-32" /></div>
                        <div>
                          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Assignment Brief</h2>
                          <div className="h-1.5 w-20 bg-indigo-600 mt-4 rounded-full" />
                        </div>
                        <p className="text-gray-600 text-lg font-medium leading-relaxed whitespace-pre-wrap">{activeAssignment.description}</p>
                        
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 space-y-4">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                              <ListChecks className="h-3.5 w-3.5 mr-2 text-indigo-500" /> Grading Rubric
                           </p>
                           <p className="text-sm text-gray-700 font-bold leading-relaxed">{activeAssignment.rubric}</p>
                        </div>
                    </div>

                    <form onSubmit={handleAssignmentSubmit} className="space-y-8 animate-in fade-in duration-500">
                          <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit">
                              {(['text', 'file', 'both'] as const).map(type => (
                                  <button
                                      key={type}
                                      type="button"
                                      onClick={() => setSubmissionType(type)}
                                      className={clsx(
                                          "px-8 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                          submissionType === type ? "bg-white text-indigo-600 shadow-sm scale-105" : "text-gray-400 hover:text-gray-600"
                                      )}
                                  >
                                      {type}
                                  </button>
                              ))}
                          </div>

                          {(submissionType === 'text' || submissionType === 'both') && (
                              <div className="bg-white p-2 rounded-[2.5rem] border-2 border-gray-100 shadow-2xl focus-within:ring-8 focus-within:ring-indigo-50 transition-all text-left">
                                  <div className="flex justify-between items-center p-6 border-b border-gray-50">
                                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Student Workbench</label>
                                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase">{submissionText.trim().split(/\s+/).filter(Boolean).length} Words</span>
                                  </div>
                                  <textarea
                                      required
                                      rows={10}
                                      className="w-full border-none p-8 focus:ring-0 outline-none text-gray-800 leading-relaxed text-lg font-medium placeholder:text-gray-200 resize-none rounded-[2rem]"
                                      placeholder="Write your detailed response here..."
                                      value={submissionText}
                                      onChange={e => setSubmissionText(e.target.value)}
                                  />
                              </div>
                          )}

                          {(submissionType === 'file' || submissionType === 'both') && (
                              <div className="bg-white p-10 border-4 border-dashed border-gray-100 rounded-[3rem] flex flex-col items-center justify-center group hover:border-indigo-100 transition-all relative">
                                  {submissionFile && (
                                      <button 
                                          onClick={() => setSubmissionFile(null)}
                                          className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"
                                      >
                                          <X className="h-5 w-5" />
                                      </button>
                                  )}
                                  <div className={clsx(
                                      "h-20 w-20 rounded-3xl flex items-center justify-center mb-6 transition-all shadow-inner",
                                      submissionFile ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-200 group-hover:text-indigo-200"
                                  )}>
                                      {submissionFile ? <CheckCircle className="h-10 w-10" /> : <UploadCloud className="h-10 w-10" />}
                                  </div>
                                  <input 
                                      type="file" 
                                      accept=".pdf,.docx"
                                      className="hidden"
                                      id="assignment-file-upload"
                                      onChange={e => setSubmissionFile(e.target.files?.[0] || null)}
                                  />
                                  <label htmlFor="assignment-file-upload" className="bg-gray-900 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-black transition-all shadow-xl">
                                      {submissionFile ? 'Change Selected File' : 'Browse PDF or DOCX'}
                                  </label>
                                  
                                  {submissionFile && (
                                      <div className="mt-6 text-center">
                                          <p className="font-black text-gray-900 text-sm uppercase tracking-tight">{submissionFile.name}</p>
                                          <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{(submissionFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                      </div>
                                  )}
                                  
                                  {!submissionFile && <p className="mt-6 text-[10px] font-black text-gray-300 uppercase tracking-widest">Max file size: 10MB</p>}
                              </div>
                          )}

                          <button
                            type="submit"
                            disabled={submitting || (submissionType === 'text' && submissionText.length < 50) || (submissionType === 'file' && !submissionFile) || (submissionType === 'both' && (submissionText.length < 50 || !submissionFile))}
                            className="w-full bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-widest flex items-center justify-center shadow-2xl shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all transform active:scale-95 text-sm"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="animate-spin h-5 w-5 mr-4" />
                                AI TEACHER IS ANALYZING...
                              </>
                            ) : 'Submit Assignment'}
                          </button>
                    </form>
                  </>
               ) : (submissionResult.status === 'submitted') ? (
                  <div className="bg-white p-20 rounded-[3rem] border-2 border-gray-50 shadow-2xl space-y-10 text-center animate-in zoom-in-95 duration-500">
                     <div className="relative inline-block">
                        <div className="h-32 w-32 rounded-[2.5rem] bg-indigo-50 border-4 border-indigo-100 flex items-center justify-center">
                           <Loader2 className="h-16 w-16 text-indigo-600 animate-spin" />
                        </div>
                        <Sparkles className="absolute -top-4 -right-4 h-12 w-12 text-purple-500 animate-pulse" />
                     </div>
                     <div className="space-y-4">
                        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">AI Review in Progress</h2>
                        <p className="text-gray-500 font-bold max-w-md mx-auto leading-relaxed">
                           Great work! Your assignment has been safely submitted. Our AI Teacher is currently reviewing your submission against the rubric.
                        </p>
                     </div>
                     <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 max-w-sm mx-auto">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Submitted on</p>
                        <p className="text-sm font-black text-gray-900">{new Date(submissionResult.submittedAt).toLocaleString()}</p>
                     </div>
                     
                     <div className="flex flex-col items-center space-y-4 pt-10">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-bounce">This normally takes 10-15 seconds...</p>
                        <button 
                           onClick={() => fetchSubmission(activeAssignment._id)}
                           className="px-8 py-3 bg-indigo-50 text-indigo-600 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all shadow-sm border border-indigo-100"
                        >
                           Check Status Now
                        </button>
                     </div>
                  </div>
               ) : (
                  <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-500 text-left">
                     {/* Success/Status Banner */}
                     <div className={clsx(
                        "p-10 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0",
                        submissionResult.status === 'graded' ? "bg-green-600 text-white" : 
                        submissionResult.status === 'ai_failed' ? "bg-amber-600 text-white" : "bg-indigo-600 text-white"
                     )}>
                        <div className="flex items-center">
                           <div className="h-20 w-20 rounded-[2rem] bg-white/20 flex items-center justify-center mr-8 shadow-inner">
                              {submissionResult.status === 'graded' ? <CheckCircle2 className="h-10 w-10 text-white" /> : 
                               submissionResult.status === 'ai_failed' ? <Info className="h-10 w-10 text-white" /> : <Sparkles className="h-10 w-10 text-white" />}
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                                 {submissionResult.status === 'graded' 
                                    ? (submissionResult.tutorGrade !== undefined ? 'Final Grade Confirmed' : 'AI Grade Confirmed by Tutor') 
                                    : submissionResult.status === 'ai_failed' ? 'AI Review Failed' : 'AI Preliminary Review'}
                              </p>
                              <h2 className="text-4xl font-black tracking-tighter mt-1">
                                 {submissionResult.status === 'ai_failed' ? 'Pending Review' : 
                                  submissionResult.status === 'submitted' ? 'Processing...' : 
                                  `${submissionResult.finalGrade ?? 0}% Score`}
                              </h2>
                           </div>
                        </div>
                        <div className={clsx(
                           "px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl",
                           submissionResult.status === 'ai_failed' ? "bg-white/20 text-white" :
                           submissionResult.status === 'submitted' ? "bg-indigo-200 text-indigo-900" :
                           (submissionResult.isPassing ? "bg-green-400 text-green-900" : "bg-red-400 text-red-900")
                        )}>
                           {submissionResult.status === 'ai_failed' ? 'MANUAL REVIEW' : 
                            submissionResult.status === 'submitted' ? 'PROCESSING' :
                            (submissionResult.isPassing ? '✓ PASSING' : 'FAILED')}
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Overall Feedback Card */}
                        <div className="bg-white p-10 rounded-[3.5rem] border-2 border-gray-50 shadow-sm space-y-8">
                           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                              <Info className="h-4 w-4 mr-2" /> Comprehensive Feedback
                           </h3>
                           <div className="prose prose-sm max-w-none text-gray-700 font-medium leading-relaxed">
                              {submissionResult.status === 'graded' && submissionResult.tutorFeedback ? (
                                 <div className="space-y-8">
                                    <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                                       <p className="text-[10px] font-black text-indigo-600 uppercase mb-3">Tutor Comment</p>
                                       <p className="text-gray-900 font-bold leading-relaxed italic">&quot;{submissionResult.tutorFeedback}&quot;</p>
                                    </div>
                                    {submissionResult.aiRemarks && (
                                       <div>
                                          <p className="text-[10px] font-black text-gray-400 uppercase mb-3">Supporting AI Analysis</p>
                                          <p className="text-gray-600">{submissionResult.aiRemarks}</p>
                                       </div>
                                    )}
                                 </div>
                              ) : (
                                 <p className="text-lg leading-relaxed text-gray-900 font-medium">
                                    {submissionResult.aiRemarks || "Your assignment has been graded manually by the tutor."}
                                 </p>
                              )}
                           </div>
                        </div>

                        {/* Analysis Grid - Only show if AI data exists */}
                        <div className="space-y-6">
                           {submissionResult.aiStrengths?.length > 0 && (
                              <div className="bg-green-50 p-8 rounded-[2.5rem] border border-green-100 shadow-sm">
                                 <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-4 flex items-center">
                                    <CheckCircle className="h-4 w-4 mr-2" /> Strengths
                                 </h4>
                                 <ul className="space-y-3">
                                    {submissionResult.aiStrengths.map((s: string, i: number) => (
                                       <li key={i} className="text-sm text-green-900 font-bold flex items-start">
                                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-3 mt-1.5 flex-shrink-0" />
                                          {s}
                                       </li>
                                    ))}
                                 </ul>
                              </div>
                           )}

                           {submissionResult.aiWeaknesses?.length > 0 && (
                              <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 shadow-sm">
                                 <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center">
                                    <ArrowUp className="h-4 w-4 mr-2" /> Improvements
                                 </h4>
                                 <ul className="space-y-3">
                                    {submissionResult.aiWeaknesses.map((s: string, i: number) => (
                                       <li key={i} className="text-sm text-amber-900 font-bold flex items-start">
                                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-3 mt-1.5 flex-shrink-0" />
                                          {s}
                                       </li>
                                    ))}
                                 </ul>
                              </div>
                           )}

                           {(!submissionResult.aiStrengths?.length && !submissionResult.aiWeaknesses?.length) && (
                              <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-200 flex flex-col items-center justify-center text-center space-y-3">
                                 <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                                    <ClipboardList className="h-6 w-6 text-gray-300" />
                                 </div>
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">AI Detailed Analysis<br/>Not Available</p>
                              </div>
                           )}
                        </div>
                     </div>

                     {/* KPI Detailed Breakdown - Only show if data exists */}
                     {submissionResult.aiKpiBreakdown?.length > 0 && (
                        <div className="bg-white p-10 rounded-[4rem] border-2 border-gray-50 shadow-sm space-y-10">
                           <div className="flex justify-between items-center">
                              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center">
                                 <Settings2 className="h-5 w-5 mr-3 text-indigo-600" /> KPI Analysis Results
                              </h3>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Weighted Average Logic</p>
                           </div>
                           <div className="grid grid-cols-1 gap-6">
                              {submissionResult.aiKpiBreakdown.map((kpi: any, i: number) => (
                                 <div key={i} className="p-8 bg-gray-50 rounded-3xl border border-transparent hover:border-indigo-100 hover:bg-white transition-all group">
                                    <div className="flex items-center">
                                       <div className="h-16 w-16 rounded-2xl bg-white border-2 font-black text-xl text-indigo-600 flex items-center justify-center mr-8 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                          {kpi.score}%
                                       </div>
                                       <div className="flex-1">
                                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{kpi.kpiLabel}</p>
                                          <p className="text-sm text-gray-500 font-medium mt-1 leading-relaxed">{kpi.comment}</p>
                                       </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Action Bar */}
                     <div className="flex items-center justify-between pt-10 border-t border-gray-100">
                        <div className="text-left">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Submission Status</p>
                           <p className="text-sm font-black text-gray-900 mt-1 uppercase tracking-tighter">
                              {submissionResult.status === 'graded' ? 'Finalized by Tutor' : 'Pending Tutor Review'}
                           </p>
                        </div>
                        {activeAssignment.allowResubmission && (
                           <button 
                              onClick={handleResubmit}
                              className="px-12 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-black transition-all transform active:scale-95 flex items-center"
                           >
                              <Plus className="h-4 w-4 mr-2" /> Start Resubmission
                           </button>
                        )}
                     </div>
                  </div>
               )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <div className="h-20 w-20 rounded-3xl bg-gray-50 flex items-center justify-center">
                 <BookOpen className="h-10 w-10 text-gray-200" />
              </div>
              <p className="font-bold text-sm uppercase tracking-widest">Select a lesson to begin</p>
            </div>
          )}
        </div>

        {/* 7. MARK AS COMPLETE BUTTON - Sticky Footer */}
        {activeLesson && (
           <div className="p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-center items-center z-50">
              <button
                onClick={() => markComplete(activeLesson._id as string)}
                disabled={progress?.completedLessonIds.includes(activeLesson._id as string)}
                className={clsx(
                  "px-20 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl flex items-center transform hover:-translate-y-1 active:translate-y-0 active:scale-95",
                  progress?.completedLessonIds.includes(activeLesson._id as string)
                    ? "bg-green-100 text-green-700 cursor-default shadow-none border-2 border-green-200"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200"
                )}
              >
                {progress?.completedLessonIds.includes(activeLesson._id as string) 
                  ? <><CheckCircle2 className="h-5 w-5 mr-3" /> ✓ Lesson Completed</> 
                  : <><Award className="h-5 w-5 mr-3" /> Mark as Complete</>}
              </button>
           </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        
        /* Typography overrides */
        .prose h3 { font-weight: 900 !important; color: #111827 !important; }
        .prose p { color: #374151 !important; line-height: 1.8 !important; }
      `}</style>
    </div>
  );
}
