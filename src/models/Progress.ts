import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IProgress extends Document {
  studentId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  completed: boolean;
  completedAt?: Date;
}

const ProgressSchema = new Schema<IProgress>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

const Progress = models.Progress || model<IProgress>('Progress', ProgressSchema);
export default Progress;
