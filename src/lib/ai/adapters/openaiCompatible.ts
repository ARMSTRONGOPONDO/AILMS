import { AIRequest } from '@/lib/ai/types';

export function trimToMaxChars(s: string, maxChars: number) {
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars);
}

export function buildOpenAIChatMessages(req: AIRequest) {
  const messages: any[] = [];
  const sys = req.expectJSON ? `${req.systemPrompt}\n\nRespond only with valid JSON.` : req.systemPrompt;
  if (sys?.trim()) messages.push({ role: 'system', content: sys });

  if (req.history?.length) {
    for (const h of req.history) {
      messages.push({ role: h.role, content: h.content });
    }
  }

  messages.push({ role: 'user', content: req.userMessage });
  return messages;
}

