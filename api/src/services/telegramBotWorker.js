import { ENV } from '../config/env.js';
import { handleTelegramUpdate } from './telegramBotHandler.js';

let isPolling = false;
let pollingOffset = 0;

/**
 * Start Long-Polling listener for @DV2027EthioDv_Bot
 * Automatically handles messages in real-time without needing a public domain / webhook
 */
export async function startTelegramPolling() {
  if (!ENV.TELEGRAM_BOT_TOKEN) {
    console.log('ℹ️ [Telegram Bot Worker] No TELEGRAM_BOT_TOKEN set, polling skipped.');
    return;
  }

  if (isPolling) return;
  isPolling = true;

  console.log('🤖 [Telegram Bot Worker] Starting live polling for @DV2027EthioDv_Bot...');

  // Check if webhook is currently set; if so, clear it so polling can receive updates
  try {
    const hookInfoRes = await fetch(`https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const hookInfo = await hookInfoRes.json();
    if (hookInfo?.result?.url) {
      console.log(`ℹ️ [Telegram Bot Worker] Webhook detected (${hookInfo.result.url}), deleting webhook to enable polling...`);
      await fetch(`https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}/deleteWebhook`);
    }
  } catch (err) {
    console.warn('Telegram webhook check warning:', err.message);
  }

  // Polling loop
  (async function pollLoop() {
    while (isPolling) {
      try {
        const url = `https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}/getUpdates?offset=${pollingOffset}&timeout=25`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
          for (const update of data.result) {
            pollingOffset = update.update_id + 1;
            try {
              await handleTelegramUpdate(update);
            } catch (updateErr) {
              console.error('Error handling Telegram update:', updateErr.message);
            }
          }
        } else if (!data.ok) {
          // If conflict or error, wait 3s before retry
          await new Promise((r) => setTimeout(r, 3000));
        }
      } catch (pollErr) {
        // Network timeout / blip, pause 2s
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  })();
}

export function stopTelegramPolling() {
  isPolling = false;
}
