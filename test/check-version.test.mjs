import assert from 'node:assert/strict';
import test from 'node:test';
import { checkVersion } from '../scripts/check-version.mjs';

test('checkVersion accepts the matching version and refuses any other', () => {
  const pkg = JSON.stringify({ version: '1.2.3' });
  assert.equal(checkVersion('1.2.3', pkg), '1.2.3');
  assert.throws(() => checkVersion('1.2.4', pkg), /1\.2\.3.*1\.2\.4/);
  assert.throws(() => checkVersion('', pkg));
});
