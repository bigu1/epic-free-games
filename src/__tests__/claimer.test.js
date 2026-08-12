import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clickFreePurchaseCta,
  generateOtp,
  isCheckoutSubmitText,
  isFreePurchaseCta,
  looksLikeCaptchaText,
  waitForPurchaseCtaText,
} from '../claimer.js';
import { hasClaimFailures } from '../notifier.js';

test('detects checkout security challenge text', () => {
  assert.equal(looksLikeCaptchaText('One more step. Please complete a security check to continue'), true);
  assert.equal(looksLikeCaptchaText('Enable JavaScript and cookies to continue'), true);
});

test('does not classify ordinary game puzzle copy as captcha', () => {
  assert.equal(
    looksLikeCaptchaText(
      'Challenge maps offer strategic puzzles to hone your tactical thinking.'
    ),
    false
  );
  assert.equal(looksLikeCaptchaText('Verification successful'), false);
});

test('accepts both Epic checkout confirmation labels', () => {
  assert.equal(isCheckoutSubmitText('Place Order'), true);
  assert.equal(isCheckoutSubmitText(' Add to library '), true);
  assert.equal(isCheckoutSubmitText('In Library'), false);
  assert.equal(isCheckoutSubmitText('Please Add to library now'), false);
});

test('only allows a free product CTA before checkout', () => {
  assert.equal(isFreePurchaseCta(' Get '), true);
  assert.equal(isFreePurchaseCta('Buy Now'), false);
});

test('waits for a temporarily empty purchase CTA', async () => {
  const values = ['', 'Loading...', 'Get'];
  const locator = { innerText: async () => values.shift() ?? 'Get' };
  assert.equal(await waitForPurchaseCtaText(locator, 500), 'get');
});

test('does not click when a free CTA changes to Buy Now', async () => {
  const values = ['Get', 'Buy Now'];
  let clicks = 0;
  const locator = {
    innerText: async () => values.shift() ?? 'Buy Now',
    filter: () => ({ click: async () => { clicks += 1; } }),
  };

  assert.equal(await waitForPurchaseCtaText(locator, 500), 'get');
  assert.deepEqual(await clickFreePurchaseCta(locator), { clicked: false, text: 'buy now' });
  assert.equal(clicks, 0);
});

test('generates a six-digit Epic 2FA code', async () => {
  const token = await generateOtp('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP');
  assert.match(token, /^\d{6}$/);
  await assert.rejects(generateOtp('invalid'));
});

test('claim failures produce a non-zero CLI result', () => {
  assert.equal(hasClaimFailures([]), true);
  assert.equal(
    hasClaimFailures([
      { status: 'claimed' },
      { status: 'already_owned' },
      { status: 'dryrun_skipped' },
    ]),
    false
  );
  assert.equal(hasClaimFailures([{ status: 'error' }]), true);
  assert.equal(hasClaimFailures([{ status: 'not_logged_in' }]), true);
  assert.equal(hasClaimFailures([{ status: 'claimed', manualRequired: true }]), true);
});
