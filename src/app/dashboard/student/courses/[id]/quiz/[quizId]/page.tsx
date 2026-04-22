'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Award,
  HelpCircle,
  CheckCircle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface IQuestion {
  questionText: string;
  options: string[];
  correctOption: number;
  explanation: string;
  modelAnswer?: string;
  gradingCriteria?: string;
}

interface IQuiz {
  _id: string;
  title: string;
  questions: IQuestion[];
  questionType: string;
}

export default function StudentQuizPage() {
  const { id, quizId } = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<IQuiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | string)[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selfAssessments, setSelfAssessments] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`/api/quizzes/${quizId}`);
        setQuiz(res.data.data || res.data);
        const data = res.data.data || res.data;
        // Initialize answers: -1 for MCQ, empty string for Open-Ended
        setAnswers(data.questions.map((q: any) => q.correctOption === -1 ? '' : -1));
      } catch (_error) {
        toast.error('Failed to fetch quiz');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId]);

  const handleOptionSelect = (optionIdx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIdx;
    setAnswers(newAnswers);
  };

  const handleTextAnswerChange = (val: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = val;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    // Validation
    const hasUnanswered = answers.some((a, i) => {
        const q = quiz?.questions[i];
        if (q?.correctOption === -1) return (a as string).trim().length < 5;
        return a === -1;
    });

    if (hasUnanswered) {
      toast.error('Please provide complete answers for all questions');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`/api/quizzes/${quizId}/submit`, { answers });
      setResult(res.data.data || res.data);
      toast.success('Quiz submitted!');
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Failed to submit quiz';
      toast.error(message);
      if (error?.response?.status === 409) {
        router.push(`/dashboard/student/courses/${id}/learn`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelfAssess = async (idx: number, isCorrect: boolean) => {
    setSelfAssessments(prev => ({ ...prev, [idx]: isCorrect }));
    try {
        await axios.put(`/api/submissions/${result.submissionId}/self-assess`, {
            questionIndex: idx,
            isCorrect
        });
        toast.success(isCorrect ? 'Marked as correct' : 'Marked for more practice');
    } catch (error) {
        toast.error('Failed to save self-assessment');
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

  if (result) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-6 lg:px-10 text-left animate-in fade-in duration-700">
        <div className="bg-indigo-600 rounded-[2.5rem] shadow-2xl p-10 text-center mb-10 text-white relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Award className="h-40 w-40" /></div>
          <h1 className="text-3xl font-black uppercase tracking-tight relative z-10">Assessment Complete</h1>
          <div className="mt-8 flex justify-center space-x-12 relative z-10">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 min-w-[140px]">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Score</p>
              <p className="text-4xl font-black">{result.score} <span className="text-sm opacity-50">/ {result.totalQuestions}</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 min-w-[140px]">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Percentage</p>
              <p className="text-4xl font-black">{Math.round(result.percentage)}%</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {result.results.map((res: any, idx: number) => (
            <div key={idx} className={clsx(
              "p-8 rounded-[2rem] border-2 bg-white transition-all shadow-sm",
              res.isOpenEnded ? "border-purple-100" : res.isCorrect ? "border-green-100" : "border-red-100"
            )}>
              <div className="flex items-start">
                <div className="mr-6 mt-1">
                   {res.isOpenEnded ? (
                     <div className="h-10 w-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-inner">
                        <HelpCircle className="h-6 w-6" />
                     </div>
                   ) : res.isCorrect ? (
                     <div className="h-10 w-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shadow-inner">
                        <CheckCircle2 className="h-6 w-6" />
                     </div>
                   ) : (
                     <div className="h-10 w-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shadow-inner">
                        <XCircle className="h-6 w-6" />
                     </div>
                   )}
                </div>
                
                <div className="flex-1 space-y-6">
                  <div>
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Question {idx+1}</span>
                     <h3 className="text-xl font-bold text-gray-900 leading-tight">{res.questionText}</h3>
                  </div>

                  {!res.isOpenEnded ? (
                    /* MCQ Results */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3">
                        {quiz?.questions[idx].options.map((opt: string, optIdx: number) => (
                        <div key={optIdx} className={clsx(
                            "text-sm p-4 rounded-xl border-2 font-medium flex items-center justify-between",
                            optIdx === res.correctOption ? "bg-green-50 border-green-500 text-green-700 shadow-sm" : 
                            (optIdx === res.selectedOption && !res.isCorrect) ? "bg-red-50 border-red-500 text-red-700 shadow-sm" : "bg-gray-50 border-gray-100 text-gray-400"
                        )}>
                            <span>{opt}</span>
                            {optIdx === res.correctOption && <CheckCircle className="h-4 w-4" />}
                            {optIdx === res.selectedOption && !res.isCorrect && <AlertCircle className="h-4 w-4" />}
                        </div>
                        ))}
                    </div>
                  ) : (
                    /* Open-Ended Results */
                    <div className="space-y-6">
                       <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Your Answer</p>
                          <p className="text-sm text-gray-800 leading-relaxed font-medium">{res.selectedAnswer}</p>
                       </div>
                       
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="p-6 rounded-2xl bg-green-50 border-2 border-green-100 border-dashed">
                             <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-3">Model Answer</p>
                             <p className="text-sm text-green-900 leading-relaxed font-medium">{res.modelAnswer}</p>
                          </div>
                          <div className="p-6 rounded-2xl bg-indigo-50 border-2 border-indigo-100 border-dashed">
                             <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Grading Criteria</p>
                             <p className="text-sm text-indigo-900 leading-relaxed font-medium">{res.gradingCriteria}</p>
                          </div>
                       </div>

                       <div className="bg-purple-600 p-8 rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-purple-100">
                          <div className="text-left flex items-start">
                             <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center mr-4 flex-shrink-0"><Info className="h-5 w-5" /></div>
                             <div>
                                <p className="font-black text-sm uppercase tracking-tight">Self Assessment Required</p>
                                <p className="text-xs text-purple-100 mt-1 font-medium leading-relaxed">Open-ended questions are evaluated by you. Compare your answer to the model above.</p>
                             </div>
                          </div>
                          <div className="flex items-center space-x-3 w-full md:w-auto">
                             <button 
                                onClick={() => handleSelfAssess(idx, false)}
                                className={clsx(
                                    "flex-1 md:flex-none flex items-center justify-center px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                    selfAssessments[idx] === false ? "bg-red-500 text-white shadow-lg" : "bg-white/10 hover:bg-white/20 border border-white/20 text-white"
                                )}
                             >
                                <ThumbsDown className="h-3 w-3 mr-2" /> Needs Practice
                             </button>
                             <button 
                                onClick={() => handleSelfAssess(idx, true)}
                                className={clsx(
                                    "flex-1 md:flex-none flex items-center justify-center px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                    selfAssessments[idx] === true ? "bg-green-500 text-white shadow-lg" : "bg-white/10 hover:bg-white/20 border border-white/20 text-white"
                                )}
                             >
                                <ThumbsUp className="h-3 w-3 mr-2" /> Correct
                             </button>
                          </div>
                       </div>
                    </div>
                  )}

                  {res.explanation && (
                    <div className="pt-6 border-t border-gray-50 text-left">
                        <p className="text-xs text-gray-500 italic leading-relaxed">
                            <span className="font-black text-gray-400 not-italic uppercase text-[9px] tracking-widest mr-2">Deep Dive:</span> 
                            {res.explanation}
                        </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={() => router.push(`/dashboard/student/courses/${id}/learn`)}
          className="mt-12 w-full bg-gray-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl active:scale-95"
        >
          Return to Course
        </button>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const isOpenEnded = question.correctOption === -1;

  return (
    <div className="max-w-3xl mx-auto py-12 px-6 text-left animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10 flex items-center justify-between">
        <div>
           <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest mb-2 block w-fit">Module Assessment</span>
           <h2 className="text-2xl font-black text-gray-900 tracking-tight">Question {currentQuestion + 1} of {quiz.questions.length}</h2>
        </div>
        <div className="hidden sm:flex flex-col items-end">
           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Progress</div>
           <div className="h-2 w-48 bg-gray-100 rounded-full overflow-hidden border shadow-inner">
             <div 
               className="h-full bg-indigo-600 transition-all duration-700 ease-out" 
               style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }} 
             />
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl shadow-gray-100 border-2 border-gray-50 p-10 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5"><HelpCircle className="h-32 w-32" /></div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-10 leading-snug relative z-10">{question.questionText}</h1>
        
        {isOpenEnded ? (
           <div className="space-y-4 relative z-10">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type your response below (Min. 5 characters)</label>
              <textarea 
                className="w-full border-2 border-gray-100 rounded-3xl p-6 focus:border-indigo-500 outline-none transition-all min-h-[200px] text-lg font-medium text-gray-700 leading-relaxed shadow-inner"
                placeholder="Share your detailed analysis..."
                value={answers[currentQuestion] as string}
                onChange={e => handleTextAnswerChange(e.target.value)}
              />
           </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 relative z-10">
            {question.options.map((option: string, idx: number) => (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                className={clsx(
                  "w-full text-left p-6 rounded-2xl border-2 transition-all flex items-center justify-between group active:scale-[0.98]",
                  answers[currentQuestion] === idx 
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-100" 
                    : "border-gray-50 hover:border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                <span className="font-bold text-lg">{option}</span>
                <div className={clsx(
                  "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                  answers[currentQuestion] === idx ? "border-indigo-600 bg-indigo-600 scale-110" : "border-gray-200 group-hover:border-gray-300"
                )}>
                  {answers[currentQuestion] === idx && <div className="h-2 w-2 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <button
          onClick={() => setCurrentQuestion(prev => prev - 1)}
          disabled={currentQuestion === 0}
          className="flex w-full sm:w-auto items-center justify-center px-8 py-4 text-sm font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 disabled:opacity-0 transition-all"
        >
          <ChevronLeft className="h-4 w-4 mr-2" /> Previous
        </button>

        <div className="flex w-full sm:w-auto items-center space-x-3">
            {currentQuestion === quiz.questions.length - 1 ? (
            <button
                onClick={handleSubmit}
                disabled={submitting || (isOpenEnded ? (answers[currentQuestion] as string).length < 5 : answers[currentQuestion] === -1)}
                className="flex-1 sm:flex-none bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
            >
                {submitting ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'Complete Quiz'}
            </button>
            ) : (
            <button
                onClick={() => setCurrentQuestion(prev => prev + 1)}
                disabled={isOpenEnded ? (answers[currentQuestion] as string).length < 5 : answers[currentQuestion] === -1}
                className="flex-1 sm:flex-none flex items-center justify-center bg-gray-900 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-black shadow-xl transition-all active:scale-95 disabled:opacity-50"
            >
                Next Step <ChevronRight className="h-4 w-4 ml-2" />
            </button>
            )}
        </div>
      </div>
    </div>
  );
}
