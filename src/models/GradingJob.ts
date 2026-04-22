import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IGradingJob extends Document {
  submissionId: mongoose.Types.ObjectId;
  assignmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  submissionText: string;
  extractedFileText: string;
  status: 'queued' | 'processing' | 'retrying' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  nextRunAt: Date;
  lastError?: string;
  usedFallback?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GradingJobSchema = new Schema<IGradingJob>(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'AssignmentSubmission', required: true, unique: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submissionText: { type: String, default: '' },
    extractedFileText: { type: String, default: '' },
    status: {
      type: String,
      enum: ['queued', 'processing', 'retrying', 'completed', 'failed'],
      default: 'queued'
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 6 },
    nextRunAt: { type: Date, default: Date.now },
    lastError: { type: String },
    usedFallback: { type: Boolean, default: false }
  },
  { timestamps: true }
);

GradingJobSchema.index({ status: 1, nextRunAt: 1, createdAt: 1 });

const GradingJob = models.GradingJob || model<IGradingJob>('GradingJob', GradingJobSchema);
export default GradingJob;
