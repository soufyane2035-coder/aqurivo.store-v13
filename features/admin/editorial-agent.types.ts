export type EditorialProvider = 'google' | 'openai' | 'anthropic' | 'openrouter';
export type EditorialTool = 'tavily' | 'firecrawl';
export type EditorialKeyTarget = EditorialProvider | EditorialTool;

export interface EditorialKeyStatus {
  encryptionConfigured: boolean;
  providers: Record<EditorialProvider, Array<{ id: string }>>;
  tools: Record<EditorialTool, Array<{ id: string }>>;
}

export const EDITORIAL_PROVIDERS: EditorialProvider[] = [
  'google',
  'openai',
  'anthropic',
  'openrouter',
];

export const EDITORIAL_PROVIDER_NAMES: Record<EditorialProvider, string> = {
  google: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  openrouter: 'OpenRouter',
};

export const EDITORIAL_INITIAL_MODELS: Record<EditorialProvider, string> = {
  google: 'gemini-2.5-flash',
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-sonnet-4-5',
  openrouter: 'openai/gpt-4.1-mini',
};
