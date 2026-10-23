import Payment from '../models/Payment.js';
import Entry from '../models/Entry.js';
import User from '../models/User.js';
import FormData from '../models/FormData.js';
import {
  sendTelegramUserMessage,
  answerTelegramCallbackQuery,
  notifyAdminDepositApproved,
  notifyAdminDepositRejected,
} from './telegram.js';
import { ENV } from '../config/env.js';

/**
 * Main menu keyboard markup
 */
function getMainMenuKeyboard() {
  const websiteUrl = ENV.CLIENT_URL || 'https://dvprogram.state.gov';
  return [
    [{ text: '🌐 ድረ-ገጻችንን ይጎብኙ (Visit Website)', url: websiteUrl }],
    [
      { text: '📋 የማመልከቻ ሁኔታ (Check Status)', callback_data: 'cmd_status' },
      { text: '📞 የደንበኞች ድጋፍ (Support)', callback_data: 'cmd_support' },
    ],
    [
      { text: '❓ ጥያቄዎችና መልሶች (FAQ)', callback_data: 'cmd_faq' },
      { text: '🇺🇸 የDV-2027 መስፈርቶች', callback_data: 'cmd_reqs' },
    ],
  ];
}

/**
 * Back to menu button
 */
function getBackKeyboard() {
  return [
    [{ text: '🔙 ወደ ዋናው ማውጫ (Back to Menu)', callback_data: 'cmd_start' }],
  ];
}

/**
 * Process any incoming Telegram Update (via Webhook or Polling)
 */
export async function handleTelegramUpdate(update) {
  if (!update) return;

  // 1. Handle Inline Button Callbacks
  if (update.callback_query) {
    const cb = update.callback_query;
    const data = cb.data || '';
    const chatId = cb.message?.chat?.id;
    const actorName = cb.from?.first_name || 'Admin';

    // 1A. Admin Payment Actions
    if (data.startsWith('pay_app:') || data.startsWith('pay_rej:')) {
      const [action, paymentId] = data.split(':');
      const payment = await Payment.findById(paymentId);

      if (!payment) {
        await answerTelegramCallbackQuery(cb.id, '❌ Payment record not found', true);
        return;
      }

      if (payment.status !== 'PENDING_VERIFICATION') {
        await answerTelegramCallbackQuery(cb.id, `⚠️ Already ${payment.status}`, true);
        return;
      }

      const entry = await Entry.findById(payment.entryId);
      const user = await User.findById(payment.userId);

      if (action === 'pay_app') {
        payment.status = 'APPROVED';
        if (!payment.approvedAt) payment.approvedAt = new Date();
        await payment.save();

        if (entry) {
          if (['PAYMENT_PENDING', 'DRAFT', 'PAYMENT_REJECTED'].includes(entry.status)) {
            entry.status = 'QUEUED';
          }
          if (!entry.paymentApprovedAt) {
            entry.paymentApprovedAt = payment.approvedAt;
          }
          await entry.save();
        }

        if (user?.telegramChatId) {
          await sendTelegramUserMessage(
            user.telegramChatId,
            `✅ <b>ክፍያዎ ተረጋግጧል!</b>\n\nማመልከቻዎ (<code>#${entry?.uniqueReference}</code>) በቅደም ተከተል ተመዝግቧል። ኦፕሬተራችን በይፋዊው የአሜሪካ ድረ-ገጽ እንዳስገባ ወዲያውኑ የማረጋገጫ ቁጥርዎ (Confirmation #) እዚህ ይደርስዎታል!`
          );
        }

        await answerTelegramCallbackQuery(cb.id, `✅ Approved by ${actorName}`, false);

        try {
          const formData = await FormData.findOne({ entryId: payment.entryId });
          const applicantName = formData?.primary?.name
            ? `${formData.primary.name.firstName || ''} ${formData.primary.name.lastName || ''}`.trim()
            : (user?.fullName || user?.name || 'Applicant');
          const queuePosition = await Entry.countDocuments({ status: 'QUEUED' });

          await notifyAdminDepositApproved({
            entryRef: entry?.uniqueReference || 'N/A',
            applicantName,
            amountETB: (payment.amountETBCents || 100000) / 100,
            provider: payment.provider,
            txCode: payment.claimedTransactionCode,
            adminName: actorName,
            queuePosition,
          });
        } catch (tgErr) {
          console.warn('Telegram approve notify error:', tgErr.message);
        }
      } else {
        payment.status = 'REJECTED';
        payment.rejectionReason = 'Rejected via Telegram admin button';
        await payment.save();

        if (entry) {
          entry.status = 'PAYMENT_REJECTED';
          await entry.save();
        }

        await answerTelegramCallbackQuery(cb.id, `❌ Rejected by ${actorName}`, false);

        try {
          const formData = await FormData.findOne({ entryId: payment.entryId });
          const applicantName = formData?.primary?.name
            ? `${formData.primary.name.firstName || ''} ${formData.primary.name.lastName || ''}`.trim()
            : (user?.fullName || user?.name || 'Applicant');

          await notifyAdminDepositRejected({
            entryRef: entry?.uniqueReference || 'N/A',
            applicantName,
            amountETB: (payment.amountETBCents || 100000) / 100,
            provider: payment.provider,
            txCode: payment.claimedTransactionCode,
            reason: payment.rejectionReason,
            adminName: actorName,
          });
        } catch (tgErr) {
          console.warn('Telegram reject notify error:', tgErr.message);
        }
      }
      return;
    }

    // 1B. User Navigation Callbacks
    await answerTelegramCallbackQuery(cb.id);

    if (data === 'cmd_start') {
      await sendWelcomeMessage(chatId, cb.from?.first_name || 'ወዳጃችን');
    } else if (data === 'cmd_status') {
      await handleStatusQuery(chatId, cb.from?.id, null);
    } else if (data === 'cmd_support') {
      await sendSupportMessage(chatId);
    } else if (data === 'cmd_faq') {
      await sendFaqMessage(chatId);
    } else if (data === 'cmd_reqs') {
      await sendRequirementsMessage(chatId);
    }
    return;
  }

  // 2. Handle Text Messages
  if (update.message && update.message.text) {
    const text = update.message.text.trim();
    const chatId = update.message.chat?.id;
    const tgUserId = update.message.from?.id;
    const senderName = update.message.from?.first_name || 'ወዳጃችን';
    const tgUsername = update.message.from?.username;

    // 2A. Deep Linking /start link_<userId>
    if (text.startsWith('/start link_')) {
      const userId = text.replace('/start link_', '').trim();
      try {
        const user = await User.findById(userId);
        if (user) {
          user.telegramId = String(tgUserId);
          user.telegramChatId = String(chatId);
          user.telegramUsername = tgUsername || user.telegramUsername;
          await user.save();

          const entries = await Entry.find({ userId: user._id }).sort({ createdAt: -1 });
          const latestRef = entries[0]?.uniqueReference;

          await sendTelegramUserMessage(
            chatId,
            `🎉 <b>እንኳን ደስ አለዎት ${user.fullName || senderName}! የቴሌግራም አካውንትዎ በተሳካ ሁኔታ ተገናኝቷል!</b> 🇺🇸🇪🇹\n\nከአሁን ጀምሮ የDV-2027 ማመልከቻዎ የክፍያ ሁኔታ፣ የኦፕሬተር ቅደም ተከተል እና ይፋዊው የማረጋገጫ ቁጥር (Confirmation Number) እዚህ ይደርስዎታል!\n\n${latestRef ? `📋 የቅርብ ጊዜ ማመልከቻዎ: <code>#${latestRef}</code>` : ''}`,
            getMainMenuKeyboard()
          );
          return;
        }
      } catch (err) {
        console.error('Telegram link user error:', err.message);
      }
    }

    // 2B. /start command
    if (text === '/start') {
      await sendWelcomeMessage(chatId, senderName);
      return;
    }

    // 2C. /support command
    if (text === '/support' || text.toLowerCase().includes('support') || text.includes('ድጋፍ') || text.includes('ስልክ')) {
      await sendSupportMessage(chatId);
      return;
    }

    // 2D. /faq command
    if (text === '/faq' || text.toLowerCase().includes('faq') || text.includes('ጥያቄ')) {
      await sendFaqMessage(chatId);
      return;
    }

    // 2E. /status or Check by Reference Code
    const refMatch = text.match(/#?(DV27-[A-Z0-9_-]{4,10})/i);
    if (text.startsWith('/status') || refMatch) {
      const extractedRef = refMatch ? refMatch[1].toUpperCase() : text.replace('/status', '').trim().replace('#', '').toUpperCase();
      await handleStatusQuery(chatId, tgUserId, extractedRef || null);
      return;
    }

    // 2F. Default Friendly Help
    await sendTelegramUserMessage(
      chatId,
      `ሰላም <b>${senderName}</b>! 👋\n\nመልዕክትዎ ደርሶናል። የDV-2027 ማመልከቻዎን ሁኔታ ለመከታተል የDV መለያ ቁጥርዎን (ለምሳሌ፡ <code>#DV27-K3RKY6</code>) ይላኩልን፤ ወይም ከታች ያሉትን አዝራሮች ይጠቀሙ፡`,
      getMainMenuKeyboard()
    );
  }
}

/**
 * Send Welcome Menu
 */
async function sendWelcomeMessage(chatId, senderName) {
  const text = `
👋 <b>ሰላም ${senderName}! ወደ EthioDV-FillTrack ይፋዊ የቴሌግራም ቦት በደህና መጡ! 🇺🇸🇪🇹</b>

እኛ ለDV-2027 አመልካቾች ፈጣን፣ አስተማማኝ እና ከስህተት የጸዳ የቅጽ አሞላል፣ የፎቶ ማስተካከልና ይፋዊ የDV Confirmation ቁጥር ማድረሻ አገልግሎት እንሰጣለን።

<b>በዚህ ቦት የሚያገኟቸው አገልግሎቶች፡</b>
• የDV-2027 ማመልከቻዎን ሁኔታ መከታተል (/status)
• የክፍያ ማረጋገጫና የDV Confirmation ቁጥር ፈጣን ማሳወቂያ
• 24/7 የደንበኞች ድጋፍ መስመር (📞 0949478933)
• የፎቶ፣ የፓስፖርት እና የትምህርት መስፈርቶች ማብራሪያ

የሚፈልጉትን አገልግሎት ከታች ይምረጡ፡
  `.trim();

  await sendTelegramUserMessage(chatId, text, getMainMenuKeyboard());
}

/**
 * Handle Application Status Query
 */
async function handleStatusQuery(chatId, tgUserId, refCode) {
  let entry = null;

  if (refCode) {
    entry = await Entry.findOne({
      uniqueReference: new RegExp(`^${refCode}$`, 'i'),
    }).populate('userId', 'fullName email phone');
  } else if (tgUserId) {
    const user = await User.findOne({ telegramId: String(tgUserId) });
    if (user) {
      entry = await Entry.findOne({ userId: user._id })
        .sort({ createdAt: -1 })
        .populate('userId', 'fullName email phone');
    }
  }

  if (!entry) {
    await sendTelegramUserMessage(
      chatId,
      `📋 <b>የDV-2027 ማመልከቻዎን ሁኔታ ለማየት:</b>\n\nእባክዎ ባለ 6 ፊደል የDV መለያ ቁጥርዎን ይላኩልን (ለምሳሌ፡ <code>#DV27-K3RKY6</code> ወይም <code>DV27-K3RKY6</code>)።\n\nወይም በድረ-ገጻችን ገብተው <b>"Link Telegram"</b> የሚለውን በመጫን አካውንትዎን ማገናኘት ይችላሉ!`,
      getBackKeyboard()
    );
    return;
  }

  const formData = await FormData.findOne({ entryId: entry._id });
  let applicantName = entry.userId?.fullName || 'Applicant';
  if (formData) {
    try {
      const dec = formData.getDecryptedData();
      if (dec?.primary?.name) {
        applicantName = `${dec.primary.name.firstName || ''} ${dec.primary.name.lastName || ''}`.trim();
      }
    } catch (e) {}
  }

  const dateStr = new Date(entry.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const confirmationNumber = entry.getConfirmationNumber ? entry.getConfirmationNumber() : entry.confirmationNumber;

  if (entry.status === 'CONFIRMED' || entry.status === 'FILED') {
    await sendTelegramUserMessage(
      chatId,
      `
🎉 <b>የDV-2027 ማመልከቻዎ በተሳካ ሁኔታ ተልኳል!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>አመልካች:</b> ${applicantName}
📋 <b>የDV መለያ:</b> <code>#${entry.uniqueReference}</code>
🎫 <b>ይፋዊ Confirmation #:</b> <code>${confirmationNumber || 'Delivered'}</code>
📅 <b>የተላከበት ቀን:</b> ${dateStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <i>ይህንን ባለ 16 ዲጂት ቁጥር በጥንቃቄ ያስቀምጡ! በሜይ ወር ውጤትዎን በ dvprogram.state.gov ላይ በግልዎ ያረጋግጣሉ።</i>
      `.trim(),
      getBackKeyboard()
    );
  } else if (entry.status === 'QUEUED' || entry.status === 'FILING_IN_PROGRESS') {
    const queuePosition = await Entry.countDocuments({
      status: 'QUEUED',
      createdAt: { $lte: entry.createdAt },
    });

    await sendTelegramUserMessage(
      chatId,
      `
📋 <b>የማመልከቻዎ ሁኔታ፡ በቅደም ተከተል ላይ (In Queue)</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>አመልካች:</b> ${applicantName}
📋 <b>የDV መለያ:</b> <code>#${entry.uniqueReference}</code>
💰 <b>ክፍያ:</b> ✅ ተረጋግጧል (Paid & Verified)
⏳ <b>ሁኔታ:</b> ወደ አሜሪካ ስቴት ዲፓርትመንት ይፋዊ ድረ-ገጽ ለመላክ በኦፕሬተር ቅደም ተከተል ላይ ይገኛል።
🔢 <b>የአሁኑ ተራ:</b> #${queuePosition || 1}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔔 <i>ልክ ማመልከቻዎ እንደተላከ ይፋዊው Confirmation Number እዚህ በቦቱ ወዲያውኑ ይላክልዎታል!</i>
      `.trim(),
      getBackKeyboard()
    );
  } else if (entry.status === 'PAYMENT_PENDING') {
    await sendTelegramUserMessage(
      chatId,
      `
⏳ <b>የማመልከቻዎ ሁኔታ፡ ክፍያ በመጠባበቅ ላይ (Awaiting Payment)</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>አመልካች:</b> ${applicantName}
📋 <b>የDV መለያ:</b> <code>#${entry.uniqueReference}</code>
💰 <b>የአገልግሎት ክፍያ:</b> 1,000 ብር
🏦 <b>የክፍያ አማራጮች:</b> CBE / Telebirr / Chapa
━━━━━━━━━━━━━━━━━━━━━━━━━━
የቅጽ መረጃዎ ተጠናቅቋል። ክፍያዎን በድረ-ገጻችን ላይ ካጠናቀቁ በኋላ ማመልከቻዎ ወዲያውኑ ወደ ኦፕሬተር ቅደም ተከተል ይገባል!
      `.trim(),
      [
        [{ text: '💳 አሁን ይክፈሉ (Pay Now)', url: `${ENV.CLIENT_URL || 'https://dvprogram.state.gov'}/payment` }],
        ...getBackKeyboard(),
      ]
    );
  } else {
    await sendTelegramUserMessage(
      chatId,
      `
📋 <b>የማመልከቻዎ ሁኔታ:</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>አመልካች:</b> ${applicantName}
📋 <b>የDV መለያ:</b> <code>#${entry.uniqueReference}</code>
⏳ <b>ሁኔታ:</b> ${entry.status}
📅 <b>የተመዘገበበት:</b> ${dateStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━
      `.trim(),
      getBackKeyboard()
    );
  }
}

/**
 * Send Support Details
 */
async function sendSupportMessage(chatId) {
  const text = `
📞 <b>EthioDV የደንበኞች ድጋፍና ግንኙነት መስመር (Customer Support)</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 <b>የስልክ መስመር:</b> <code>0949478933</code>
👤 <b>ዋና አስተዳዳሪ:</b> ዮሐንስ ሞላ (Yohannes Molla)
🤖 <b>ይፋዊ ቦት:</b> @DV2027EthioDv_Bot
⏰ <b>የስራ ሰዓት:</b> 24/7 ክፍት (Customer Support)
📍 <b>አድራሻ:</b> አዲስ አበባ፣ ኢትዮጵያ
━━━━━━━━━━━━━━━━━━━━━━━━━━
ለማንኛውም አይነት ጥያቄ፣ የክፍያ ማረጋገጫ ወይም እገዛ በ <b>0949478933</b> መደወል ይችላሉ!
  `.trim();

  await sendTelegramUserMessage(chatId, text, [
    [{ text: '📞 በቀጥታ ይደውሉ (Call Support)', url: 'tel:0949478933' }],
    ...getBackKeyboard(),
  ]);
}

/**
 * Send Frequently Asked Questions
 */
async function sendFaqMessage(chatId) {
  const text = `
❓ <b>በተደጋጋሚ የሚጠየቁ ጥያቄዎች (DV-2027 FAQ)</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
<b>1. ለDV-2027 ፓስፖርት ያስፈልገኛል?</b>
👉 አዎ፣ ፓስፖርት ያስፈልግዎታል፤ ነገር ግን ከቤተሰብዎ አባላት መካከል (የትዳር አጋር ወይም ወላጅ) አንዱ ፓስፖርት ካለው/ካላት እርሱን በመጠቀም ማመልከት ይችላሉ።

<b>2. የፎቶግራፍ መስፈርቱ ምንድን ነው?</b>
👉 600x600 ፒክሰል፣ ነጭ ጀርባ ያለው፣ መነፅር የሌለበትና በቅርብ 6 ወራት ውስጥ የተነሳ መሆን አለበት።

<b>3. ይፋዊው የማረጋገጫ ቁጥር (Confirmation #) መቼ ይደርሰኛል?</b>
👉 ኦፕሬተሮቻችን በይፋዊው የአሜሪካ ድረ-ገጽ (dvprogram.state.gov) እንዳስገቡ ወዲያውኑ ባለ 16 ዲጂት ቁጥሩ በቴሌግራም ቦት፣ በኢሜል እንዲሁም በድረ-ገጻችን ላይ ይሰጥዎታል።

<b>4. የገንዘብ ተመላሽ ዋስትና (Refund Guarantee) አላችሁ?</b>
👉 አዎ! በእኛ በኩል በሚፈጠር ቴክኒካል መስተጓጎል በጊዜ ገደቡ ማስገባት ካልቻልን 90% (900 ብር) ወዲያውኑ ተመላሽ ይደረጋል!
━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  await sendTelegramUserMessage(chatId, text, getBackKeyboard());
}

/**
 * Send Requirements
 */
async function sendRequirementsMessage(chatId) {
  const text = `
🇺🇸 <b>የDV-2027 ማመልከቻ ዋና መስፈርቶች:</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ <b>የትምህርት ደረጃ:</b> ቢያንስ የ12ኛ ክፍል (ወይም 10ኛ ክፍል የድሮው) ያጠናቀቀ ወይም የ2 ዓመት ብቁ የስራ ልምድ።
2️⃣ <b>ፎቶግራፍ:</b> ደረጃውን የጠበቀ ባለ 600x600 ፒክሰል ነጭ ጀርባ ያለው ፎቶ።
3️⃣ <b>ፓስፖርት:</b> የእርስዎ ወይም ከቤተሰብዎ አባላት አንዱ ፓስፖርት።
4️⃣ <b>የቤተሰብ መረጃ:</b> ያገቡ ከሆኑ የትዳር አጋርና እድሜያቸው ከ21 ዓመት በታች የሆኑ ልጆች መረጃና ፎቶ።
━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  await sendTelegramUserMessage(chatId, text, getBackKeyboard());
}
