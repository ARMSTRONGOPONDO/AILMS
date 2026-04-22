'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Edit, 
  GripVertical,
  Video,
  FileText,
  Link as LinkIcon,
  Globe,
  Lock,
  Sparkles,
  Loader2,
  Award,
  X,
  Save,
  Trash2,
  ClipboardList,
  Eye,
  CheckCircle2,
  ListChecks,
  Clock,
  BookMarked,
  Layout,
  ArrowUp,
  ArrowDown,
  UploadCloud,
  Settings2,
  Type,
  Layers,
  Download,
  ExternalLink
} from 'lucide-react';
import { ICourse } from '@/models/Course';
import { IModule } from '@/models/Module';
import { ILesson } from '@/models/Lesson';
import { IQuiz } from '@/models/Quiz';
import { IAssignment } from '@/models/Assignment';
import { clsx } from 'clsx';

export default function CourseContentPage() {
  const { id } = useParams();
  const [course, setCourse] = useState<ICourse | null>(null);
  const [modules, setModules] = useState<(IModule & { lessons: (ILesson & { quizzes: IQuiz[] })[] })[]>([]);
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // AI Quiz Modal State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizTitle, setQuizTitle] = useState('Lesson Quiz');
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizJobId, setQuizJobId] = useState<string | null>(null);
  const [quizJobStatus, setQuizJobStatus] = useState<string>('');
  
  const [quizConfig, setQuizConfig] = useState({
    numberOfQuestions: 5,
    questionType: 'multiple-choice',
    difficulty: 'medium',
    focusTopic: ''
  });

  // Lesson Modal State
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonTab, setLessonTab] = useState<'info' | 'content'>('info');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonData, setLessonData] = useState({
    title: '',
    overview: '',
    objectives: [] as string[],
    estimatedDuration: 30,
    prerequisites: '',
    keyTerms: [] as { term: string; definition: string }[],
    contentType: 'text' as 'text' | 'pdf' | 'docx' | 'video',
    contentBody: '', // used for video summary or legacy text
    videoUrl: '',
    videoTimestamps: '',
    contentSections: [] as { sectionTitle: string; sectionBody: string }[],
    additionalNotes: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);

  // Assignment Modal State
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [assignmentData, setAssignmentData] = useState({
    title: '',
    description: '',
    rubric: '',
    dueDate: '',
    passingScore: 50,
    aiGradingEnabled: true,
    gradingInstructions: '',
    allowResubmission: false,
    gradingKPIs: [
      { label: "Content Accuracy",    description: "Factual correctness",       weight: 40 },
      { label: "Depth of Analysis",   description: "Detail and explanation",    weight: 30 },
      { label: "Clarity of Writing",  description: "Clear and coherent prose",  weight: 30 }
    ]
  });
  const [savingAssignment, setSavingAssignment] = useState(false);

  // Submissions Modal State
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<IAssignment | any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionSummary, setSummary] = useState<any>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradingMode, setGradingMode] = useState<'view' | 'override'>('view');
  const [tutorGrade, setTutorGrade] = useState<number>(0);
  const [tutorFeedback, setTutorFeedback] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  const isAbortError = (error: unknown) => {
    if (!axios.isAxiosError(error)) return false;
    return (
      error.code === 'ERR_CANCELED' ||
      error.message?.toLowerCase().includes('aborted') ||
      error.message?.toLowerCase().includes('canceled')
    );
  };

  const fetchContent = useCallback(async () => {
    if (!id) return;
    try {
      const [contentRes, assignRes] = await Promise.all([
        axios.get(`/api/courses/${id}`),
        axios.get(`/api/assignments?courseId=${id}`)
      ]);
      
      const courseData = contentRes.data.data;
      if (!courseData || !courseData.modules) {
        throw new Error('Invalid course data structure');
      }

      const modulesWithQuizzes = await Promise.all(courseData.modules.map(async (mod: any) => {
        const lessonsWithQuizzes = await Promise.all((mod.lessons || []).map(async (lesson: any) => {
          const quizRes = await axios.get(`/api/quizzes/by-lesson?lessonId=${lesson._id}`);
          return { ...lesson, quizzes: quizRes.data.data || [] };
        }));
        return { ...mod, lessons: lessonsWithQuizzes };
      }));

      setCourse(courseData.course);
      setModules(modulesWithQuizzes);
      setAssignments(assignRes.data.data || []);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error('Fetch Content Error:', error);
      toast.error('Failed to fetch course content');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const openQuizGenerator = (lessonId: string) => {
    setCurrentLessonId(lessonId);
    setQuizQuestions([]);
    setQuizJobId(null);
    setQuizJobStatus('');
    setShowQuizModal(true);
  };

  const pollQuizJob = async (jobId: string) => {
    const maxAttempts = 180;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await axios.get(`/api/ai/generate-quiz/${jobId}`);
      const payload = res.data?.data || res.data;
      const status = payload?.status;
      const attemptsUsed = payload?.attempts ?? attempt;
      const maxJobAttempts = payload?.maxAttempts ?? '?';
      setQuizJobStatus(`${status || 'queued'} (${attemptsUsed}/${maxJobAttempts})`);

      if (status === 'completed') {
        const questions = payload?.questions || [];
        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error('AI finished but returned no questions.');
        }
        setQuizQuestions(questions);
        setQuizTitle(`AI Quiz: ${quizConfig.questionType.replace('-', ' ')}`);
        setQuizJobId(null);
        setQuizJobStatus('');
        return;
      }

      if (status === 'failed') {
        throw new Error(payload?.lastError || 'Quiz generation failed.');
      }

      // If backend provides nextRunAt (rate-limit wait), align polling window with it.
      const nextRunAt = payload?.nextRunAt ? new Date(payload.nextRunAt).getTime() : 0;
      const now = Date.now();
      const dynamicDelay = nextRunAt > now
        ? Math.min(15000, Math.max(2500, nextRunAt - now + 500))
        : 3000;

      await new Promise((resolve) => setTimeout(resolve, dynamicDelay));
    }

    throw new Error('Quiz generation is taking too long. Please try again shortly.');
  };

  const handleGenerateAIQuiz = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentLessonId) return;

    setGeneratingQuiz(true);
    try {
      const res = await axios.post('/api/ai/generate-quiz', { 
        lessonId: currentLessonId,
        ...quizConfig
      });
      const payload = res.data?.data || res.data;
      if (payload?.queued && payload?.jobId) {
        setQuizJobId(payload.jobId);
        setQuizJobStatus('queued');
        await pollQuizJob(payload.jobId);
      } else if (payload?.questions) {
        setQuizQuestions(payload.questions);
        setQuizTitle(`AI Quiz: ${quizConfig.questionType.replace('-', ' ')}`);
        setQuizJobStatus('');
      } else {
        throw new Error('Unexpected AI response shape.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Quiz generation failed');
      setQuizJobStatus('');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const saveQuiz = async () => {
    try {
      await axios.post('/api/quizzes', {
        lessonId: currentLessonId,
        title: quizTitle,
        questions: quizQuestions,
        aiGenerated: true,
        questionType: quizConfig.questionType,
        difficulty: quizConfig.difficulty,
        focusTopic: quizConfig.focusTopic
      });
      toast.success('Quiz saved!');
      setShowQuizModal(false);
      setQuizQuestions([]);
      fetchContent();
    } catch (error) {
      toast.error('Failed to save quiz');
    }
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedKPIs = assignmentData.gradingKPIs
      .filter((kpi) => kpi.label.trim() || kpi.description.trim() || kpi.weight > 0)
      .map((kpi) => ({
        label: kpi.label.trim(),
        description: kpi.description.trim(),
        weight: Number(kpi.weight) || 0
      }));
    
    // KPI validation
    if (assignmentData.aiGradingEnabled) {
      const hasInvalidKPI = cleanedKPIs.some((kpi) => !kpi.label || !kpi.description);
      if (hasInvalidKPI) {
        return toast.error('Each KPI must include a label and description');
      }

      const total = cleanedKPIs.reduce((sum, k) => sum + k.weight, 0);
      if (total !== 100) {
        return toast.error(`Total KPI weight must be 100% (currently ${total}%)`);
      }
    }

    setSavingAssignment(true);
    try {
      if (editingAssignmentId) {
        await axios.put(`/api/assignments/${editingAssignmentId}`, {
          ...assignmentData,
          gradingKPIs: cleanedKPIs,
          courseId: id
        });
        toast.success('Assignment updated!');
      } else {
        await axios.post('/api/assignments', {
          ...assignmentData,
          gradingKPIs: cleanedKPIs,
          courseId: id
        });
        toast.success('Assignment created!');
      }
      setShowAssignmentModal(false);
      setEditingAssignmentId(null);
      setAssignmentData({
        title: '', description: '', rubric: '', dueDate: '', 
        passingScore: 50, aiGradingEnabled: true, gradingInstructions: '', allowResubmission: false,
        gradingKPIs: [
          { label: "Content Accuracy",    description: "Factual correctness",       weight: 40 },
          { label: "Depth of Analysis",   description: "Detail and explanation",    weight: 30 },
          { label: "Clarity of Writing",  description: "Clear and coherent prose",  weight: 30 }
        ]
      });
      fetchContent();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save assignment');
    } finally {
      setSavingAssignment(false);
    }
  };

  const viewSubmissions = async (assignment: IAssignment) => {
    setCurrentAssignment(assignment);
    setShowSubmissionsModal(true);
    setLoadingSubmissions(true);
    try {
      const res = await axios.get(`/api/assignments/${assignment._id}/submissions`);
      setSubmissions(res.data.data.submissions);
      setSummary(res.data.data.summary);
    } catch (error) {
      toast.error('Failed to fetch submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleGradeSubmission = async (e: React.FormEvent, acceptAI = false) => {
    if (e) e.preventDefault();
    setSavingGrade(true);
    try {
      await axios.put(`/api/submissions/${selectedSubmission._id}/grade`, {
        tutorGrade: acceptAI ? selectedSubmission.aiGrade : tutorGrade,
        tutorFeedback,
        acceptAIGrade: acceptAI
      });
      toast.success('Graded successfully!');
      
      // Refresh list
      const res = await axios.get(`/api/assignments/${currentAssignment?._id}/submissions`);
      setSubmissions(res.data.data.submissions);
      setSummary(res.data.data.summary);
      
      // Update local selected submission to show updated state
      const updated = res.data.data.submissions.find((s: any) => s._id === selectedSubmission._id);
      setSelectedSubmission(updated);
      setGradingMode('view');
    } catch (error) {
      toast.error('Failed to save grade');
    } finally {
      setSavingGrade(false);
    }
  };

  const addKPI = () => setAssignmentData({...assignmentData, gradingKPIs: [...assignmentData.gradingKPIs, {label: '', description: '', weight: 0}]});
  const removeKPI = (idx: number) => setAssignmentData({...assignmentData, gradingKPIs: assignmentData.gradingKPIs.filter((_, i) => i !== idx)});
  const updateKPI = (idx: number, field: string, val: any) => {
    const newKPIs = [...assignmentData.gradingKPIs];
    (newKPIs[idx] as any)[field] = val;
    setAssignmentData({...assignmentData, gradingKPIs: newKPIs});
  };

  const addModule = async () => {
    const title = prompt('Module Title:');
    if (!title) return;
    try {
      await axios.post(`/api/courses/${id}/modules`, {
        title,
        description: 'New module description',
        order: modules.length + 1
      });
      toast.success('Module added');
      fetchContent();
    } catch (_error) {
      toast.error('Failed to add module');
    }
  };

  const openAddLessonModal = (moduleId: string) => {
    setActiveModuleId(moduleId);
    setEditingLessonId(null);
    setLessonTab('info');
    setLessonData({
      title: '',
      overview: '',
      objectives: [],
      estimatedDuration: 30,
      prerequisites: '',
      keyTerms: [],
      contentType: 'text',
      contentBody: '',
      videoUrl: '',
      videoTimestamps: '',
      contentSections: [],
      additionalNotes: ''
    });
    setSelectedFile(null);
    setShowLessonModal(true);
  };

  const openEditLessonModal = (lesson: any) => {
    setActiveModuleId(lesson.moduleId);
    setEditingLessonId(lesson._id);
    setLessonTab('info');
    setLessonData({
      title: lesson.title,
      overview: lesson.overview || '',
      objectives: lesson.objectives || [],
      estimatedDuration: lesson.estimatedDuration || 30,
      prerequisites: lesson.prerequisites || '',
      keyTerms: lesson.keyTerms || [],
      contentType: lesson.contentType,
      contentBody: lesson.contentBody || '',
      videoUrl: lesson.contentType === 'video' ? lesson.contentUrl : '',
      videoTimestamps: lesson.videoTimestamps || '',
      contentSections: lesson.contentSections || [],
      additionalNotes: lesson.additionalNotes || ''
    });
    setSelectedFile(null);
    setShowLessonModal(true);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await axios.delete(`/api/lessons/${lessonId}`);
      toast.success('Lesson deleted');
      fetchContent();
    } catch (error) {
      toast.error('Failed to delete lesson');
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLesson(true);

    try {
      const formData = new FormData();
      formData.append('title', lessonData.title);
      formData.append('contentType', lessonData.contentType);
      formData.append('overview', lessonData.overview);
      formData.append('objectives', JSON.stringify(lessonData.objectives));
      formData.append('estimatedDuration', String(lessonData.estimatedDuration));
      formData.append('prerequisites', lessonData.prerequisites);
      formData.append('keyTerms', JSON.stringify(lessonData.keyTerms));
      formData.append('additionalNotes', lessonData.additionalNotes);
      
      if (lessonData.contentType === 'text') {
        formData.append('contentSections', JSON.stringify(lessonData.contentSections));
      } else if (lessonData.contentType === 'video') {
        formData.append('videoUrl', lessonData.videoUrl);
        formData.append('contentBody', lessonData.contentBody); // summary
        formData.append('videoTimestamps', lessonData.videoTimestamps);
      } else if (selectedFile) {
        formData.append('file', selectedFile);
        formData.append('contentBody', lessonData.contentBody); // description
      }

      if (editingLessonId) {
        await axios.put(`/api/lessons/${editingLessonId}`, formData);
        toast.success('Lesson updated!');
      } else {
        if (activeModuleId) formData.append('moduleId', activeModuleId);
        await axios.post('/api/lessons', formData);
        toast.success('Lesson created!');
      }

      setShowLessonModal(false);
      fetchContent();
    } catch (error) {
      toast.error('Failed to save lesson');
    } finally {
      setSavingLesson(false);
    }
  };

  const togglePublish = async () => {
    try {
      const res = await axios.post(`/api/courses/${id}/publish`);
      setCourse(res.data.data);
      toast.success(res.data.data.isPublished ? 'Course published!' : 'Course unpublished');
    } catch (_error) {
      toast.error('Action failed');
    }
  };

  // Helper Functions for Dynamic Lists
  const addObjective = () => setLessonData({...lessonData, objectives: [...lessonData.objectives, '']});
  const removeObjective = (idx: number) => setLessonData({...lessonData, objectives: lessonData.objectives.filter((_, i) => i !== idx)});
  const updateObjective = (idx: number, val: string) => {
    const newObjectives = [...lessonData.objectives];
    newObjectives[idx] = val;
    setLessonData({...lessonData, objectives: newObjectives});
  };

  const addTerm = () => setLessonData({...lessonData, keyTerms: [...lessonData.keyTerms, {term: '', definition: ''}]});
  const removeTerm = (idx: number) => setLessonData({...lessonData, keyTerms: lessonData.keyTerms.filter((_, i) => i !== idx)});
  const updateTerm = (idx: number, field: 'term' | 'definition', val: string) => {
    const newTerms = [...lessonData.keyTerms];
    newTerms[idx] = { ...newTerms[idx], [field]: val };
    setLessonData({...lessonData, keyTerms: newTerms});
  };

  const addSection = () => setLessonData({...lessonData, contentSections: [...lessonData.contentSections, {sectionTitle: '', sectionBody: ''}]});
  const removeSection = (idx: number) => setLessonData({...lessonData, contentSections: lessonData.contentSections.filter((_, i) => i !== idx)});
  const updateSection = (idx: number, field: 'sectionTitle' | 'sectionBody', val: string) => {
    const newSections = [...lessonData.contentSections];
    newSections[idx] = { ...newSections[idx], [field]: val };
    setLessonData({...lessonData, contentSections: newSections});
  };
  const moveSection = (idx: number, dir: 'up' | 'down') => {
    const newSections = [...lessonData.contentSections];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= newSections.length) return;
    [newSections[idx], newSections[target]] = [newSections[target], newSections[idx]];
    setLessonData({...lessonData, contentSections: newSections});
  };

  if (loading) return <div className="flex justify-center p-12">Loading content...</div>;

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{course?.title}</h1>
          <p className="text-sm text-gray-500 font-medium">Manage modules and lessons</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={togglePublish}
            className={clsx(
              "inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition-colors",
              course?.isPublished 
                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                : "bg-green-600 text-white hover:bg-green-500"
            )}
          >
            {course?.isPublished ? (
              <><Lock className="mr-2 h-4 w-4" /> Unpublish</>
            ) : (
              <><Globe className="mr-2 h-4 w-4" /> Publish Course</>
            )}
          </button>
          <button
            onClick={addModule}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Module
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Curriculum Column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Curriculum</h2>
          {modules.map((mod) => (
            <div key={mod._id as string} className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <div 
                className="flex cursor-pointer items-center justify-between bg-gray-50 p-4 hover:bg-gray-100"
                onClick={() => {
                  const modId = mod._id as string;
                  setExpandedModules(prev => prev.includes(modId) ? prev.filter(i => i !== modId) : [...prev, modId]);
                }}
              >
                <div className="flex items-center">
                  <GripVertical className="mr-3 h-5 w-5 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900">{mod.title}</h3>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">{mod.lessons?.length || 0} Lessons</span>
                  {expandedModules.includes(mod._id as string) ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>
              
              {expandedModules.includes(mod._id as string) && (
                <div className="border-t p-4 transition-all">
                  <div className="space-y-3">
                    {mod.lessons.map((lesson: any) => (
                      <div key={lesson._id} className="rounded-md border p-3 hover:bg-gray-50 space-y-3 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {lesson.contentType === 'video' && <Video className="mr-3 h-4 w-4 text-blue-500" />}
                            {lesson.contentType === 'text' && <FileText className="mr-3 h-4 w-4 text-green-500" />}
                            {lesson.contentType === 'pdf' && <LinkIcon className="mr-3 h-4 w-4 text-red-500" />}
                            {lesson.contentType === 'docx' && <FileText className="mr-3 h-4 w-4 text-orange-500" />}
                            <span className="text-sm font-medium text-gray-700">{lesson.title}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => openQuizGenerator(lesson._id)}
                              className="flex items-center text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 px-2 py-1 rounded transition-colors"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Quiz
                            </button>
                            <button 
                              onClick={() => openEditLessonModal(lesson)}
                              className="text-gray-400 hover:text-indigo-600 p-1"
                            >
                               <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteLesson(lesson._id)}
                              className="text-gray-400 hover:text-red-600 p-1"
                            >
                               <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        {lesson.quizzes && lesson.quizzes.length > 0 && (
                          <div className="ml-7 space-y-2 border-l pl-4">
                            {lesson.quizzes.map((quiz: IQuiz) => (
                              <div key={quiz._id as string} className="flex items-center text-xs text-gray-500">
                                <Award className="h-3 w-3 mr-1 text-yellow-500" />
                                <span>{quiz.title} ({quiz.questions.length} Qs)</span>
                                {quiz.aiGenerated && (
                                  <span className="ml-2 text-[10px] bg-purple-100 text-purple-600 px-1 rounded uppercase font-bold tracking-tighter">AI</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <button 
                      onClick={() => openAddLessonModal(mod._id as string)}
                      className="flex w-full items-center justify-center rounded-md border-2 border-dashed border-gray-200 p-3 text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Lesson
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {modules.length === 0 && (
            <div className="p-12 text-center border-2 border-dashed rounded-xl bg-gray-50">
               <p className="text-gray-400">No modules yet. Build your course curriculum above.</p>
            </div>
          )}
        </div>

        {/* Right Column: Assignments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Assignments</h2>
            <button
              onClick={() => setShowAssignmentModal(true)}
              className="p-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3 text-left">
            {assignments.map((assign) => (
              <div key={assign._id as string} className="bg-white p-4 rounded-xl border shadow-sm space-y-3 hover:shadow-md transition-shadow text-left">
                <div className="flex items-start justify-between">
                  <div className="flex items-center text-indigo-600">
                    <ClipboardList className="h-5 w-5 mr-2" />
                    <span className="font-bold text-sm">{assign.title}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                   <button
                    onClick={() => viewSubmissions(assign)}
                    className="text-xs font-bold text-gray-500 hover:text-indigo-600 flex items-center transition-colors"
                   >
                     <Eye className="h-3 w-3 mr-1" /> View Submissions
                   </button>
                </div>
              </div>
            ))}
            {assignments.length === 0 && (
              <div className="bg-gray-50 p-8 rounded-xl border border-dashed text-center text-xs text-gray-400">
                No assignments created yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl rounded-[1.75rem] bg-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-left">
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 lg:p-7 border-b bg-gray-50/70">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-gray-900">{editingLessonId ? 'Edit Lesson' : 'Create New Lesson'}</h2>
                <p className="text-xs text-gray-500 font-semibold mt-1">Build lesson basics first, then add learning content.</p>
                <div className="flex mt-3 bg-white border p-1 rounded-xl w-fit shadow-sm">
                   <button 
                    onClick={() => setLessonTab('info')}
                    className={clsx("px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center", lessonTab === 'info' ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500")}
                   >
                     <Layout className="h-3.5 w-3.5 mr-1.5" /> Basic Info
                   </button>
                   <button 
                    onClick={() => setLessonTab('content')}
                    className={clsx("px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center", lessonTab === 'content' ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500")}
                   >
                     <FileText className="h-3.5 w-3.5 mr-1.5" /> Lesson Content
                   </button>
                </div>
              </div>
              <button onClick={() => setShowLessonModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="h-5 w-5 text-gray-400" /></button>
            </div>

            <form onSubmit={handleSaveLesson} className="flex-1 flex flex-col overflow-hidden text-left">
              <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 custom-scrollbar">
                {lessonTab === 'info' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    <div className="space-y-6">
                      <div className="bg-white border rounded-2xl p-5 space-y-5">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Lesson Title</label>
                        <input 
                          type="text" required
                          className="w-full border-2 rounded-xl p-3.5 focus:border-indigo-500 outline-none transition-all font-semibold"
                          value={lessonData.title}
                          onChange={e => setLessonData({...lessonData, title: e.target.value})}
                        />
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Introduction / Overview</label>
                        <textarea 
                          rows={4} required
                          className="w-full border-2 rounded-xl p-3 focus:border-indigo-500 outline-none transition-all"
                          placeholder="Briefly describe what this lesson is about..."
                          value={lessonData.overview}
                          onChange={e => setLessonData({...lessonData, overview: e.target.value})}
                        />
                        <div className="flex items-center justify-between mb-2">
                           <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Learning Objectives</label>
                           <button type="button" onClick={addObjective} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center">
                              <Plus className="h-3 w-3 mr-1" /> Add
                           </button>
                        </div>
                        <div className="space-y-2">
                           {lessonData.objectives.map((obj, idx) => (
                             <div key={idx} className="flex items-center space-x-2 bg-gray-50 border rounded-xl p-2.5">
                                <div className="h-6 w-6 rounded bg-white border flex items-center justify-center text-[10px] font-black text-gray-400">{idx+1}</div>
                                <input 
                                  className="flex-1 bg-transparent border-b py-1 outline-none focus:border-indigo-500"
                                  value={obj}
                                  onChange={e => updateObjective(idx, e.target.value)}
                                  placeholder="Learn how to..."
                                />
                                <button type="button" onClick={() => removeObjective(idx)} className="text-gray-300 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                             </div>
                           ))}
                           {lessonData.objectives.length === 0 && <p className="text-[10px] text-gray-400 italic">No objectives added yet.</p>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-white border rounded-2xl p-5 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Duration (min)</label>
                            <div className="relative">
                               <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                               <input 
                                type="number" required
                                className="w-full border-2 rounded-xl p-3.5 pl-10 focus:border-indigo-500 outline-none transition-all font-semibold"
                                value={lessonData.estimatedDuration}
                                onChange={e => setLessonData({...lessonData, estimatedDuration: parseInt(e.target.value)})}
                              />
                            </div>
                         </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Prerequisites</label>
                        <textarea 
                          rows={2}
                          className="w-full border-2 rounded-xl p-3 focus:border-indigo-500 outline-none transition-all"
                          placeholder="What should students know before?"
                          value={lessonData.prerequisites}
                          onChange={e => setLessonData({...lessonData, prerequisites: e.target.value})}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                           <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Glossary / Key Terms</label>
                           <button type="button" onClick={addTerm} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center">
                              <Plus className="h-3 w-3 mr-1" /> Add Term
                           </button>
                        </div>
                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                           {lessonData.keyTerms.map((kt, idx) => (
                             <div key={idx} className="bg-gray-50 p-3 rounded-xl border relative group">
                                <button type="button" onClick={() => removeTerm(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X className="h-3.5 w-3.5" /></button>
                                <input 
                                  className="w-full bg-transparent font-bold text-xs border-b border-gray-200 mb-2 outline-none focus:border-indigo-500"
                                  placeholder="Term name"
                                  value={kt.term}
                                  onChange={e => updateTerm(idx, 'term', e.target.value)}
                                />
                                <input 
                                  className="w-full bg-transparent text-[10px] outline-none"
                                  placeholder="Definition..."
                                  value={kt.definition}
                                  onChange={e => updateTerm(idx, 'definition', e.target.value)}
                                />
                             </div>
                           ))}
                        </div>
                      </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 text-left">
                    <div className="flex items-center space-x-6 pb-6 border-b">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Content Format</label>
                        <div className="flex space-x-2">
                          {['text', 'video', 'pdf', 'docx'].map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setLessonData({...lessonData, contentType: type as any})}
                              className={clsx(
                                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all border-2",
                                lessonData.contentType === type ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-105" : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                              )}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Format Specific Builders */}
                    {lessonData.contentType === 'text' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                           <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest flex items-center">
                             <ListChecks className="mr-2 text-indigo-600" />
                             Sections Builder
                           </h3>
                           <button type="button" onClick={addSection} className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black hover:bg-indigo-100 transition-all">
                              <Plus className="h-4 w-4 mr-1.5" /> Add Section
                           </button>
                        </div>
                        <div className="space-y-4">
                           {lessonData.contentSections.map((sec, idx) => (
                             <div key={idx} className="bg-white border-2 rounded-2xl p-6 relative group hover:border-indigo-100 transition-all shadow-sm">
                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-all">
                                   <button type="button" onClick={() => moveSection(idx, 'up')} className="p-1 bg-white border rounded shadow hover:text-indigo-600"><ArrowUp className="h-3 w-3" /></button>
                                   <button type="button" onClick={() => moveSection(idx, 'down')} className="p-1 bg-white border rounded shadow hover:text-indigo-600"><ArrowDown className="h-3 w-3" /></button>
                                </div>
                                <button type="button" onClick={() => removeSection(idx)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                
                                <div className="space-y-4">
                                   <input 
                                    className="w-full text-lg font-black text-gray-900 border-none outline-none focus:ring-0 placeholder:text-gray-200"
                                    placeholder="Section Title (e.g. Overview of Transfomers)"
                                    value={sec.sectionTitle}
                                    onChange={e => updateSection(idx, 'sectionTitle', e.target.value)}
                                   />
                                   <textarea 
                                    rows={5}
                                    className="w-full border-none p-0 outline-none focus:ring-0 text-sm leading-relaxed text-gray-600 placeholder:text-gray-300"
                                    placeholder="Write your section content here... (Supports Markdown)"
                                    value={sec.sectionBody}
                                    onChange={e => updateSection(idx, 'sectionBody', e.target.value)}
                                   />
                                </div>
                             </div>
                           ))}
                           {lessonData.contentSections.length === 0 && (
                             <div className="py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                                <p className="text-xs font-bold text-gray-400">Click &quot;Add Section&quot; to start building your lesson content.</p>
                             </div>
                           )}
                        </div>
                      </div>
                    )}

                    {lessonData.contentType === 'video' && (
                      <div className="space-y-6 max-w-2xl text-left">
                        <div>
                           <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">YouTube / Vimeo URL</label>
                           <div className="relative">
                              <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input 
                                type="url" required
                                className="w-full border-2 rounded-xl p-3 pl-10 focus:border-indigo-500 outline-none transition-all font-semibold"
                                placeholder="https://youtube.com/watch?v=..."
                                value={lessonData.videoUrl}
                                onChange={e => setLessonData({...lessonData, videoUrl: e.target.value})}
                              />
                           </div>
                        </div>
                        <div>
                           <label className="block text-xs font-black text-indigo-600 uppercase mb-2 tracking-widest">Video Summary for AI (Required)</label>
                           <textarea 
                            rows={4} required
                            className="w-full border-2 border-indigo-50 rounded-xl p-3 focus:border-indigo-500 outline-none transition-all"
                            placeholder="Provide a detailed summary so the AI Tutor can help students..."
                            value={lessonData.contentBody}
                            onChange={e => setLessonData({...lessonData, contentBody: e.target.value})}
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Timestamps (Optional)</label>
                           <input 
                            type="text"
                            className="w-full border-2 rounded-xl p-3 focus:border-indigo-500 outline-none transition-all font-medium"
                            placeholder="e.g. 0:00 Intro, 2:30 Key concepts"
                            value={lessonData.videoTimestamps}
                            onChange={e => setLessonData({...lessonData, videoTimestamps: e.target.value})}
                           />
                        </div>
                      </div>
                    )}

                    {(lessonData.contentType === 'pdf' || lessonData.contentType === 'docx') && (
                      <div className="space-y-6 max-w-2xl text-left">
                        <div className="p-10 border-4 border-dashed border-gray-100 rounded-3xl bg-gray-50/50 flex flex-col items-center justify-center group hover:border-indigo-100 transition-all">
                           <UploadCloud className="h-12 w-12 text-gray-200 group-hover:text-indigo-200 transition-all mb-4" />
                           <input 
                            type="file" 
                            required={!editingLessonId}
                            accept={lessonData.contentType === 'pdf' ? '.pdf' : '.docx'}
                            className="hidden"
                            id="lesson-file-upload"
                            onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                          />
                          <label htmlFor="lesson-file-upload" className="bg-white px-6 py-2 rounded-xl shadow-sm border font-bold text-xs text-gray-600 cursor-pointer hover:bg-gray-50 transition-all">
                             {selectedFile ? selectedFile.name : `Select ${lessonData.contentType.toUpperCase()} File`}
                          </label>
                          <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Max file size: 10MB</p>
                        </div>
                        <div>
                           <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Document Description</label>
                           <textarea 
                            rows={3}
                            className="w-full border-2 rounded-xl p-3 focus:border-indigo-500 outline-none transition-all"
                            placeholder="Brief description for the students..."
                            value={lessonData.contentBody}
                            onChange={e => setLessonData({...lessonData, contentBody: e.target.value})}
                           />
                        </div>
                      </div>
                    )}

                    <div className="pt-6 border-t text-left">
                       <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Additional Notes (Optional)</label>
                       <textarea 
                        rows={3}
                        className="w-full border-2 rounded-xl p-3 focus:border-indigo-500 outline-none transition-all"
                        placeholder="Any extra info or external links?"
                        value={lessonData.additionalNotes}
                        onChange={e => setLessonData({...lessonData, additionalNotes: e.target.value})}
                       />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t bg-gray-50 flex justify-end items-center space-x-4">
                 <button type="button" onClick={() => setShowLessonModal(false)} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                 <button 
                  type="submit" 
                  disabled={savingLesson}
                  className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95 flex items-center"
                 >
                   {savingLesson ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                   {editingLessonId ? 'Update Lesson' : 'Create Lesson'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
           <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl text-left flex flex-col">
             <div className="flex justify-between items-center p-6 border-b bg-gray-50">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{editingAssignmentId ? 'Edit Assignment' : 'New Assignment'}</h2>
                <button onClick={() => setShowAssignmentModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="h-5 w-5 text-gray-400" /></button>
             </div>
             <form onSubmit={handleSaveAssignment} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Assignment Title</label>
                      <input type="text" required className="w-full border-2 rounded-xl p-3 outline-none focus:border-indigo-500 font-bold transition-all" value={assignmentData.title} onChange={e => setAssignmentData({...assignmentData, title: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Instructions & Requirements</label>
                      <textarea rows={6} required className="w-full border-2 rounded-xl p-3 outline-none focus:border-indigo-500 transition-all text-sm leading-relaxed" value={assignmentData.description} onChange={e => setAssignmentData({...assignmentData, description: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Reference Rubric (Legacy)</label>
                      <textarea rows={3} required className="w-full border-2 rounded-xl p-3 outline-none focus:border-indigo-500 transition-all text-sm" value={assignmentData.rubric} onChange={e => setAssignmentData({...assignmentData, rubric: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 space-y-6">
                       <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center">
                         <Settings2 className="h-4 w-4 mr-2" /> Grading Setup
                       </h3>
                       
                       <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Minimum passing score (%)</label>
                          <input 
                            type="number" min="0" max="100"
                            className="w-full border-2 border-white rounded-xl p-3 outline-none focus:border-indigo-500 font-bold"
                            value={assignmentData.passingScore || 0}
                            onChange={e => setAssignmentData({...assignmentData, passingScore: parseInt(e.target.value) || 0})}
                          />
                       </div>

                       <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-indigo-100">
                          <div className="flex-1 mr-4">
                             <p className="text-[10px] font-black text-gray-900 uppercase">Enable AI Grading</p>
                             <p className="text-[9px] text-gray-500 font-bold leading-tight mt-1">AI will grade submissions instantly using your KPIs.</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setAssignmentData({...assignmentData, aiGradingEnabled: !assignmentData.aiGradingEnabled})}
                            className={clsx(
                              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              assignmentData.aiGradingEnabled ? "bg-indigo-600" : "bg-gray-200"
                            )}
                          >
                            <span className={clsx(
                              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                              assignmentData.aiGradingEnabled ? "translate-x-5" : "translate-x-0"
                            )} />
                          </button>
                       </div>

                       <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-indigo-100">
                          <div className="flex-1 mr-4">
                             <p className="text-[10px] font-black text-gray-900 uppercase">Allow Resubmission</p>
                             <p className="text-[9px] text-gray-500 font-bold leading-tight mt-1">Students can retry after getting AI feedback.</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setAssignmentData({...assignmentData, allowResubmission: !assignmentData.allowResubmission})}
                            className={clsx(
                              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              assignmentData.allowResubmission ? "bg-indigo-600" : "bg-gray-200"
                            )}
                          >
                            <span className={clsx(
                              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                              assignmentData.allowResubmission ? "translate-x-5" : "translate-x-0"
                            )} />
                          </button>
                       </div>

                       <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Instructions for AI Grader</label>
                          <textarea 
                            rows={3}
                            className="w-full border-2 border-white rounded-xl p-3 outline-none focus:border-indigo-500 text-xs"
                            placeholder="e.g. Focus on practical examples. Deduct for poor formatting..."
                            value={assignmentData.gradingInstructions}
                            onChange={e => setAssignmentData({...assignmentData, gradingInstructions: e.target.value})}
                          />
                       </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Due Date (Optional)</label>
                      <input type="datetime-local" className="w-full border-2 rounded-xl p-3 outline-none focus:border-indigo-500 font-medium text-sm transition-all" value={assignmentData.dueDate} onChange={e => setAssignmentData({...assignmentData, dueDate: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* KPI Builder */}
                {assignmentData.aiGradingEnabled && (
                   <div className="space-y-6 pt-8 border-t">
                      <div className="flex items-center justify-between">
                         <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Grading Criteria (KPIs)</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Define what the AI should look for.</p>
                         </div>
                         <button type="button" onClick={addKPI} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all">
                            <Plus className="h-3.5 w-3.5 mr-2 inline" /> Add KPI
                         </button>
                      </div>

                      <div className="space-y-4">
                         {assignmentData.gradingKPIs.map((kpi, idx) => (
                           <div key={idx} className="p-6 rounded-3xl bg-gray-50 border-2 border-transparent hover:border-indigo-100 transition-all relative group">
                              <button type="button" onClick={() => removeKPI(idx)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                              <div className="grid grid-cols-4 gap-6">
                                 <div className="col-span-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Weight (%)</label>
                                    <input 
                                      type="number"
                                      className="w-full bg-white border-2 rounded-xl p-3 outline-none focus:border-indigo-500 font-black text-indigo-600"
                                      value={kpi.weight}
                                      onChange={e => updateKPI(idx, 'weight', parseInt(e.target.value))}
                                    />
                                 </div>
                                 <div className="col-span-3 space-y-4">
                                    <input 
                                      className="w-full bg-transparent font-black text-gray-900 border-none outline-none focus:ring-0 p-0 text-sm placeholder:text-gray-200"
                                      placeholder="KPI Label (e.g. Critical Thinking)"
                                      value={kpi.label}
                                      onChange={e => updateKPI(idx, 'label', e.target.value)}
                                    />
                                    <textarea 
                                      rows={2}
                                      className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-xs text-gray-500 placeholder:text-gray-300"
                                      placeholder="Describe what a perfect score looks like..."
                                      value={kpi.description}
                                      onChange={e => updateKPI(idx, 'description', e.target.value)}
                                    />
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>

                      <div className={clsx(
                        "p-4 rounded-2xl flex items-center justify-between",
                        assignmentData.gradingKPIs.reduce((sum, k) => sum + k.weight, 0) === 100 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                      )}>
                         <span className="text-xs font-black uppercase tracking-widest">Total Weight:</span>
                         <span className="text-lg font-black">{assignmentData.gradingKPIs.reduce((sum, k) => sum + k.weight, 0)}%</span>
                      </div>
                   </div>
                )}
             </form>
             <div className="p-6 border-t bg-gray-50 flex justify-end items-center">
                 <button type="button" onClick={() => setShowAssignmentModal(false)} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors mr-4">Cancel</button>
                 <button 
                  onClick={handleSaveAssignment}
                  disabled={savingAssignment}
                  className="px-12 py-4 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center"
                 >
                   {savingAssignment ? <Loader2 className="animate-spin h-5 w-5 mr-3" /> : <Save className="h-5 w-5 mr-3" />}
                   {editingAssignmentId ? 'Save Changes' : 'Launch Assignment'}
                 </button>
             </div>
           </div>
        </div>
      )}

      {/* Submissions Modal */}
      {showSubmissionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[1400px] h-[94vh] flex flex-col rounded-[2.25rem] bg-white shadow-2xl overflow-hidden text-left">
             {/* Summary Bar */}
             <div className="p-6 lg:p-8 border-b bg-gray-50 flex flex-wrap gap-4 justify-between items-start">
                <div className="space-y-1">
                   <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{currentAssignment?.title}</h2>
                   <div className="flex flex-wrap items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <span>Course: {currentAssignment?.courseId?.title}</span>
                      <span className="h-1 w-1 rounded-full bg-gray-300" />
                      <span className="text-indigo-600">Passing Score: {currentAssignment?.passingScore}%</span>
                   </div>
                </div>
                
                {submissionSummary && (
                   <div className="flex flex-wrap items-center gap-5">
                      {[
                        { label: 'Enrolled', val: submissionSummary.totalEnrolled },
                        { label: 'Submitted', val: submissionSummary.totalSubmitted },
                        { label: 'AI Reviewed', val: submissionSummary.totalAIReviewed },
                        { label: 'Avg Grade', val: `${submissionSummary.averageFinalGrade.toFixed(0)}%` }
                      ].map((stat, i) => (
                        <div key={i} className="text-center">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                           <p className="text-lg font-black text-gray-900 tracking-tighter">{stat.val}</p>
                        </div>
                      ))}
                      <button onClick={() => { setShowSubmissionsModal(false); setSelectedSubmission(null); }} className="p-3 hover:bg-gray-200 rounded-full transition-colors ml-4"><X className="h-6 w-6 text-gray-400" /></button>
                   </div>
                )}
             </div>

             <div className="flex-1 flex overflow-hidden">
                {/* Left: Submissions Table */}
                <div className="w-[320px] lg:w-[360px] border-r overflow-y-auto custom-scrollbar bg-white">
                   <div className="p-4 bg-white border-b sticky top-0 z-10">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Submissions</p>
                   </div>
                   <div className="divide-y">
                      {loadingSubmissions ? (
                        <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading list...</div>
                      ) : submissions.length > 0 ? (
                        submissions.map(sub => (
                           <button
                            key={sub._id}
                            onClick={() => { setSelectedSubmission(sub); setGradingMode('view'); }}
                            className={clsx(
                              "w-full p-6 text-left transition-all flex items-center group",
                              selectedSubmission?._id === sub._id ? "bg-indigo-50/50 border-r-4 border-indigo-600" : "hover:bg-gray-50"
                            )}
                           >
                              <div className="h-10 w-10 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-gray-500 mr-4 group-hover:scale-110 transition-transform">
                                 {sub.studentId?.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="font-black text-gray-900 text-sm tracking-tight truncate">{sub.studentId?.name}</p>
                                 <div className="flex items-center mt-1 space-x-3">
                                    <span className={clsx(
                                      "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                                      sub.status === 'submitted' ? "bg-gray-100 text-gray-500" :
                                      sub.status === 'ai_reviewed' ? "bg-blue-100 text-blue-600" :
                                      "bg-green-100 text-green-600"
                                    )}>
                                      {sub.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-bold">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                                 </div>
                              </div>
                              <div className="text-right ml-2">
                                 {sub.finalGrade !== undefined ? (
                                    <span className={clsx("text-sm font-black tracking-tighter", sub.isPassing ? "text-green-600" : "text-red-600")}>
                                       {sub.finalGrade}%
                                    </span>
                                 ) : sub.aiGrade !== undefined ? (
                                    <span className="text-sm font-black text-blue-500 tracking-tighter">{sub.aiGrade}%</span>
                                 ) : (
                                    <span className="text-[10px] font-black text-gray-300 uppercase">--</span>
                                 )}
                              </div>
                           </button>
                        ))
                      ) : (
                        <div className="p-12 text-center text-gray-300 font-bold uppercase tracking-widest text-xs italic">No submissions yet.</div>
                      )}
                   </div>
                </div>

                {/* Right: Grading Panel */}
                <div className="flex-1 bg-gray-50/30 overflow-y-auto custom-scrollbar p-5 lg:p-8">
                   {selectedSubmission ? (
                    <div className="max-w-none space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Student Info Card */}
                       <div className="flex flex-wrap items-start justify-between gap-4">
                           <div className="flex items-center">
                              <div className="h-16 w-16 rounded-3xl bg-white shadow-sm border flex items-center justify-center font-black text-2xl text-indigo-600 mr-6">
                                 {selectedSubmission.studentId?.name.charAt(0)}
                              </div>
                              <div>
                                 <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedSubmission.studentId?.name}</h3>
                                 <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">{selectedSubmission.studentId?.email}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Submitted on</p>
                              <p className="text-sm font-black text-gray-900">{new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.9fr)] gap-6 lg:gap-8 items-start">
                           {/* Submission Content */}
                           <div className="space-y-8">
                              <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-6">
                                 <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                                    <FileText className="h-4 w-4 mr-2" /> Content Preview
                                 </h4>
                                 {selectedSubmission.submissionText && (
                                    <div className="prose prose-sm max-w-none text-gray-700 font-medium whitespace-pre-wrap leading-relaxed max-h-[48vh] overflow-y-auto pr-2">
                                       {selectedSubmission.submissionText}
                                    </div>
                                 )}
                                 {selectedSubmission.fileUrl && (
                                    <div className="p-6 bg-gray-50 rounded-2xl border flex items-center justify-between group">
                                       <div className="flex items-center">
                                          <div className={clsx(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center mr-4",
                                            selectedSubmission.fileType === 'pdf' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                                          )}>
                                             <FileText className="h-6 w-6" />
                                          </div>
                                          <div>
                                             <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{selectedSubmission.fileName}</p>
                                             <p className="text-[9px] text-gray-400 font-bold uppercase">{selectedSubmission.fileType} Document</p>
                                          </div>
                                       </div>
                                       <a 
                                          href={selectedSubmission.fileUrl} target="_blank" rel="noopener noreferrer"
                                          className="p-3 bg-white border rounded-xl hover:text-indigo-600 hover:shadow-md transition-all"
                                       >
                                          <ExternalLink className="h-4 w-4" />
                                       </a>
                                    </div>
                                 )}
                              </div>
                           </div>

                           {/* Grading Panel */}
                           <div className="space-y-8 xl:sticky xl:top-0">
                              {/* AI Analysis Result - Only show if data exists */}
                              {selectedSubmission.aiGrade !== undefined && (
                                 <div className="bg-indigo-600 rounded-[2.25rem] p-6 lg:p-8 text-white shadow-2xl relative overflow-hidden group max-h-[72vh] overflow-y-auto">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform"><Sparkles className="h-24 w-24" /></div>
                                    
                                    <div className="relative z-10 space-y-6">
                                       <div className="flex justify-between items-start">
                                          <div>
                                             <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">AI Preliminary Review</p>
                                             <p className="text-4xl font-black tracking-tighter mt-1">{selectedSubmission.aiGrade}%</p>
                                          </div>
                                          <div className={clsx(
                                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                            selectedSubmission.aiGrade >= (currentAssignment?.passingScore || 50) ? "bg-green-400 text-green-900" : "bg-red-400 text-red-900"
                                          )}>
                                             {selectedSubmission.aiGrade >= (currentAssignment?.passingScore || 50) ? 'PASSING' : 'FAILED'}
                                          </div>
                                       </div>

                                       <div className="space-y-4">
                                          <p className="text-[13px] text-indigo-100 font-medium leading-relaxed italic border-l-2 border-indigo-400 pl-4">
                                             {selectedSubmission.aiRemarks}
                                          </p>
                                          
                                          <div className="grid grid-cols-2 gap-4">
                                             <div className="bg-white/10 p-4 rounded-2xl">
                                                <p className="text-[9px] font-black uppercase text-indigo-200 mb-2 flex items-center">
                                                   <CheckCircle2 className="h-3 w-3 mr-1.5 text-green-400" /> Strengths
                                                </p>
                                                <ul className="text-[11px] space-y-1.5 font-bold">
                                                   {selectedSubmission.aiStrengths?.slice(0, 2).map((s: string, i: number) => <li key={i}>• {s}</li>)}
                                                </ul>
                                             </div>
                                             <div className="bg-white/10 p-4 rounded-2xl">
                                                <p className="text-[9px] font-black uppercase text-indigo-200 mb-2 flex items-center">
                                                   <ArrowUp className="h-3 w-3 mr-1.5 text-amber-400" /> Improvements
                                                </p>
                                                <ul className="text-[11px] space-y-1.5 font-bold">
                                                   {selectedSubmission.aiWeaknesses?.slice(0, 2).map((s: string, i: number) => <li key={i}>• {s}</li>)}
                                                </ul>
                                             </div>
                                          </div>
                                       </div>

                                       {selectedSubmission.status === 'ai_reviewed' && gradingMode === 'view' && (
                                          <div className="flex space-x-3 pt-4">
                                             <button 
                                                onClick={(e) => handleGradeSubmission(e, true)}
                                                className="flex-1 bg-white text-indigo-600 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                                             >
                                                Accept AI Grade
                                             </button>
                                             <button 
                                                onClick={() => { setGradingMode('override'); setTutorGrade(selectedSubmission.aiGrade); setTutorFeedback(selectedSubmission.aiRemarks); }}
                                                className="flex-1 bg-indigo-500 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-400 transition-all"
                                             >
                                                Override
                                             </button>
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              )}

                              {/* Manual Override Form */}
                              {(selectedSubmission.status === 'submitted' || gradingMode === 'override') && (
                                 <form onSubmit={(e) => handleGradeSubmission(e, false)} className="bg-white p-8 rounded-[3rem] border shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center">
                                       <Edit className="h-4 w-4 mr-3 text-indigo-600" /> Manual Grade Override
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 gap-6">
                                       <div>
                                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Final Score (0-100)</label>
                                          <input 
                                             type="number" required min="0" max="100"
                                             className="w-full border-2 rounded-2xl p-4 text-3xl font-black text-indigo-600 outline-none focus:border-indigo-500"
                                             value={tutorGrade || 0}
                                             onChange={e => setTutorGrade(parseInt(e.target.value) || 0)}
                                          />                                       </div>
                                       <div>
                                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tutor Remarks</label>
                                          <textarea 
                                             rows={6} required
                                             className="w-full border-2 rounded-2xl p-4 outline-none focus:border-indigo-500 text-sm leading-relaxed"
                                             placeholder="Share your detailed feedback..."
                                             value={tutorFeedback}
                                             onChange={e => setTutorFeedback(e.target.value)}
                                          />
                                       </div>
                                    </div>

                                    <div className="flex space-x-3 pt-4">
                                       <button 
                                          type="submit" disabled={savingGrade}
                                          className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center"
                                       >
                                          {savingGrade ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                          Confirm Final Grade
                                       </button>
                                       {selectedSubmission.status !== 'submitted' && (
                                          <button 
                                             type="button" onClick={() => setGradingMode('view')}
                                             className="px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                                          >
                                             Cancel
                                          </button>
                                       )}
                                    </div>
                                 </form>
                              )}

                              {/* Graded View */}
                              {selectedSubmission.status === 'graded' && gradingMode === 'view' && (
                                 <div className="bg-green-600 rounded-[3rem] p-10 text-white shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                                    <div className="flex justify-between items-start">
                                       <div>
                                          <p className="text-[10px] font-black text-green-200 uppercase tracking-widest">Final Grade Confirmed</p>
                                          <p className="text-6xl font-black tracking-tighter mt-1">{selectedSubmission.finalGrade}%</p>
                                       </div>
                                       <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center">
                                          <CheckCircle2 className="h-8 w-8 text-white" />
                                       </div>
                                    </div>

                                    <div className="space-y-6">
                                       <div className="p-6 bg-white/10 rounded-2xl border border-white/10 space-y-4">
                                          <p className="text-[10px] font-black uppercase text-green-200">Feedback to Student</p>
                                          <p className="text-sm font-bold leading-relaxed">{selectedSubmission.tutorFeedback || selectedSubmission.aiRemarks}</p>
                                       </div>
                                       
                                       <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-green-200">
                                          <span className="bg-white/20 px-3 py-1 rounded-full mr-4">Status: {selectedSubmission.isPassing ? 'PASSED' : 'FAILED'}</span>
                                          <span>Graded on {new Date(selectedSubmission.gradedAt).toLocaleDateString()}</span>
                                       </div>
                                       
                                       <button 
                                          onClick={() => { setGradingMode('override'); setTutorGrade(selectedSubmission.finalGrade); setTutorFeedback(selectedSubmission.tutorFeedback); }}
                                          className="w-full bg-white/10 hover:bg-white/20 border-2 border-white/20 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                                       >
                                          Edit Grade
                                       </button>
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* KPI Analysis Result Table */}
                        {selectedSubmission.aiKpiBreakdown?.length > 0 && (
                           <div className="bg-white p-10 rounded-[3rem] border shadow-sm space-y-8">
                              <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center">
                                 <Settings2 className="h-5 w-5 mr-3 text-indigo-600" /> AI Criterion Analysis
                              </h4>
                              <div className="grid grid-cols-1 gap-4">
                                 {selectedSubmission.aiKpiBreakdown.map((kpi: any, i: number) => (
                                    <div key={i} className="p-6 bg-gray-50 rounded-2xl border flex items-center group hover:bg-white hover:border-indigo-100 transition-all">
                                       <div className="h-12 w-12 rounded-xl bg-white border font-black text-indigo-600 flex items-center justify-center mr-6 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                          {kpi.score}%
                                       </div>
                                       <div className="flex-1">
                                          <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{kpi.kpiLabel}</p>
                                          <p className="text-xs text-gray-500 font-medium mt-1">{kpi.comment}</p>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}
                     </div>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <div className="p-10 bg-gray-50 rounded-full mb-6">
                           <ClipboardList className="h-24 w-24 opacity-5" />
                        </div>
                        <p className="text-lg font-black uppercase tracking-tighter">Ready for Review</p>
                        <p className="text-sm font-bold text-gray-400 mt-2">Select a student submission to begin grading.</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* AI Quiz Modal and Config logic as previously defined */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl h-[85vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden text-left">
            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
              <h2 className="text-xl font-black flex items-center text-gray-900 uppercase tracking-tight">
                <Sparkles className="mr-3 text-purple-600 h-6 w-6" />
                AI Quiz Generator
              </h2>
              <button onClick={() => setShowQuizModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="h-5 w-5 text-gray-400" /></button>
            </div>

            {generatingQuiz ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                 <div className="relative">
                    <div className="h-20 w-20 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-purple-600 animate-pulse" />
                 </div>
                 <div className="text-center">
                    <p className="text-xl font-black text-gray-900 uppercase tracking-tight">Gemini is Thinking...</p>
                    <p className="text-sm text-gray-500 font-medium mt-2">
                      {quizJobId ? 'Queued and processing your quiz request. This may take up to a minute on free tier.' : 'Crafting your custom assessment questions.'}
                    </p>
                    {quizJobStatus && (
                      <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-indigo-500">
                        Status: {quizJobStatus}
                      </p>
                    )}
                 </div>
              </div>
            ) : quizQuestions.length > 0 ? (
              <>
                <div className="p-6 border-b bg-white">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quiz Title</label>
                   <input 
                    className="w-full border-b-2 border-gray-100 text-lg font-black focus:border-indigo-600 outline-none py-2"
                    value={quizTitle}
                    onChange={e => setQuizTitle(e.target.value)}
                   />
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gray-50/30">
                  {quizQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="p-6 rounded-2xl bg-white border-2 border-gray-100 shadow-sm relative group">
                      <button 
                        onClick={() => setQuizQuestions(quizQuestions.filter((_, i) => i !== qIdx))}
                        className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                      ><Trash2 className="h-4 w-4" /></button>
                      
                      <div className="flex items-start">
                        <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black mr-4 shadow-md">Q{qIdx+1}</span>
                        <div className="flex-1 space-y-4">
                           <textarea 
                            className="w-full font-bold text-gray-900 border-none focus:ring-0 p-0 text-sm leading-relaxed"
                            rows={2}
                            value={q.questionText}
                            onChange={e => {
                              const newQs = [...quizQuestions];
                              newQs[qIdx].questionText = e.target.value;
                              setQuizQuestions(newQs);
                            }}
                           />
                           {q.options?.length > 0 ? (
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                               {q.options.map((opt: string, oIdx: number) => (
                                 <div key={oIdx} className={clsx(
                                   "flex items-center p-3 rounded-xl border transition-all",
                                   q.correctOption === oIdx ? "border-green-500 bg-green-50 shadow-sm" : "border-gray-100"
                                 )}>
                                   <input 
                                     type="radio" readOnly checked={q.correctOption === oIdx}
                                     className="mr-3 text-indigo-600"
                                   />
                                   <input 
                                     className="flex-1 text-xs bg-transparent border-none focus:ring-0 p-0 font-medium text-gray-700"
                                     value={opt}
                                     onChange={e => {
                                       const newQs = [...quizQuestions];
                                       newQs[qIdx].options[oIdx] = e.target.value;
                                       setQuizQuestions(newQs);
                                     }}
                                   />
                                 </div>
                               ))}
                             </div>
                           ) : (
                             <div className="p-4 rounded-xl bg-purple-50 border-2 border-purple-100 border-dashed">
                                <p className="text-[10px] font-black text-purple-600 uppercase mb-2">Model Answer (Open-Ended)</p>
                                <p className="text-xs text-purple-900 font-medium leading-relaxed">{q.modelAnswer}</p>
                             </div>
                           )}

                           <div className="pt-4 border-t border-gray-50">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tutor Explanation</label>
                              <textarea 
                                className="w-full bg-transparent text-xs text-gray-500 border-none focus:ring-0 mt-1 italic leading-relaxed"
                                value={q.explanation}
                                onChange={e => {
                                  const newQs = [...quizQuestions];
                                  newQs[qIdx].explanation = e.target.value;
                                  setQuizQuestions(newQs);
                                }}
                              />
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6 flex justify-end space-x-3 bg-gray-50 border-t">
                   <button onClick={() => setQuizQuestions([])} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Back to Config</button>
                   <button 
                    onClick={saveQuiz}
                    className="px-10 py-3 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-green-700 transition-all active:scale-95 flex items-center"
                   >
                     <Save className="mr-2 h-4 w-4" /> Save Quiz to Lesson
                   </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleGenerateAIQuiz} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                         <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Number of Questions</label>
                            <div className="flex items-center space-x-4">
                               <input 
                                type="range" min="3" max="20" 
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                value={quizConfig.numberOfQuestions}
                                onChange={e => setQuizConfig({...quizConfig, numberOfQuestions: parseInt(e.target.value)})}
                               />
                               <span className="h-10 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600">{quizConfig.numberOfQuestions}</span>
                            </div>
                         </div>

                         <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Question Type</label>
                            <div className="grid grid-cols-2 gap-3">
                               {[
                                 { id: 'multiple-choice', label: 'MCQ', icon: Type },
                                 { id: 'true-false', label: 'True/False', icon: CheckCircle2 },
                                 { id: 'open-ended', label: 'Open Ended', icon: FileText },
                                 { id: 'mixed', label: 'Mixed Mode', icon: Layers }
                               ].map(type => (
                                 <button
                                  key={type.id}
                                  type="button"
                                  onClick={() => setQuizConfig({...quizConfig, questionType: type.id as any})}
                                  className={clsx(
                                    "flex items-center p-3 rounded-xl border-2 transition-all text-left",
                                    quizConfig.questionType === type.id ? "border-indigo-600 bg-indigo-50" : "border-gray-100 hover:border-gray-200"
                                  )}
                                 >
                                    <type.icon className={clsx("h-4 w-4 mr-2", quizConfig.questionType === type.id ? "text-indigo-600" : "text-gray-400")} />
                                    <span className={clsx("text-xs font-black uppercase tracking-tighter", quizConfig.questionType === type.id ? "text-indigo-900" : "text-gray-500")}>{type.label}</span>
                                 </button>
                               ))}
                            </div>
                         </div>
                      </div>

                      <div className="space-y-6">
                         <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Difficulty Level</label>
                            <div className="flex bg-gray-100 p-1.5 rounded-xl">
                               {['easy', 'medium', 'hard'].map(level => (
                                 <button
                                  key={level}
                                  type="button"
                                  onClick={() => setQuizConfig({...quizConfig, difficulty: level as any})}
                                  className={clsx(
                                    "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    quizConfig.difficulty === level ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
                                  )}
                                 >
                                   {level}
                                 </button>
                               ))}
                            </div>
                         </div>

                         <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                               <Settings2 className="h-3 w-3 mr-2" />
                               Focus Topic (Optional)
                            </label>
                            <input 
                              type="text"
                              className="w-full border-2 rounded-xl p-3 focus:border-indigo-500 outline-none transition-all font-medium text-sm"
                              placeholder="e.g. Only cover the Attention Mechanism..."
                              value={quizConfig.focusTopic}
                              onChange={e => setQuizConfig({...quizConfig, focusTopic: e.target.value})}
                            />
                            <p className="text-[10px] text-gray-400 mt-2 italic font-medium">Leave blank for overall lesson coverage.</p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="p-8 border-t bg-white flex justify-center">
                   <button 
                    type="submit"
                    className="w-full max-w-sm py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:translate-y-0 flex items-center justify-center group"
                   >
                     <Sparkles className="mr-3 h-5 w-5 group-hover:animate-pulse" />
                     Generate Dynamic Quiz
                   </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Global CSS for scrollbars */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
