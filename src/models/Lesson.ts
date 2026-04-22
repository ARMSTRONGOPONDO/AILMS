import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface ILesson extends Document {
  moduleId: mongoose.Types.ObjectId;
  title: string;
  contentType: 'text' | 'pdf' | 'docx' | 'video';
  contentBody?: string;
  contentUrl?: string;
  contentText?: string;
  order: number;
  // New Structured Fields
  overview?: string;
  objectives: string[];
  keyTerms: { term: string; definition: string }[];
  estimatedDuration?: number;
  prerequisites?: string;
  additionalNotes?: string;
  contentSections: { sectionTitle: string; sectionBody: string }[];
  videoTimestamps?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema = new Schema<ILesson>(
  {
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
    title: { type: String, required: true },
    contentType: {
      type: String,
      enum: ['text', 'pdf', 'docx', 'video'],
      required: true,
    },
    contentBody: { type: String },
    contentUrl: { type: String },
    contentText: { type: String },
    order: { type: Number, required: true },
    // New Structured Fields
    overview: { type: String },
    objectives: [{ type: String }],
    keyTerms: [
      {
        term: { type: String },
        definition: { type: String },
      },
    ],
    estimatedDuration: { type: Number },
    prerequisites: { type: String },
    additionalNotes: { type: String },
    contentSections: [
      {
        sectionTitle: { type: String },
        sectionBody: { type: String },
      },
    ],
    videoTimestamps: { type: String },
  },
  { timestamps: true }
);

const Lesson = models.Lesson || model<ILesson>('Lesson', LessonSchema);
export default Lesson;
