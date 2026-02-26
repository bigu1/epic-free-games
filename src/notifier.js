/**
 * Notification module — sends claim results to stdout and optional webhook.
 */
import { cfg } from './config.js';

/**
 * Send a notification message.
 * @param {string} message - Plain text message
 * @param {object} [opts]
 * @param {'info'|'success'|'warning'|'error'} [opts.level='info']
 */
export async function notify(message, { level = 'info' } = {}) {
  const prefix = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' }[level] || 'ℹ️';
  const formatted = `${prefix} [epic-free-games] ${message}`;

  // Always log to stdout
  console.log(formatted);

  // Send to webhook if configured
  if (cfg.webhookUrl) {
    try {
      await sendWebhook(cfg.webhookUrl, formatted);
    } catch (err) {
      console.error(`Failed to send webhook notification: ${err.message}`);
    }
  }
}

/**
 * Send claim summary notification.
 * @param {{ title: string, status: string, url?: string }[]} results
 */
export async function notifyClaimResults(results) {
  if (!results.length) {
    await notify('No free games available this week.', { level: 'info' });
    return;
  }

  const lines = results.map((r) => {
    const icon = r.status === 'claimed' ? '🎮' : r.status === 'already_owned' ? '📦' : '❌';
    return `${icon} ${r.title} — ${r.status}${r.url ? `\n   ${r.url}` : ''}`;
  });

  const claimed = results.filter((r) => r.status === 'claimed').length;
  const total = results.length;
  const summary = `Claimed ${claimed}/${total} free games:\n${lines.join('\n')}`;

  await notify(summary, { level: claimed > 0 ? 'success' : 'info' });
}

/**
 * Generic webhook sender (supports JSON POST).
 */
async function sendWebhook(url, text) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, message: text }),
  });
  if (!resp.ok) {
    throw new Error(`Webhook returned ${resp.status}`);
  }
}
