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
export async function sendTelegramUserMessage(chatId, text, inlineKeyboard = []) {
  if (!ENV.TELEGRAM_BOT_TOKEN || !chatId) {
    console.log(`[Telegram User Mock to ${chatId}]:`, text);
    return { ok: true, mocked: true };
  }

  try {
    const payload = {
      chat_id: chatId,
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

/**
 * Format and post an approved deposit notification to the Telegram channel
 */
export async function notifyAdminDepositApproved({
  entryRef = 'N/A',
  applicantName = 'Applicant',
  amountETB = 1000,
  provider = 'TELEBIRR',
  txCode = 'N/A',
  adminName = 'Super Admin',
  queuePosition = null,
}) {
  const nowStr = new Date().toLocaleString('en-US', {
    timeZone: 'Africa/Addis_Ababa',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const positionLine = queuePosition ? `\n📋 <b>Queue Position:</b> #${queuePosition}` : '';

  const text = `
✅ <b>DEPOSIT APPROVED / የተፈቀደ ክፍያ</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>Applicant:</b> ${applicantName}
📋 <b>Ref:</b> <code>#${entryRef}</code>
💰 <b>Amount:</b> <b>${Number(amountETB).toLocaleString()} ETB</b>
🏦 <b>Provider:</b> ${provider}
🔢 <b>Transaction ID:</b> <code>${txCode || 'N/A'}</code>
👨‍💼 <b>Approved By:</b> ${adminName}${positionLine}
⏳ <b>Status:</b> Moved to Operator Filing Queue
⏰ <b>Time:</b> <i>${nowStr} EAT</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ <i>EthioDV-FillTrack Automated Notification</i>
  `.trim();

  return await sendTelegramAdminAlert(text);
}

/**
 * Format and post a rejected deposit notification to the Telegram channel
 */
export async function notifyAdminDepositRejected({
  entryRef = 'N/A',
  applicantName = 'Applicant',
  amountETB = 1000,
  provider = 'TELEBIRR',
  txCode = 'N/A',
  reason = 'Unverified payment',
  adminName = 'Super Admin',
}) {
  const nowStr = new Date().toLocaleString('en-US', {
    timeZone: 'Africa/Addis_Ababa',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const text = `
❌ <b>DEPOSIT REJECTED / ውድቅ የተደረገ ክፍያ</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>Applicant:</b> ${applicantName}
📋 <b>Ref:</b> <code>#${entryRef}</code>
💰 <b>Amount:</b> <b>${Number(amountETB).toLocaleString()} ETB</b>
🏦 <b>Provider:</b> ${provider}
🔢 <b>Transaction ID:</b> <code>${txCode || 'N/A'}</code>
⚠️ <b>Rejection Reason:</b> ${reason}
👨‍💼 <b>Action By:</b> ${adminName}
⏰ <b>Time:</b> <i>${nowStr} EAT</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ <i>EthioDV-FillTrack Automated Notification</i>
  `.trim();

  return await sendTelegramAdminAlert(text);
}

/**
 * Format and post an official filing confirmation to the Telegram channel
 */
export async function notifyAdminEntryFiled({
  entryRef = 'N/A',
  applicantName = 'Applicant',
  confirmationNumber = 'N/A',
  operatorName = 'Operator',
}) {
  const nowStr = new Date().toLocaleString('en-US', {
    timeZone: 'Africa/Addis_Ababa',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const text = `
🎉 <b>OFFICIAL APPLICATION FILED / ማመልከቻው ተልኳል</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>Applicant:</b> ${applicantName}
📋 <b>Ref:</b> <code>#${entryRef}</code>
🎫 <b>Confirmation #:</b> <code>${confirmationNumber}</code>
👨‍💼 <b>Filed By:</b> ${operatorName}
⏰ <b>Time:</b> <i>${nowStr} EAT</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 <i>EthioDV-FillTrack Official Submission Complete</i>
  `.trim();

  return await sendTelegramAdminAlert(text);
}
