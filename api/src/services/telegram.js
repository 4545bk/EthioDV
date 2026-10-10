import { ENV } from '../config/env.js';

/**
 * Send an alert message to the Admin Telegram channel/group
 */
export async function sendTelegramAdminAlert(text, inlineKeyboard = []) {
  if (!ENV.TELEGRAM_BOT_TOKEN || !ENV.TELEGRAM_ADMIN_CHAT_ID) {
    console.log('[Telegram Admin Alert Mock]:', text);
    return { ok: true, mocked: true };
  }

  try {
    const payload = {
      chat_id: ENV.TELEGRAM_ADMIN_CHAT_ID,
      text,
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined,
    };

    const res = await fetch(`https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return await res.json();
  } catch (err) {
    console.error('Telegram send message error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Send a notification photo to the Admin Telegram channel
 */
export async function sendTelegramAdminPhoto(photoUrl, caption, inlineKeyboard = []) {
  if (!ENV.TELEGRAM_BOT_TOKEN || !ENV.TELEGRAM_ADMIN_CHAT_ID) {
    console.log('[Telegram Admin Photo Mock]:', photoUrl, caption);
    return { ok: true, mocked: true };
  }

  try {
    const payload = {
      chat_id: ENV.TELEGRAM_ADMIN_CHAT_ID,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined,
    };

    const res = await fetch(`https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.ok) {
      // Fallback to text message if photo fails
      return sendTelegramAdminAlert(`🖼 <b>Receipt Photo:</b> ${photoUrl}\n\n${caption}`, inlineKeyboard);
    }
    return data;
  } catch (err) {
    console.error('Telegram sendPhoto error:', err.message);
    return sendTelegramAdminAlert(caption, inlineKeyboard);
  }
}

/**
 * Send a direct message to a specific user via Telegram chat
 */
export async function sendTelegramUserMessage(chatId, text) {
  if (!ENV.TELEGRAM_BOT_TOKEN || !chatId) {
    console.log(`[Telegram User Mock to ${chatId}]:`, text);
    return { ok: true, mocked: true };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    return await res.json();
  } catch (err) {
    console.error(`Telegram user notification error (${chatId}):`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Answer an incoming Telegram inline callback query
 */
export async function answerTelegramCallbackQuery(callbackQueryId, text, showAlert = false) {
  if (!ENV.TELEGRAM_BOT_TOKEN) return { ok: true };

  try {
    const res = await fetch(`https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Send full executive analytics report to the Admin Telegram channel
 */
export async function sendDailyExecutiveReport(stats) {
  const {
    revenueETB = 0,
    approvedToday = 0,
    totalApproved = 0,
    pendingPayments = 0,
    filedCount = 0,
    queuedCount = 0,
    maxDailyCapacity = 160,
  } = stats;

  const capacityRemaining = Math.max(0, maxDailyCapacity - approvedToday);
  const nowStr = new Date().toLocaleString('en-US', {
    timeZone: 'Africa/Addis_Ababa',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const text = `
📊 <b>EthioDV-FillTrack Daily Executive Report</b>
⏰ <i>${nowStr} (East Africa Time)</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 <b>Total Gross Revenue:</b> <b>${Number(revenueETB).toLocaleString()} ETB</b>
👥 <b>Payments Approved Today:</b> <b>${approvedToday}</b>
⏳ <b>Pending Payment Reviews:</b> <b>${pendingPayments}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 <b>Officially Filed Entries:</b> <b>${filedCount}</b>
📋 <b>Waiting in Operator Queue:</b> <b>${queuedCount}</b>
⚡ <b>Daily Remaining Capacity:</b> <b>${capacityRemaining} / ${maxDailyCapacity} slots</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 <i>EthioDV-FillTrack Automated Business Monitor</i>
  `.trim();

  return await sendTelegramAdminAlert(text);
}
