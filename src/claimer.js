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

// Retry config
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 5000;

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

  // Disable WebGL in Firefox to reduce hCaptcha fingerprinting
  // (Firefox removes duplicate prefs and sorts them, safe to append every time)
  const prefsFile = path.join(profileDir, 'prefs.js');
  if (existsSync(prefsFile)) {
    appendFileSync(prefsFile, '\nuser_pref("webgl.disabled", true);\n');
  }

  const context = await firefox.launchPersistentContext(profileDir, {
    headless: useHeadless,
    viewport: { width: cfg.width, height: cfg.height },
    locale: 'en-US',
    // Use a realistic Windows Firefox UA to avoid "device not supported" issues
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  });

  // Stealth: override navigator.webdriver
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

  // If credentials are set, try auto-fill
  if (cfg.eg_email && cfg.eg_password) {
    console.log('Auto-filling credentials...');
    try {
      await page.fill('#email', cfg.eg_email, { timeout: 10000 });
      await page.fill('#password', cfg.eg_password, { timeout: 5000 });
      await page.click('button[type="submit"]');

      // Handle MFA if needed
      if (cfg.eg_otpkey) {
        const { authenticator } = await import('otplib');
        try {
          await page.waitForURL('**/id/login/mfa**', { timeout: 10000 });
          const otp = authenticator.generate(cfg.eg_otpkey);
          console.log('Entering 2FA code...');
          await page.locator('input[name="code-input-0"]').pressSequentially(otp.toString());
          await page.click('button[type="submit"]');
        } catch {
          // MFA page didn't appear — that's fine
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

  // Wait for login to complete (user lands on free games page)
  try {
    await page.waitForURL('**/free-games**', { timeout: cfg.loginTimeout });
    const nav = page.locator('egs-navigation');
    const user = await nav.getAttribute('displayname', { timeout: 10000 }).catch(() => 'unknown');
    console.log(`✅ Logged in as: ${user}`);
    return user;
  } catch {
    throw new Error(
      'Login timed out. Please try again with: node src/index.js --login'
    );
  }
}

/**
 * Claim all currently free games.
 * @param {import('playwright').Page} page
 * @returns {Promise<{ title: string, status: string, url?: string }[]>}
 */
export async function claimFreeGames(page) {
  const results = [];

  console.log('Navigating to free games page...');
  await page.goto(URL_CLAIM, { waitUntil: 'domcontentloaded' });

  // Accept cookies banner and age gates via context cookies
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

  // Wait for game cards to load
  const gameLinks = page.locator('a:has(span:text-is("Free Now"))');
  try {
    await gameLinks.last().waitFor({ timeout: 15000 });
  } catch {
    console.log('No "Free Now" games found on page. Possibly no free games this week.');
    return results;
  }

  // Collect game URLs
  const urls = [];
  const handles = await gameLinks.elementHandles();
  for (const handle of handles) {
    const href = await handle.getAttribute('href');
    if (href) urls.push('https://store.epicgames.com' + href);
  }
  console.log(`Found ${urls.length} free game(s): ${urls.join(', ')}`);

  // Claim each game with retry
  for (const url of urls) {
    let result;
    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      result = await claimSingleGame(page, url);
      if (result.status !== 'error' && result.status !== 'unknown') break;
      if (attempt <= MAX_RETRIES) {
        console.log(`  ↻ Retrying (${attempt}/${MAX_RETRIES}) in ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
    results.push(result);
  }

  return results;
}

/**
 * Claim a single free game by URL.
 */
async function claimSingleGame(page, url) {
  const result = { title: 'Unknown', status: 'failed', url };

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Detect bundle vs single game and get title
    const isBundle = (await page.locator('span:text-is("About Bundle")').count()) > 0;
    if (isBundle) {
      // Bundle title is in "Buy <title>" text near the purchase button
      result.title = await page
        .locator('span:has-text("Buy"):left-of([data-testid="purchase-cta-button"])')
        .first()
        .innerText({ timeout: 10000 })
        .then((t) => t.replace(/^Buy\s+/i, ''))
        .catch(() => url.split('/').pop() || 'Unknown Bundle');
    } else {
      result.title = await page
        .locator('h1')
        .first()
        .innerText({ timeout: 10000 })
        .catch(() => url.split('/').pop() || 'Unknown');
    }

    console.log(`\nProcessing: ${result.title}${isBundle ? ' (bundle)' : ''}`);

    // Find the purchase button and check its state
    const purchaseBtn = page
      .locator('button[data-testid="purchase-cta-button"]')
      .first();
    await purchaseBtn.waitFor({ timeout: 15000 });
    const btnText = (await purchaseBtn.innerText()).toLowerCase().trim();

    if (btnText.includes('in library')) {
      console.log(`  ✅ Already in library.`);
      result.status = 'already_owned';
      return result;
    }

    if (btnText.includes('requires base game')) {
      console.log(`  ⚠️ Requires base game — skipping.`);
      result.status = 'requires_base_game';
      return result;
    }

    // Handle mature content warning
    const continueBtn = page.locator('button:has-text("Continue")');
    if ((await continueBtn.count()) > 0) {
      console.log('  Handling mature content / age gate...');
      // Handle age select if present
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

    if (cfg.dryrun) {
      console.log('  🏃 DRYRUN — skipping actual purchase.');
      result.status = 'dryrun_skipped';
      return result;
    }

    // Click "Get" / purchase button
    console.log(`  Clicking "${btnText}"...`);
    await purchaseBtn.click({ delay: 50 });

    // Handle "device not supported" continue
    page.click('button:has-text("Continue")').catch(() => {});
    // Handle "you already own something in this bundle"
    page.click('button:has-text("Yes, buy now")').catch(() => {});

    // Handle End User License Agreement (only needed once per EULA)
    page
      .locator('input#agree')
      .waitFor({ timeout: 3000 })
      .then(async () => {
        console.log('  Accepting End User License Agreement...');
        await page.locator('input#agree').check();
        await page.locator('button:has-text("Accept")').click();
      })
      .catch(() => {});

    // Handle Parental Control PIN if configured
    if (cfg.eg_parentalpin) {
      page
        .locator('input[type="password"][autocomplete="off"]')
        .waitFor({ timeout: 3000 })
        .then(async (el) => {
          console.log('  Entering parental control PIN...');
          await el.fill(cfg.eg_parentalpin);
          await page.locator('button:has-text("Continue")').click();
        })
        .catch(() => {});
    }

    // Wait for purchase iframe
    await page.waitForSelector('#webPurchaseContainer iframe', { timeout: 15000 });
    const iframe = page.frameLocator('#webPurchaseContainer iframe');

    // Check for region lock
    if ((await iframe.locator(':has-text("unavailable in your region")').count()) > 0) {
      console.log('  ❌ Unavailable in your region.');
      result.status = 'region_locked';
      return result;
    }

    // Check for hCaptcha
    const captchaDetected = iframe
      .locator('.h_captcha_challenge iframe, #h_captcha_challenge_checkout_free_prod iframe')
      .waitFor({ timeout: 3000 })
      .then(() => true)
      .catch(() => false);

    // Click "Place Order"
    const placeOrderBtn = iframe.locator(
      'button:has-text("Place Order"):not(:has(.payment-loading--loading))'
    );
    await placeOrderBtn.click({ delay: 50 });

    // EU: Accept "I Accept" if shown
    iframe
      .locator('button:has-text("I Accept")')
      .waitFor({ timeout: 5000 })
      .then((el) => el.click())
      .catch(() => {});

    if (await captchaDetected) {
      console.log('  ⚠️ hCaptcha detected! Manual intervention may be needed.');
      await notify(
        `hCaptcha detected while claiming "${result.title}". Manual intervention needed: ${url}`,
        { level: 'warning' }
      );
      // Take screenshot for debugging
      const screenshotPath = path.join(
        cfg.dir.screenshots,
        `captcha-${filenamify(datetime())}.png`
      );
      await page.screenshot({ path: screenshotPath });
      result.status = 'captcha_blocked';
      return result;
    }

    // Wait for success confirmation
    try {
      await page.locator('text=Thanks for your order').waitFor({ timeout: 30000 });
      console.log(`  🎮 Successfully claimed!`);
      result.status = 'claimed';
    } catch {
      // Check if we ended up with it in library anyway
      const screenshotPath = path.join(
        cfg.dir.screenshots,
        `unknown-${filenamify(datetime())}.png`
      );
      await page.screenshot({ path: screenshotPath });
      console.log(`  ❓ Claim result unclear. Screenshot saved: ${screenshotPath}`);
      result.status = 'unknown';
    }
  } catch (err) {
    console.error(`  ❌ Failed to claim: ${err.message}`);
    // Save error screenshot
    try {
      const screenshotPath = path.join(
        cfg.dir.screenshots,
        `error-${filenamify(datetime())}.png`
      );
      await page.screenshot({ path: screenshotPath });
    } catch {}
    result.status = 'error';
  }

  return result;
}
