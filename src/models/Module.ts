import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IModule extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  order: number;
}

const ModuleSchema = new Schema<IModule>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

const Module = models.Module || model<IModule>('Module', ModuleSchema);
export default Module;
