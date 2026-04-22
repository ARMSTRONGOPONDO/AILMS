export interface ProviderConfig {
  name: string;
  model: string;
  baseUrl: string;
  dailyLimit: number;
  minuteLimit: number;
  maxContextChars: number;
  supportsStreaming: boolean;
  supportsJSON: boolean;
  apiKeyEnvVar: string;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    name: 'gemini',
    model: 'gemini-1.5-flash',
    baseUrl: 'https://generativelanguage.googleapis.com',
    dailyLimit: 1500,
    minuteLimit: 15,
    maxContextChars: 200000,
    supportsStreaming: true,
    supportsJSON: true,
    apiKeyEnvVar: 'GEMINI_API_KEY'
  },
  {
    name: 'groq',
    model: 'llama3-70b-8192',
    baseUrl: 'https://api.groq.com/openai/v1',
    dailyLimit: 14400,
    minuteLimit: 30,
    maxContextChars: 16000,
    supportsStreaming: true,
    supportsJSON: true,
    apiKeyEnvVar: 'GROQ_API_KEY'
  },
  {
    name: 'openrouter',
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    baseUrl: 'https://openrouter.ai/api/v1',
    dailyLimit: 200,
    minuteLimit: 20,
    maxContextChars: 100000,
    supportsStreaming: true,
    supportsJSON: false,
    apiKeyEnvVar: 'OPENROUTER_API_KEY'
  },
  {
    name: 'mistral',
    model: 'mistral-small-latest',
    baseUrl: 'https://api.mistral.ai/v1',
    dailyLimit: 2000,
    minuteLimit: 5,
    maxContextChars: 60000,
    supportsStreaming: true,
    supportsJSON: true,
    apiKeyEnvVar: 'MISTRAL_API_KEY'
  }
];

export const PROVIDER_PRIORITY = {
  quiz_generation: ['gemini', 'groq', 'mistral', 'openrouter'],
  chat: ['groq', 'gemini', 'mistral', 'openrouter'],
  assignment_grading: ['gemini', 'mistral', 'openrouter', 'groq'],
  default: ['gemini', 'groq', 'mistral', 'openrouter']
} as const;

export type TaskType = keyof typeof PROVIDER_PRIORITY;

