import assert from 'node:assert/strict';
import test from 'node:test';
import { getProductHeroTransitionName } from '../lib/productHeroTransition';

test('creates stable, product-specific view transition names', () => {
  const firstName = getProductHeroTransitionName('compact-camera-01');

  assert.ok(firstName);
  assert.equal(firstName, getProductHeroTransitionName('compact-camera-01'));
  assert.notEqual(firstName, getProductHeroTransitionName('compact-camera-02'));
});

test('does not normalize distinct keys into the same transition name', () => {
  assert.notEqual(
    getProductHeroTransitionName('camera/a'),
    getProductHeroTransitionName('camera-a')
  );
});

test('returns no transition name for a missing product key', () => {
  assert.equal(getProductHeroTransitionName(undefined), null);
  assert.equal(getProductHeroTransitionName('  '), null);
});
