import { ProviderConfig } from '@/lib/ai/providers.config';
import { AIRequest, AIResponse } from '@/lib/ai/types';
import { buildOpenAIChatMessages, trimToMaxChars } from '@/lib/ai/adapters/openaiCompatible';

async function doCall(provider: ProviderConfig, req: AIRequest) {
  const apiKey = process.env[provider.apiKeyEnvVar];
  if (!apiKey) throw new Error(`Missing ${provider.apiKeyEnvVar}`);

  const siteUrl = process.env.SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const messages = buildOpenAIChatMessages(req).map((m) => ({
    ...m,
    content: trimToMaxChars(String(m.content || ''), provider.maxContextChars)
  }));

  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': siteUrl,
      'X-Title': 'AI-LMS'
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
  return json?.choices?.[0]?.message?.content ?? '';
}

function looksLikeJSON(s: string) {
  const t = s.trim();
  return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'));
}

export async function callProvider(provider: ProviderConfig, req: AIRequest): Promise<AIResponse> {
  const content = await doCall(provider, req);
  if (req.expectJSON && !looksLikeJSON(content)) {
    // One retry with stronger instruction (OpenRouter can be less reliable for JSON)
    const retry = await doCall(provider, {
      ...req,
      systemPrompt: `${req.systemPrompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown.`
    });
    return { success: true, providerUsed: provider.name, modelUsed: provider.model, response: retry };
  }
  return { success: true, providerUsed: provider.name, modelUsed: provider.model, response: content };
}

export async function* streamProvider(provider: ProviderConfig, req: AIRequest): AsyncGenerator<string> {
  const r = await callProvider(provider, req);
  yield r.response;
}

