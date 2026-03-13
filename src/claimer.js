/**
 * Browser automation for claiming free games on Epic Games Store.
 * Uses Playwright with persistent context for session persistence.
 */
import { firefox } from 'playwright';
import { existsSync, appendFileSync } from 'fs';
import path from 'path';
import { cfg } from './config.js';
import { datetime, filenamify, sleep } from './utils.js';
import { notify } from './notifier.js';

const URL_CLAIM = 'https://store.epicgames.com/en-US/free-games';
const URL_LOGIN =
  'https://www.epicgames.com/id/login?lang=en-US&noHostRedirect=true&redirectUrl=' +
  encodeURIComponent(URL_CLAIM);

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 5000;
const RETRIABLE_STATUSES = new Set([
  'unknown',
  'payment_iframe_timeout',
  'place_order_not_found',
  'payment_error',
]);

/**
 * Launch persistent browser context.
 * @param {object} [opts]
 * @param {boolean} [opts.headless] - Override headless mode
 * @returns {Promise<{ context: import('playwright').BrowserContext, page: import('playwright').Page }>}
 */
export async function launchBrowser({ headless, browserDir } = {}) {
  const useHeadless = headless ?? cfg.headless;
  const profileDir = browserDir || cfg.dir.browser;
  console.log(`Launching Firefox (headless: ${useHeadless}, profile: ${profileDir})...`);

  // Disable WebGL in Firefox to reduce hCaptcha fingerprinting.
  const prefsFile = path.join(profileDir, 'prefs.js');
  if (existsSync(prefsFile)) {
    appendFileSync(prefsFile, '\nuser_pref("webgl.disabled", true);\n');
  }

  const context = await firefox.launchPersistentContext(profileDir, {
    headless: useHeadless,
    viewport: { width: cfg.width, height: cfg.height },
    locale: 'en-US',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = context.pages()[0] || (await context.newPage());
  await page.setViewportSize({ width: cfg.width, height: cfg.height });

  return { context, page };
}

/**
 * Check if the user is logged in to Epic Games Store.
 * @returns {Promise<boolean>}
 */
export async function isLoggedIn(page) {
  try {
    await page.goto(URL_CLAIM, { waitUntil: 'domcontentloaded', timeout: cfg.timeout });
    const nav = page.locator('egs-navigation');
    const loggedIn = await nav.getAttribute('isloggedin', { timeout: 10000 }).catch(() => null);
    return loggedIn === 'true';
  } catch {
    return false;
  }
}

/**
 * Get the display name of the currently logged-in user.
 * @returns {Promise<string|null>}
 */
export async function getLoginUser(page) {
  try {
    const nav = page.locator('egs-navigation');
    const loggedIn = await nav.getAttribute('isloggedin', { timeout: 5000 }).catch(() => null);
    if (loggedIn !== 'true') return null;
    return await nav.getAttribute('displayname', { timeout: 5000 }).catch(() => null);
  } catch {
    return null;
  }
}

/**
 * Interactive login flow — opens browser for user to log in manually,
 * or fills credentials if provided via env vars.
 */
export async function login(page) {
  console.log('Navigating to Epic Games login...');
  await page.goto(URL_LOGIN, { waitUntil: 'domcontentloaded' });

  if (cfg.eg_email && cfg.eg_password) {
    console.log('Auto-filling credentials...');
    try {
      await page.fill('#email', cfg.eg_email, { timeout: 10000 });
      await page.fill('#password', cfg.eg_password, { timeout: 5000 });
      await page.click('button[type="submit"]');

      if (cfg.eg_otpkey) {
        const { authenticator } = await import('otplib');
        try {
          await page.waitForURL('**/id/login/mfa**', { timeout: 10000 });
          const otp = authenticator.generate(cfg.eg_otpkey);
          console.log('Entering 2FA code...');
          await page.locator('input[name="code-input-0"]').pressSequentially(otp.toString());
          await page.click('button[type="submit"]');
        } catch {
          // MFA page didn't appear — that's fine.
        }
      }
    } catch (err) {
      console.error(`Auto-fill login failed: ${err.message}`);
      console.log('Please login manually in the browser window.');
    }
  } else {
    console.log('');
    console.log('='.repeat(60));
    console.log('  Please log in to Epic Games in the browser window.');
    console.log('  The script will continue automatically after login.');
    console.log('='.repeat(60));
    console.log('');
  }

  try {
    await page.waitForURL('**/free-games**', { timeout: cfg.loginTimeout });
    const nav = page.locator('egs-navigation');
    const user = await nav.getAttribute('displayname', { timeout: 10000 }).catch(() => 'unknown');
    console.log(`✅ Logged in as: ${user}`);
    return user;
  } catch {
    throw new Error('Login timed out. Please try again with: node src/index.js --login');
  }
}

/**
 * Claim all currently free games, or a provided subset of URLs.
 * @param {import('playwright').Page} page
 * @param {object} [opts]
 * @param {string[]} [opts.gameUrls]
 * @returns {Promise<Array<object>>}
 */
export async function claimFreeGames(page, opts = {}) {
  const results = [];
  const overrideUrls = Array.isArray(opts.gameUrls) ? opts.gameUrls.filter(Boolean) : [];

  console.log('Navigating to free games page...');
  await page.goto(URL_CLAIM, { waitUntil: 'domcontentloaded' });

  await page.context().addCookies([
    {
      name: 'OptanonAlertBoxClosed',
      value: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      domain: '.epicgames.com',
      path: '/',
    },
    {
      name: 'HasAcceptedAgeGates',
      value: 'USK:9007199254740991,general:18,EPIC SUGGESTED RATING:18',
      domain: 'store.epicgames.com',
      path: '/',
    },
  ]);

  let urls = overrideUrls;
  if (!urls.length) {
    const gameLinks = page.locator('a:has(span:text-is("Free Now"))');
    try {
      await gameLinks.last().waitFor({ timeout: 15000 });
    } catch {
      console.log('No "Free Now" games found on page. Possibly no free games this week.');
      return results;
    }

    urls = [];
    const handles = await gameLinks.elementHandles();
    for (const handle of handles) {
      const href = await handle.getAttribute('href');
      if (href) urls.push('https://store.epicgames.com' + href);
    }
  }

  console.log(`Found ${urls.length} free game(s): ${urls.join(', ')}`);

  for (const url of urls) {
    let result = null;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      result = await claimSingleGame(page, url, attempt);
      if (!isRetriableStatus(result.status)) break;
      if (attempt <= MAX_RETRIES) {
        console.log(
          `  ↻ Retrying ${result.title || url} (${attempt}/${MAX_RETRIES}) in ${RETRY_DELAY_MS / 1000}s...`
        );
        await sleep(RETRY_DELAY_MS);
      }
    }

    results.push(result);
  }

  return results;
}

function isRetriableStatus(status) {
  return RETRIABLE_STATUSES.has(status);
}

function createResult(url, attempt = 1) {
  return {
    title: 'Unknown',
    status: 'failed',
    reason: 'not_started',
    url,
    attempt,
    screenshotPath: '',
    manualRequired: false,
    details: '',
  };
}

async function claimSingleGame(page, url, attempt = 1) {
  const result = createResult(url, attempt);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    result.title = await getGameTitle(page, url);

    console.log(`\nProcessing: ${result.title} (attempt ${attempt})`);

    const purchaseBtn = page.locator('button[data-testid="purchase-cta-button"]').first();
    await purchaseBtn.waitFor({ timeout: 15000 });

    let btnText = await getLocatorText(purchaseBtn);
    if (btnText.includes('in library')) {
      result.status = 'already_owned';
      result.reason = 'already_in_library_before_claim';
      console.log('  ✅ Already in library.');
      return result;
    }

    if (btnText.includes('requires base game')) {
      result.status = 'requires_base_game';
      result.reason = 'requires_base_game';
      console.log('  ⚠️ Requires base game — skipping.');
      return result;
    }

    await handleMatureContent(page);

    if (cfg.dryrun) {
      result.status = 'dryrun_skipped';
      result.reason = 'dryrun_enabled';
      console.log('  🏃 DRYRUN — skipping actual purchase.');
      return result;
    }

    btnText = await getLocatorText(purchaseBtn);
    console.log(`  Clicking "${btnText || 'get'}"...`);
    await purchaseBtn.click({ delay: 50 });
    await autoHandlePagePrompts(page);

    const checkoutSurface = await waitForCheckoutSurface(page, purchaseBtn, 15000);
    applyOutcome(result, checkoutSurface);

    if (checkoutSurface.status === 'claimed') {
      console.log('  🎮 Ownership verified immediately after click.');
      return result;
    }

    if (checkoutSurface.status !== 'checkout_iframe_ready') {
      if (result.status !== 'page_closed') {
        result.screenshotPath =
          result.screenshotPath ||
          (await safeScreenshot(page, `${result.status}-${filenamify(datetime())}.png`));
      }
      if (result.status === 'captcha_blocked') {
        await notify(
          `Captcha blocked claim for "${result.title}". Auto-retry stopped; manual intervention is required.\n${result.url}`,
          { level: 'warning' }
        );
      }
      console.log(`  ❌ ${result.status} (${result.reason})`);
      return result;
    }

    const iframe = page.frameLocator('#webPurchaseContainer iframe');
    const prePlaceOutcome = await waitForPlaceOrderReady(page, iframe, 15000);
    applyOutcome(result, prePlaceOutcome);

    if (prePlaceOutcome.status !== 'place_order_ready') {
      if (result.status !== 'page_closed') {
        result.screenshotPath =
          result.screenshotPath ||
          (await safeScreenshot(page, `${result.status}-${filenamify(datetime())}.png`));
      }
      if (result.status === 'captcha_blocked') {
        await notify(
          `Captcha blocked claim for "${result.title}" before Place Order. Auto-retry stopped; manual intervention is required.\n${result.url}`,
          { level: 'warning' }
        );
      }
      console.log(`  ❌ ${result.status} (${result.reason})`);
      return result;
    }

    const placeOrderBtn = iframe.locator(
      'button:has-text("Place Order"):not(:has(.payment-loading--loading))'
    );
    try {
      await placeOrderBtn.click({ delay: 50 });
    } catch (err) {
      result.status = page.isClosed() ? 'page_closed' : 'place_order_not_found';
      result.reason = page.isClosed() ? 'page_closed_before_place_order_click' : 'place_order_click_failed';
      result.details = err.message;
      result.screenshotPath =
        result.screenshotPath ||
        (await safeScreenshot(page, `${result.status}-${filenamify(datetime())}.png`));
      console.log(`  ❌ ${result.status} (${result.reason})`);
      return result;
    }

    await autoHandleCheckoutPrompts(page, iframe);

    const claimOutcome = await waitForClaimOutcome(page, iframe, purchaseBtn, 30000);
    applyOutcome(result, claimOutcome);

    if (result.status === 'unknown') {
      const ownsGame = await verifyOwnership(page, url);
      if (ownsGame) {
        result.status = 'claimed';
        result.reason = 'ownership_verified_after_recheck';
      }
    }

    if (result.status === 'claimed') {
      console.log(`  🎮 Successfully claimed! (${result.reason})`);
      return result;
    }

    if (result.status !== 'page_closed') {
      result.screenshotPath =
        result.screenshotPath ||
        (await safeScreenshot(page, `${result.status}-${filenamify(datetime())}.png`));
    }

    if (result.status === 'captcha_blocked') {
      await notify(
        `Captcha blocked claim for "${result.title}" after Place Order. Auto-retry stopped; manual intervention is required.\n${result.url}`,
        { level: 'warning' }
      );
    }

    console.log(`  ❌ ${result.status} (${result.reason})`);
    return result;
  } catch (err) {
    result.status = page?.isClosed?.() ? 'page_closed' : 'error';
    result.reason = page?.isClosed?.() ? 'page_closed_during_claim' : 'unhandled_claim_exception';
    result.details = err.message;
    result.screenshotPath =
      result.screenshotPath ||
      (await safeScreenshot(page, `${result.status}-${filenamify(datetime())}.png`));
    console.error(`  ❌ Failed to claim: ${err.message}`);
    return result;
  }
}

async function getGameTitle(page, url) {
  const isBundle = (await page.locator('span:text-is("About Bundle")').count().catch(() => 0)) > 0;
  if (isBundle) {
    return page
      .locator('span:has-text("Buy"):left-of([data-testid="purchase-cta-button"])')
      .first()
      .innerText({ timeout: 10000 })
      .then((t) => t.replace(/^Buy\s+/i, ''))
      .catch(() => url.split('/').pop() || 'Unknown Bundle');
  }

  return page
    .locator('h1')
    .first()
    .innerText({ timeout: 10000 })
    .catch(() => url.split('/').pop() || 'Unknown');
}

async function handleMatureContent(page) {
  const continueBtn = page.locator('button:has-text("Continue")');
  try {
    if ((await continueBtn.count()) > 0) {
      console.log('  Handling mature content / age gate...');
      if ((await page.locator('[data-testid="AgeSelect"]').count()) > 0) {
        await page.locator('#month_toggle').click();
        await page.locator('#month_menu li:has-text("01")').click();
        await page.locator('#day_toggle').click();
        await page.locator('#day_menu li:has-text("01")').click();
        await page.locator('#year_toggle').click();
        await page.locator('#year_menu li:has-text("1987")').click();
      }
      await continueBtn.click({ delay: 100 });
      await sleep(2000);
    }
  } catch {
    // Ignore age-gate handling failures here; later state detection will catch real issues.
  }
}

async function autoHandlePagePrompts(page) {
  await maybeClick(page.locator('button:has-text("Continue")'));
  await maybeClick(page.locator('button:has-text("Yes, buy now")'));

  try {
    const agree = page.locator('input#agree').first();
    if ((await agree.count()) > 0 && (await agree.isVisible())) {
      console.log('  Accepting End User License Agreement...');
      await agree.check();
      await maybeClick(page.locator('button:has-text("Accept")'));
    }
  } catch {
    // Ignore.
  }
}

async function autoHandleCheckoutPrompts(page, iframe) {
  await maybeClick(iframe.locator('button:has-text("Continue")'));
  await maybeClick(iframe.locator('button:has-text("I Accept")'));

  if (!cfg.eg_parentalpin) return;

  try {
    const pinInput = iframe.locator('input.payment-pin-code__input').first();
    if ((await pinInput.count()) > 0 && (await pinInput.isVisible())) {
      console.log('  Entering parental control PIN...');
      await pinInput.fill(cfg.eg_parentalpin);
      await maybeClick(iframe.locator('button:has-text("Continue")'));
    }
  } catch {
    // Ignore.
  }

  await autoHandlePagePrompts(page);
}

async function waitForCheckoutSurface(page, purchaseBtn, timeoutMs) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (page.isClosed()) {
      return { status: 'page_closed', reason: 'page_closed_before_checkout_iframe' };
    }

    await autoHandlePagePrompts(page);

    const captchaEvidence = await detectCaptchaState(page);
    if (captchaEvidence) {
      return {
        status: 'captcha_blocked',
        reason: 'captcha_detected_before_checkout_iframe',
        manualRequired: true,
        details: captchaEvidence,
      };
    }

    const paymentError = await detectPaymentError(page);
    if (paymentError) {
      return classifyPaymentError(paymentError, 'payment_error_before_checkout_iframe');
    }

    try {
      if ((await page.locator('#webPurchaseContainer iframe').count()) > 0) {
        return { status: 'checkout_iframe_ready', reason: 'checkout_iframe_visible' };
      }
    } catch {
      // Ignore and keep polling.
    }

    const btnText = await getLocatorText(purchaseBtn);
    if (btnText.includes('in library')) {
      return { status: 'claimed', reason: 'ownership_verified_after_click' };
    }

    await sleep(500);
  }

  return { status: 'payment_iframe_timeout', reason: 'checkout_iframe_not_visible_in_time' };
}

async function waitForPlaceOrderReady(page, iframe, timeoutMs) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (page.isClosed()) {
      return { status: 'page_closed', reason: 'page_closed_before_place_order' };
    }

    await autoHandleCheckoutPrompts(page, iframe);

    const captchaEvidence = await detectCaptchaState(page, iframe);
    if (captchaEvidence) {
      return {
        status: 'captcha_blocked',
        reason: 'captcha_detected_before_place_order',
        manualRequired: true,
        details: captchaEvidence,
      };
    }

    const regionLock = await getVisibleText([
      iframe.locator('text=/unavailable in your region/i'),
      page.locator('text=/unavailable in your region/i'),
    ]);
    if (regionLock) {
      return { status: 'region_locked', reason: 'region_lock_detected', details: regionLock };
    }

    const paymentError = await detectPaymentError(page, iframe);
    if (paymentError) {
      return classifyPaymentError(paymentError, 'payment_error_before_place_order');
    }

    try {
      const placeOrderBtn = iframe.locator(
        'button:has-text("Place Order"):not(:has(.payment-loading--loading))'
      );
      if ((await placeOrderBtn.count()) > 0 && (await placeOrderBtn.first().isVisible())) {
        return { status: 'place_order_ready', reason: 'place_order_button_visible' };
      }
    } catch {
      // Ignore and keep polling.
    }

    await sleep(500);
  }

  return { status: 'place_order_not_found', reason: 'place_order_button_not_visible_in_time' };
}

async function waitForClaimOutcome(page, iframe, purchaseBtn, timeoutMs) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (page.isClosed()) {
      return { status: 'page_closed', reason: 'page_closed_after_place_order' };
    }

    await autoHandleCheckoutPrompts(page, iframe);

    const thanksText = await getVisibleText([
      page.locator('text=/Thanks for your order/i'),
      iframe.locator('text=/Thanks for your order/i'),
    ]);
    if (thanksText) {
      return { status: 'claimed', reason: 'thanks_for_order_visible', details: thanksText };
    }

    const btnText = await getLocatorText(purchaseBtn);
    if (btnText.includes('in library')) {
      return { status: 'claimed', reason: 'ownership_verified_after_checkout' };
    }

    const captchaEvidence = await detectCaptchaState(page, iframe);
    if (captchaEvidence) {
      return {
        status: 'captcha_blocked',
        reason: 'captcha_detected_after_place_order',
        manualRequired: true,
        details: captchaEvidence,
      };
    }

    const paymentError = await detectPaymentError(page, iframe);
    if (paymentError) {
      return classifyPaymentError(paymentError, 'payment_error_after_place_order');
    }

    await sleep(750);
  }

  return { status: 'unknown', reason: 'claim_outcome_timeout' };
}

async function verifyOwnership(page, url) {
  try {
    if (page.isClosed()) return false;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: cfg.timeout });
    const purchaseBtn = page.locator('button[data-testid="purchase-cta-button"]').first();
    await purchaseBtn.waitFor({ timeout: 15000 });
    const btnText = await getLocatorText(purchaseBtn);
    return btnText.includes('in library');
  } catch {
    return false;
  }
}

function applyOutcome(result, outcome) {
  result.status = outcome.status;
  result.reason = outcome.reason || result.reason;
  if (outcome.manualRequired) result.manualRequired = true;
  if (outcome.details) result.details = outcome.details;
}

function classifyPaymentError(text, fallbackReason) {
  const normalized = text.toLowerCase();
  if (normalized.includes('captcha') || normalized.includes('human')) {
    return {
      status: 'captcha_blocked',
      reason: 'captcha_error_banner',
      manualRequired: true,
      details: text,
    };
  }

  return {
    status: 'payment_error',
    reason: fallbackReason,
    details: text,
  };
}

async function detectCaptchaState(page, iframe = null) {
  const locators = [
    page.locator('iframe[src*="hcaptcha"]'),
    page.locator('iframe[title*="hCaptcha"]'),
    page.locator('iframe[title*="captcha"]'),
    page.locator('.h_captcha_challenge'),
    page.locator('#h_captcha_challenge_checkout_free_prod'),
    page.locator('[class*="captcha"]'),
    page.locator('text=/verify you are human|drag the puzzle|complete the puzzle|captcha|puzzle/i'),
  ];

  if (iframe) {
    locators.push(
      iframe.locator('iframe[src*="hcaptcha"]'),
      iframe.locator('iframe[title*="hCaptcha"]'),
      iframe.locator('iframe[title*="captcha"]'),
      iframe.locator('.h_captcha_challenge'),
      iframe.locator('#h_captcha_challenge_checkout_free_prod'),
      iframe.locator('[class*="captcha"]'),
      iframe.locator('text=/verify you are human|drag the puzzle|complete the puzzle|captcha|puzzle/i')
    );
  }

  for (const locator of locators) {
    try {
      if ((await locator.count()) > 0 && (await locator.first().isVisible())) {
        const text = await locator.first().innerText().catch(() => 'captcha visible');
        return text || 'captcha visible';
      }
    } catch {
      // Ignore locator failures.
    }
  }

  return '';
}

async function detectPaymentError(page, iframe = null) {
  const locators = [
    page.locator('.payment__errors'),
    page.locator('[role="alert"]'),
    page.locator('text=/failed to challenge captcha|try again later|something went wrong|error/i'),
  ];

  if (iframe) {
    locators.push(
      iframe.locator('.payment__errors'),
      iframe.locator('[role="alert"]'),
      iframe.locator('text=/failed to challenge captcha|try again later|something went wrong|error/i')
    );
  }

  return getVisibleText(locators);
}

async function getVisibleText(locators) {
  for (const locator of locators) {
    try {
      if ((await locator.count()) > 0 && (await locator.first().isVisible())) {
        const text = (await locator.first().innerText().catch(() => '')).trim();
        if (text) return text;
      }
    } catch {
      // Ignore.
    }
  }

  return '';
}

async function getLocatorText(locator) {
  try {
    return ((await locator.innerText()) || '').toLowerCase().trim();
  } catch {
    return '';
  }
}

async function maybeClick(locator) {
  try {
    if ((await locator.count()) > 0 && (await locator.first().isVisible())) {
      await locator.first().click({ delay: 50 });
      return true;
    }
  } catch {
    // Ignore.
  }
  return false;
}

async function safeScreenshot(page, filename) {
  if (!page || page.isClosed()) return '';

  const screenshotPath = path.join(cfg.dir.screenshots, filename);
  try {
    await page.screenshot({ path: screenshotPath });
    return screenshotPath;
  } catch (err) {
    console.warn(`  ⚠️ Failed to save screenshot (${filename}): ${err.message}`);
    return '';
  }
}
