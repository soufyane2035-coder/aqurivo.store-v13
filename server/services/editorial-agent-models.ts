import type { EditorialProvider } from './editorial-agent.service';

const MODEL_ID_REGEX = /^[a-zA-Z0-9._:/-]{1,120}$/;
const EXCLUDED_OPENAI_MODEL_TERMS = [
  'embedding',
  'whisper',
  'transcribe',
  'tts',
  'dall-e',
  'moderation',
  'realtime',
];

export function normalizeEditorialModels(
  provider: EditorialProvider,
  response: Record<string, unknown>
): string[] {
  const entries = Array.isArray(response.models)
    ? response.models
    : Array.isArray(response.data)
      ? response.data
      : [];
  const models = entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const model = entry as Record<string, unknown>;
    const rawId = provider === 'google' && typeof model.name === 'string'
      ? model.name.replace(/^models\//, '')
      : typeof model.id === 'string'
        ? model.id
        : '';
    if (!MODEL_ID_REGEX.test(rawId)) return [];
    if (
      provider === 'google' &&
      (!Array.isArray(model.supportedGenerationMethods) ||
        !model.supportedGenerationMethods.includes('generateContent'))
    ) {
      return [];
    }
    if (
      provider === 'openai' &&
      EXCLUDED_OPENAI_MODEL_TERMS.some((term) => rawId.toLowerCase().includes(term))
    ) {
      return [];
    }
    return [rawId];
  });
  return [...new Set(models)].sort((left, right) => left.localeCompare(right)).slice(0, 500);
}
