import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeEditorialModels } from '../server/services/editorial-agent-models';

test('Google model discovery returns unique models that support content generation', () => {
  assert.deepEqual(
    normalizeEditorialModels('google', {
      models: [
        { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/text-embedding-005', supportedGenerationMethods: ['embedContent'] },
        { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/invalid model', supportedGenerationMethods: ['generateContent'] },
      ],
    }),
    ['gemini-2.5-flash']
  );
});

test('OpenAI model discovery excludes non-chat service models and sorts unique IDs', () => {
  assert.deepEqual(
    normalizeEditorialModels('openai', {
      data: [
        { id: 'gpt-4.1-mini' },
        { id: 'gpt-4.1-mini' },
        { id: 'text-embedding-3-small' },
        { id: 'whisper-1' },
        { id: 'claude sonnet' },
      ],
    }),
    ['gpt-4.1-mini']
  );
});

test('OpenRouter model discovery reads the data catalog and ignores malformed entries', () => {
  assert.deepEqual(
    normalizeEditorialModels('openrouter', {
      data: [{ id: 'anthropic/claude-sonnet-4' }, null, { name: 'missing-id' }],
    }),
    ['anthropic/claude-sonnet-4']
  );
});
