import test from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeCaptchaText } from '../claimer.js';

test('detects checkout security challenge text', () => {
  assert.equal(looksLikeCaptchaText('One more step. Please complete a security check to continue'), true);
  assert.equal(looksLikeCaptchaText('Enable JavaScript and cookies to continue'), true);
});

test('does not classify ordinary game puzzle copy as captcha', () => {
  assert.equal(looksLikeCaptchaText('Challenging Puzzles'), false);
});
