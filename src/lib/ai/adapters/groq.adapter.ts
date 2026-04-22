import { ProviderConfig } from '@/lib/ai/providers.config';
import { AIRequest, AIResponse } from '@/lib/ai/types';
import { buildOpenAIChatMessages, trimToMaxChars } from '@/lib/ai/adapters/openaiCompatible';

export async function callProvider(provider: ProviderConfig, req: AIRequest): Promise<AIResponse> {
  const apiKey = process.env[provider.apiKeyEnvVar];
  if (!apiKey) throw new Error(`Missing ${provider.apiKeyEnvVar}`);

  const messages = buildOpenAIChatMessages(req).map((m) => ({
    ...m,
    content: trimToMaxChars(String(m.content || ''), provider.maxContextChars)
  }));

  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      max_tokens: req.maxTokens ?? 1000,
      temperature: 0.4
    })
  });

  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(text || res.statusText);
    err.status = res.status;
    throw err;
  }

  const json: any = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? '';

  return { success: true, providerUsed: provider.name, modelUsed: provider.model, response: content };
}

export async function* streamProvider(provider: ProviderConfig, req: AIRequest): AsyncGenerator<string> {
  // Keep simple: no streaming parsing yet; fall back to non-streaming.
  const r = await callProvider(provider, req);
  yield r.response;
}

