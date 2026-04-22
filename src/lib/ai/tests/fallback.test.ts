import { callAI } from '@/lib/ai/callWithFallback';
import { forceResetAllProviders } from '@/lib/ai/resetScheduler';
import ProviderUsage from '@/models/ProviderUsage';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: async () => null
}));

jest.mock('@/models/ProviderUsage', () => {
  const store: any[] = [
    { provider: 'gemini', requestsToday: 0, requestsThisMinute: 0, status: 'active', lastMinuteReset: new Date(), lastDailyReset: new Date(), consecutiveErrors: 0 },
    { provider: 'groq', requestsToday: 0, requestsThisMinute: 0, status: 'active', lastMinuteReset: new Date(), lastDailyReset: new Date(), consecutiveErrors: 0 },
    { provider: 'mistral', requestsToday: 0, requestsThisMinute: 0, status: 'active', lastMinuteReset: new Date(), lastDailyReset: new Date(), consecutiveErrors: 0 },
    { provider: 'openrouter', requestsToday: 0, requestsThisMinute: 0, status: 'active', lastMinuteReset: new Date(), lastDailyReset: new Date(), consecutiveErrors: 0 }
  ];

  const applyUpdate = (doc: any, update: any) => {
    if (update?.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        doc[k] = (doc[k] ?? 0) + (v as number);
      }
    }
    for (const [k, v] of Object.entries(update)) {
      if (k === '$inc' || k === '$setOnInsert') continue;
      doc[k] = v;
    }
  };

  return {
    __esModule: true,
    default: {
      find: async () => store,
      updateMany: async (_q: any, u: any) => {
        for (const d of store) {
          // Support the only predicate we use in production code for minute reset
          if (_q?.lastMinuteReset?.$lt) {
            const cutoff = new Date(_q.lastMinuteReset.$lt).getTime();
            if (new Date(d.lastMinuteReset).getTime() >= cutoff) continue;
          }
          // Support processing recovery queries (not needed here)
          applyUpdate(d, u);
        }
        return null;
      },
      updateOne: async (q: any, u: any) => {
        const item = store.find((s) => s.provider === q.provider);
        if (item) applyUpdate(item, u);
        return null;
      },
      findOne: async (q: any) => store.find((s) => s.provider === q.provider),
      findOneAndUpdate: async (q: any, u: any) => {
        let item = store.find((s) => s.provider === q.provider);
        if (!item) {
          item = { provider: q.provider, ...u.$setOnInsert };
          store.push(item);
        }
        return item;
      }
    }
  };
});

jest.mock('@/lib/ai/adapters/gemini.adapter', () => ({
  callProvider: jest.fn(async (provider: any) => ({ success: true, providerUsed: provider.name, modelUsed: provider.model, response: '{"ok":true}' })),
  streamProvider: jest.fn(async function* () {
    yield 'hello';
  })
}));

jest.mock('@/lib/ai/adapters/groq.adapter', () => ({
  callProvider: jest.fn(async (provider: any) => ({ success: true, providerUsed: provider.name, modelUsed: provider.model, response: '{"ok":true}' })),
  streamProvider: jest.fn(async function* () {
    yield 'hello';
  })
}));

jest.mock('@/lib/ai/adapters/mistral.adapter', () => ({
  callProvider: jest.fn(async (provider: any) => ({ success: true, providerUsed: provider.name, modelUsed: provider.model, response: '{"ok":true}' })),
  streamProvider: jest.fn(async function* () {
    yield 'hello';
  })
}));

jest.mock('@/lib/ai/adapters/openrouter.adapter', () => ({
  callProvider: jest.fn(async (provider: any) => ({ success: true, providerUsed: provider.name, modelUsed: provider.model, response: '{"ok":true}' })),
  streamProvider: jest.fn(async function* () {
    yield 'hello';
  })
}));

describe('AI Fallback System', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'x';
    process.env.GROQ_API_KEY = 'x';
    process.env.MISTRAL_API_KEY = 'x';
    process.env.OPENROUTER_API_KEY = 'x';
  });

  test('uses Gemini first for quiz generation', async () => {
    const r = await callAI({ systemPrompt: '', userMessage: 'make quiz', expectJSON: true }, 'quiz_generation');
    expect(r.success).toBe(true);
    expect(r.providerUsed).toBe('gemini');
  });

  test('falls back to Groq when Gemini returns 429', async () => {
    const gemini = await import('@/lib/ai/adapters/gemini.adapter');
    (gemini.callProvider as any).mockImplementationOnce(async () => {
      const e: any = new Error('rate limited');
      e.status = 429;
      throw e;
    });

    const r = await callAI({ systemPrompt: '', userMessage: 'make quiz', expectJSON: true }, 'quiz_generation');
    expect(r.success).toBe(true);
    expect(r.providerUsed).toBe('groq');
  });

  test('rotates through all providers before failing', async () => {
    const gemini = await import('@/lib/ai/adapters/gemini.adapter');
    const groq = await import('@/lib/ai/adapters/groq.adapter');
    const mistral = await import('@/lib/ai/adapters/mistral.adapter');
    const openrouter = await import('@/lib/ai/adapters/openrouter.adapter');

    for (const mod of [gemini, groq, mistral, openrouter]) {
      (mod.callProvider as any).mockImplementationOnce(async () => {
        const e: any = new Error('rate limited');
        e.status = 429;
        throw e;
      });
    }

    const r = await callAI({ systemPrompt: '', userMessage: 'x' }, 'default');
    expect(r.success).toBe(false);
    expect(r.error).toBe('all_providers_exhausted');
  });

  test('daily reset reactivates exhausted providers', async () => {
    await forceResetAllProviders();
    const docs: any[] = await (ProviderUsage as any).find();
    for (const d of docs) {
      expect(d.status).toBe('active');
      expect(d.requestsToday).toBe(0);
    }
  });

  test('missing API key skips that provider', async () => {
    process.env.GROQ_API_KEY = '';
    const r = await callAI({ systemPrompt: '', userMessage: 'hello' }, 'chat');
    expect(r.success).toBe(true);
    expect(r.providerUsed).not.toBe('groq');
  });
});

