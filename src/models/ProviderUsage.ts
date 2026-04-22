import { Schema, model, models, Document } from 'mongoose';

export interface IProviderUsage extends Document {
  provider: 'gemini' | 'openrouter' | 'groq' | 'mistral';
  requestsToday: number;
  requestsThisMinute: number;
  status: 'active' | 'minute_limited' | 'daily_exhausted';
  lastMinuteReset: Date;
  lastDailyReset: Date;
  consecutiveErrors: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderUsageSchema = new Schema<IProviderUsage>(
  {
    provider: { type: String, required: true, unique: true },

    requestsToday: { type: Number, default: 0 },
    requestsThisMinute: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['active', 'minute_limited', 'daily_exhausted'],
      default: 'active'
    },

    lastMinuteReset: { type: Date, default: Date.now },
    lastDailyReset: { type: Date, default: Date.now },

    consecutiveErrors: { type: Number, default: 0 },
    lastError: { type: String }
  },
  { timestamps: true }
);

const ProviderUsage = models.ProviderUsage || model<IProviderUsage>('ProviderUsage', ProviderUsageSchema);
export default ProviderUsage;

