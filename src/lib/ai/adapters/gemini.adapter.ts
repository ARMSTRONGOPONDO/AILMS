import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProviderConfig } from '@/lib/ai/providers.config';
import { AIRequest, AIResponse } from '@/lib/ai/types';

function buildPrompt(req: AIRequest) {
  const jsonHint = req.expectJSON ? '\n\nRespond only with valid JSON.' : '';
  return `${req.systemPrompt}${jsonHint}\n\nUser: ${req.userMessage}`;
}

export async function callProvider(provider: ProviderConfig, req: AIRequest): Promise<AIResponse> {
  const apiKey = process.env[provider.apiKeyEnvVar];
  if (!apiKey) throw new Error(`Missing ${provider.apiKeyEnvVar}`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: provider.model });

  // For chat history, Gemini expects roles user/model; keep minimal since our main chat routes already manage history.
  const prompt = buildPrompt(req);
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  return {
    success: true,
    providerUsed: provider.name,
    modelUsed: provider.model,
    response: text
  };
}

export async function* streamProvider(provider: ProviderConfig, req: AIRequest): AsyncGenerator<string> {
  const apiKey = process.env[provider.apiKeyEnvVar];
  if (!apiKey) throw new Error(`Missing ${provider.apiKeyEnvVar}`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: provider.model });
  const prompt = buildPrompt(req);

  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    if (chunkText) yield chunkText;
  }
}

