import { randomUUID } from 'node:crypto';

export interface StoredApiKey {
  id: string;
  value: string;
}

const MAX_KEYS_PER_SERVICE = 10;
const keyRotation = new Map<string, number>();

export function normalizeStoredKeys(value: unknown): StoredApiKey[] {
  if (typeof value === 'string') {
    return value.trim() ? [{ id: 'legacy', value: value.trim() }] : [];
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is StoredApiKey =>
      Boolean(
        entry &&
          typeof entry === 'object' &&
          typeof (entry as StoredApiKey).id === 'string' &&
          /^[A-Za-z0-9_-]{1,128}$/.test((entry as StoredApiKey).id) &&
          typeof (entry as StoredApiKey).value === 'string' &&
          (entry as StoredApiKey).value.trim()
      )
    )
    .slice(0, MAX_KEYS_PER_SERVICE)
    .map((entry) => ({ id: entry.id, value: entry.value.trim() }));
}

export function updateStoredKeys(
  existing: StoredApiKey[],
  additions: string[] | undefined,
  service: string,
  remove: Set<string>
): StoredApiKey[] {
  if (additions !== undefined && !Array.isArray(additions)) {
    throw new Error('Invalid API key input.');
  }
  const addedKeys: StoredApiKey[] = [];
  for (const value of additions || []) {
    if (typeof value !== 'string') throw new Error('Invalid API key input.');
    const trimmed = value.trim();
    if (trimmed.length > 4_000) throw new Error('API keys must be no longer than 4,000 characters.');
    if (!trimmed) continue;
    const id: string = randomUUID();
    addedKeys.push({ id, value: trimmed });
  }
  const keptKeys = existing.filter((key) => !remove.has(`${service}:${key.id}`));
  const next = [...keptKeys, ...addedKeys];
  if (next.length > MAX_KEYS_PER_SERVICE) {
    throw new Error(`You can save no more than ${MAX_KEYS_PER_SERVICE} keys for each provider or tool.`);
  }
  return next;
}

export function nextKeyIndex(service: string, keyCount: number): number {
  if (keyCount < 1) throw new Error('At least one API key is required.');
  const index = keyRotation.get(service) || 0;
  keyRotation.set(service, (index + 1) % keyCount);
  return index % keyCount;
}
