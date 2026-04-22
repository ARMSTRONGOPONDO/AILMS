import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IAssignmentSubmission extends Document {
  assignmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  
  submissionType: 'text' | 'file' | 'both';
  submissionText?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: 'pdf' | 'docx' | null;

  status: 'submitted' | 'ai_reviewed' | 'ai_failed' | 'graded';

  aiGrade?: number;
  aiRemarks?: string;
  aiStrengths: string[];
  aiWeaknesses: string[];
  aiKpiBreakdown: {
    kpiLabel: string;
    score: number;
    comment: string;
  }[];
  aiGradedAt?: Date;

  tutorGrade?: number;
  tutorFeedback?: string;
  gradedBy?: mongoose.Types.ObjectId;
  gradedAt?: Date;

  finalGrade?: number;
  isPassing?: boolean;

  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId:     { type: Schema.Types.ObjectId, ref: 'Course', required: true },

    submissionType: { type: String, enum: ['text', 'file', 'both'], default: 'text' },
    submissionText: { type: String },
    fileUrl:        { type: String },
    fileName:       { type: String },
    fileType:       { type: String, enum: ['pdf', 'docx', null] },

    status: {
      type: String,
      enum: ['submitted', 'ai_reviewed', 'ai_failed', 'graded'],
      default: 'submitted'
    },

    aiGrade:         { type: Number, min: 0, max: 100 },
    aiRemarks:       { type: String },
    aiStrengths:     [String],
    aiWeaknesses:    [String],
    aiKpiBreakdown:  [{
      kpiLabel:      String,
      score:         Number,
      comment:       String
    }],
    aiGradedAt:      { type: Date },

    tutorGrade:      { type: Number, min: 0, max: 100 },
    tutorFeedback:   { type: String },
    gradedBy:        { type: Schema.Types.ObjectId, ref: 'User' },
    gradedAt:        { type: Date },

    finalGrade:      { type: Number, min: 0, max: 100 },
    isPassing:       { type: Boolean },

    submittedAt:     { type: Date, default: Date.now }
  },
  { timestamps: true }
);

AssignmentSubmissionSchema.index(
  { assignmentId: true, studentId: true }, 
  { unique: true }
);

const AssignmentSubmission = models.AssignmentSubmission || model<IAssignmentSubmission>('AssignmentSubmission', AssignmentSubmissionSchema);
export default AssignmentSubmission;
