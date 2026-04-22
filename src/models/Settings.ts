import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface ISettings extends Document {
  platformName: string;
  maxFileSizeMB: number;
  allowStudentReg: boolean;
  allowTutorReg: boolean;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    platformName: { type: String, default: 'AI-LMS' },
    maxFileSizeMB: { type: Number, default: 10 },
    allowStudentReg: { type: Boolean, default: true },
    allowTutorReg: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Settings = models.Settings || model<ISettings>('Settings', SettingsSchema);
export default Settings;
