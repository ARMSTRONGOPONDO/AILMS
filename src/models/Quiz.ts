import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IQuestion {
  questionText: string;
  options: string[];
  correctOption: number;
  explanation: string;
  modelAnswer?: string;
  gradingCriteria?: string;
}

export interface IQuiz extends Document {
  lessonId: mongoose.Types.ObjectId;
  title: string;
  questions: IQuestion[];
  aiGenerated: boolean;
  questionType: 'multiple-choice' | 'true-false' | 'open-ended' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  focusTopic?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuizSchema = new Schema<IQuiz>(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    title: { type: String, required: true },
    questions: [
      {
        questionText: { type: String, required: true },
        options: { type: [String], default: [] },
        correctOption: { type: Number, required: true }, // -1 for open-ended
        explanation: { type: String },
        modelAnswer: { type: String },
        gradingCriteria: { type: String }
      },
    ],
    aiGenerated: { type: Boolean, default: false },
    questionType: { 
      type: String, 
      enum: ['multiple-choice', 'true-false', 'open-ended', 'mixed'],
      default: 'multiple-choice'
    },
    difficulty: { 
      type: String, 
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    focusTopic: { type: String }
  },
  { timestamps: true }
);

const Quiz = models.Quiz || model<IQuiz>('Quiz', QuizSchema);
export default Quiz;
