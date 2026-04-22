import dbConnect from '@/lib/db';
import ProviderUsage from '@/models/ProviderUsage';
import { PROVIDERS, PROVIDER_PRIORITY, ProviderConfig, TaskType } from '@/lib/ai/providers.config';
import { maybeResetDailyLimits } from '@/lib/ai/resetScheduler';

const PROVIDER_NAMES = ['gemini', 'openrouter', 'groq', 'mistral'] as const;

function hasKey(provider: ProviderConfig) {
  const key = process.env[provider.apiKeyEnvVar];
  return !!key && key.trim().length > 0;
}

export class AIProviderManager {
  async seedIfNeeded() {
    await dbConnect();
    await Promise.all(
      PROVIDER_NAMES.map(async (provider) => {
        await ProviderUsage.findOneAndUpdate(
          { provider },
          { $setOnInsert: { provider } },
          { upsert: true }
        );
      })
    );
  }

  async resetMinuteLimits() {
    await dbConnect();
    const cutoff = new Date(Date.now() - 60_000);
    await ProviderUsage.updateMany(
      { lastMinuteReset: { $lt: cutoff } },
      {
        requestsThisMinute: 0,
        status: 'active',
        lastMinuteReset: new Date()
      }
    );
  }

  async getAvailableProvider(taskType: TaskType): Promise<ProviderConfig | null> {
    await dbConnect();
    await this.seedIfNeeded();
    await maybeResetDailyLimits();
    await this.resetMinuteLimits();

    const priority = PROVIDER_PRIORITY[taskType] || PROVIDER_PRIORITY.default;
    const usageDocs = await ProviderUsage.find({});
    const usageMap = new Map(usageDocs.map((d) => [d.provider, d]));

    for (const providerName of priority) {
      const provider = PROVIDERS.find((p) => p.name === providerName);
      if (!provider) continue;
      if (!hasKey(provider)) continue;

      const usage = usageMap.get(providerName as any);
      if (!usage) continue;

      if (usage.status === 'daily_exhausted') continue;
      if (usage.requestsToday >= provider.dailyLimit) continue;

      if (usage.status === 'minute_limited') {
        const ageMs = Date.now() - new Date(usage.lastMinuteReset).getTime();
        if (ageMs < 60_000) continue;
      }

      return provider;
    }

    return null;
  }

  async recordUsage(providerName: string): Promise<void> {
    await dbConnect();
    const now = new Date();
    const doc = await ProviderUsage.findOne({ provider: providerName });
    if (!doc) return;

    const minuteAge = Date.now() - new Date(doc.lastMinuteReset).getTime();
    const updates: any = {};
    if (minuteAge > 60_000) {
      updates.requestsThisMinute = 0;
      updates.lastMinuteReset = now;
      if (doc.status === 'minute_limited') updates.status = 'active';
    }

    updates.$inc = { requestsToday: 1, requestsThisMinute: 1 };
    updates.consecutiveErrors = 0;
    updates.lastError = null;

    await ProviderUsage.updateOne({ provider: providerName }, updates);
  }

  async markRateLimited(providerName: string, error: string): Promise<void> {
    await dbConnect();
    const provider = PROVIDERS.find((p) => p.name === providerName);
    if (!provider) return;

    const doc = await ProviderUsage.findOne({ provider: providerName });
    if (!doc) return;

    // On 429 we treat provider as minute-limited immediately; if daily limit is reached,
    // it becomes daily exhausted.
    let status: 'active' | 'minute_limited' | 'daily_exhausted' = 'minute_limited';
    if (doc.requestsToday >= provider.dailyLimit) status = 'daily_exhausted';

    await ProviderUsage.updateOne(
      { provider: providerName },
      {
        status,
        $inc: { consecutiveErrors: 1 },
        lastError: error,
        lastMinuteReset: new Date()
      }
    );
  }

  async getStatus(): Promise<Record<string, object>> {
    await dbConnect();
    await this.seedIfNeeded();
    const docs = await ProviderUsage.find({});
    return Object.fromEntries(
      docs.map((d) => [
        d.provider,
        {
          provider: d.provider,
          status: d.status,
          requestsToday: d.requestsToday,
          requestsThisMinute: d.requestsThisMinute,
          lastMinuteReset: d.lastMinuteReset,
          lastDailyReset: d.lastDailyReset,
          consecutiveErrors: d.consecutiveErrors,
          lastError: d.lastError || null
        }
      ])
    );
  }
}

