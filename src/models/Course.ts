import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  description: string;
  tutorId: mongoose.Types.ObjectId;
  category: string;
  thumbnail?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    tutorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    thumbnail: { type: String },
    isPublished: { type: Boolean, default: false },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

CourseSchema.virtual('tutor', {
  ref: 'User',
  localField: 'tutorId',
  foreignField: '_id',
  justOne: true
});

const Course = models.Course || model<ICourse>('Course', CourseSchema);
export default Course;
