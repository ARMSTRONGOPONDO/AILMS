import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { apiHandler } from '@/lib/apiHandler';
import dbConnect from '@/lib/db';
import ProviderUsage from '@/models/ProviderUsage';
import { PROVIDERS, PROVIDER_PRIORITY } from '@/lib/ai/providers.config';

export const GET = apiHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await dbConnect();
  const usage = await ProviderUsage.find({});
  const usageMap = new Map(usage.map((u: any) => [u.provider, u]));

  const providers = PROVIDERS.map((p) => {
    const u: any = usageMap.get(p.name) || {};
    const requestsToday = u.requestsToday ?? 0;
    const requestsThisMinute = u.requestsThisMinute ?? 0;
    const status = u.status ?? 'active';
    const percentUsed = p.dailyLimit > 0 ? Math.round((requestsToday / p.dailyLimit) * 100) : 0;
    return {
      name: p.name,
      status,
      requestsToday,
      dailyLimit: p.dailyLimit,
      percentUsed,
      requestsThisMinute,
      minuteLimit: p.minuteLimit,
      lastError: u.lastError ?? null
    };
  });

  const totalRequestsToday = providers.reduce((sum, p) => sum + p.requestsToday, 0);
  const recommendedProvider = PROVIDER_PRIORITY.chat[0];

  return { providers, totalRequestsToday, recommendedProvider };
});

