export interface AIRequest {
  systemPrompt: string;
  userMessage: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  expectJSON?: boolean;
  maxTokens?: number;
}

export interface AIResponse {
  success: boolean;
  providerUsed: string;
  modelUsed: string;
  response: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
  providersStatus?: Record<string, unknown>;
  retryAfter?: string;
}

