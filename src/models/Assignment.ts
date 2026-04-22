import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IAssignment extends Document {
  courseId: mongoose.Types.ObjectId;
  tutorId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  rubric: string;
  dueDate?: Date;
  
  // AI grading configuration
  gradingKPIs: {
    label: string;
    description: string;
    weight: number;
  }[];
  passingScore: number;
  maxScore: number;
  aiGradingEnabled: boolean;
  gradingInstructions?: string;
  allowResubmission: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    tutorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    rubric: { type: String, required: true },
    dueDate: { type: Date },

    gradingKPIs: [{
      label:       String,
      description: String,
      weight:      Number
    }],
    passingScore:     { type: Number, default: 50 },
    maxScore:         { type: Number, default: 100 },
    aiGradingEnabled: { type: Boolean, default: true },
    gradingInstructions: { type: String },
    allowResubmission: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Assignment = models.Assignment || model<IAssignment>('Assignment', AssignmentSchema);
export default Assignment;
