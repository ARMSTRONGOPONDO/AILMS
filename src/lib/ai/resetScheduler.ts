import ProviderUsage from '@/models/ProviderUsage';

function utcDayKey(d: Date) {
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

export async function forceResetAllProviders() {
  await ProviderUsage.updateMany(
    {},
    {
      requestsToday: 0,
      requestsThisMinute: 0,
      status: 'active',
      consecutiveErrors: 0,
      lastError: null,
      lastMinuteReset: new Date(),
      lastDailyReset: new Date()
    }
  );
}

export async function maybeResetDailyLimits() {
  const docs = await ProviderUsage.find({});
  const nowKey = utcDayKey(new Date());
  const needsReset = docs.some((d) => utcDayKey(new Date(d.lastDailyReset)) !== nowKey);
  if (!needsReset) return;
  await forceResetAllProviders();
}

