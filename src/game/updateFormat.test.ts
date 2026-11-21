import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBytes, progressPercent } from './updateFormat';

test('formatBytes writes sizes in French units', () => {
  assert.equal(formatBytes(0), '0 o');
  assert.equal(formatBytes(512), '512 o');
  assert.equal(formatBytes(1024), '1 Ko');
  assert.equal(formatBytes(1500), '1 Ko');
  assert.equal(formatBytes(540 * 1024), '540 Ko');
  assert.equal(formatBytes(1024 * 1024), '1,0 Mo');
  assert.equal(formatBytes(5.94 * 1024 * 1024), '5,9 Mo');
});

test('progressPercent stays between 0 and 100 and survives an empty total', () => {
  assert.equal(progressPercent(null), 0);
  assert.equal(progressPercent({ doneBytes: 0, totalBytes: 0 }), 0);
  assert.equal(progressPercent({ doneBytes: 50, totalBytes: 200 }), 25);
  assert.equal(progressPercent({ doneBytes: 500, totalBytes: 200 }), 100);
});
