import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IQuizSubmission extends Document {
  quizId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  answers: (number | string)[]; // number for MCQ, string for open-ended
  selfAssessedCorrect?: boolean[]; // For open-ended self-assessment
  retakeAllowed: boolean;
  attemptCount: number;
  score: number;
  totalQuestions: number;
  submittedAt: Date;
}

const QuizSubmissionSchema = new Schema<IQuizSubmission>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answers: { type: [Schema.Types.Mixed], required: true },
    selfAssessedCorrect: { type: [Boolean], default: [] },
    retakeAllowed: { type: Boolean, default: false },
    attemptCount: { type: Number, default: 1 },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const QuizSubmission = models.QuizSubmission || model<IQuizSubmission>('QuizSubmission', QuizSubmissionSchema);
export default QuizSubmission;
