import { AIProviderManager } from '@/lib/ai/AIProviderManager';
import { PROVIDERS, PROVIDER_PRIORITY, ProviderConfig, TaskType } from '@/lib/ai/providers.config';
import { AIRequest, AIResponse } from '@/lib/ai/types';

import * as gemini from '@/lib/ai/adapters/gemini.adapter';
import * as groq from '@/lib/ai/adapters/groq.adapter';
import * as openrouter from '@/lib/ai/adapters/openrouter.adapter';
import * as mistral from '@/lib/ai/adapters/mistral.adapter';

function isRateLimitError(err: any) {
  const status = err?.status || err?.response?.status;
  return status === 429;
}

function trimRequestForProvider(req: AIRequest, provider: ProviderConfig): AIRequest {
  const trim = (s: string) => (s.length > provider.maxContextChars ? s.slice(0, provider.maxContextChars) : s);
  return {
    ...req,
    systemPrompt: trim(req.systemPrompt || ''),
    userMessage: trim(req.userMessage || ''),
    history: req.history?.map((h) => ({ ...h, content: trim(h.content || '') }))
  };
}

async function callAdapter(provider: ProviderConfig, req: AIRequest): Promise<AIResponse> {
  switch (provider.name) {
    case 'gemini':
      return gemini.callProvider(provider, req);
    case 'groq':
      return groq.callProvider(provider, req);
    case 'openrouter':
      return openrouter.callProvider(provider, req);
    case 'mistral':
      return mistral.callProvider(provider, req);
    default:
      throw new Error(`Unknown provider ${provider.name}`);
  }
}

async function* streamAdapter(provider: ProviderConfig, req: AIRequest): AsyncGenerator<string> {
  switch (provider.name) {
    case 'gemini':
      yield* gemini.streamProvider(provider, req);
      return;
    case 'groq':
      yield* groq.streamProvider(provider, req);
      return;
    case 'openrouter':
      yield* openrouter.streamProvider(provider, req);
      return;
    case 'mistral':
      yield* mistral.streamProvider(provider, req);
      return;
    default:
      throw new Error(`Unknown provider ${provider.name}`);
  }
}

function getNextMidnightUTC() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return next.toISOString();
}

export async function callAI(request: AIRequest, taskType: TaskType = 'default'): Promise<AIResponse> {
  const manager = new AIProviderManager();
  const priority = PROVIDER_PRIORITY[taskType] || PROVIDER_PRIORITY.default;

  for (let attempt = 0; attempt < priority.length; attempt++) {
    const provider = await manager.getAvailableProvider(taskType);
    if (!provider) break;

    const trimmed = trimRequestForProvider(request, provider);
    try {
      const result = await callAdapter(provider, trimmed);
      await manager.recordUsage(provider.name);
      return result;
    } catch (err: any) {
      if (isRateLimitError(err)) {
        await manager.markRateLimited(provider.name, String(err?.message || err));
        continue;
      }
      await manager.markRateLimited(provider.name, String(err?.message || err));
      continue;
    }
  }

  const status = await new AIProviderManager().getStatus();
  return {
    success: false,
    providerUsed: 'none',
    modelUsed: 'none',
    response: '',
    error: 'all_providers_exhausted',
    providersStatus: status,
    retryAfter: getNextMidnightUTC()
  };
}

export async function* streamAI(request: AIRequest, taskType: TaskType = 'chat'): AsyncGenerator<string> {
  const manager = new AIProviderManager();
  const priority = PROVIDER_PRIORITY[taskType] || PROVIDER_PRIORITY.default;

  for (let attempt = 0; attempt < priority.length; attempt++) {
    const provider = await manager.getAvailableProvider(taskType);
    if (!provider) break;

    const trimmed = trimRequestForProvider(request, provider);
    try {
      for await (const chunk of streamAdapter(provider, trimmed)) {
        yield chunk;
      }
      await manager.recordUsage(provider.name);
      return;
    } catch (err: any) {
      if (isRateLimitError(err)) {
        await manager.markRateLimited(provider.name, String(err?.message || err));
        continue;
      }
      await manager.markRateLimited(provider.name, String(err?.message || err));
      continue;
    }
  }

  return;
}

