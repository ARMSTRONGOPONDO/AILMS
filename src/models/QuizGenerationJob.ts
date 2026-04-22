import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IQuizGenerationJob extends Document {
  lessonId: mongoose.Types.ObjectId;
  tutorId: mongoose.Types.ObjectId;
  numberOfQuestions: number;
  questionType: 'multiple-choice' | 'true-false' | 'open-ended' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  focusTopic?: string;
  status: 'queued' | 'processing' | 'retrying' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  nextRunAt: Date;
  questions: any[];
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuizGenerationJobSchema = new Schema<IQuizGenerationJob>(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    tutorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    numberOfQuestions: { type: Number, default: 5 },
    questionType: { type: String, enum: ['multiple-choice', 'true-false', 'open-ended', 'mixed'], default: 'multiple-choice' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    focusTopic: { type: String, default: '' },
    status: { type: String, enum: ['queued', 'processing', 'retrying', 'completed', 'failed'], default: 'queued' },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 6 },
    nextRunAt: { type: Date, default: Date.now },
    questions: { type: [Schema.Types.Mixed], default: [] },
    lastError: { type: String }
  },
  { timestamps: true }
);

QuizGenerationJobSchema.index({ status: 1, nextRunAt: 1, createdAt: 1 });
QuizGenerationJobSchema.index({ tutorId: 1, createdAt: -1 });

const QuizGenerationJob = models.QuizGenerationJob || model<IQuizGenerationJob>('QuizGenerationJob', QuizGenerationJobSchema);
export default QuizGenerationJob;
