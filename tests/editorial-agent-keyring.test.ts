import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  nextKeyIndex,
  normalizeStoredKeys,
  updateStoredKeys,
} from '../server/services/editorial-agent-keyring';

test('legacy single keys are migrated to a compatible key reference', () => {
  assert.deepEqual(normalizeStoredKeys(' legacy-api-key '), [
    { id: 'legacy', value: 'legacy-api-key' },
  ]);
  assert.deepEqual(normalizeStoredKeys('  '), []);
});

test('key storage appends multiple keys and removes only selected service keys', () => {
  const existing = [
    { id: 'first', value: 'first-secret' },
    { id: 'second', value: 'second-secret' },
  ];
  const updated = updateStoredKeys(
    existing,
    ['third-secret'],
    'google',
    new Set(['google:first'])
  );

  assert.equal(updated[0].id, 'second');
  assert.equal(updated.length, 2);
  assert.notEqual(updated[1].id, 'first');
  assert.notEqual(updated[1].id, 'second');
  assert.equal(updated[1].value, 'third-secret');
});

test('key storage rejects more than ten keys and overlong secrets', () => {
  const existing = Array.from({ length: 10 }, (_, index) => ({
    id: `key-${index}`,
    value: `secret-${index}`,
  }));
  assert.throws(() => updateStoredKeys(existing, ['extra'], 'openai', new Set()));
  assert.throws(() => updateStoredKeys([], ['x'.repeat(4_001)], 'openai', new Set()));
});

test('key selection rotates predictably and tracks each provider independently', () => {
  assert.equal(nextKeyIndex('test-google', 3), 0);
  assert.equal(nextKeyIndex('test-google', 3), 1);
  assert.equal(nextKeyIndex('test-openai', 2), 0);
  assert.equal(nextKeyIndex('test-google', 3), 2);
  assert.equal(nextKeyIndex('test-google', 3), 0);
});
