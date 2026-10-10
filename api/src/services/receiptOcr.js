import { ENV } from '../config/env.js';

/**
 * Clean transaction code from OCR noise, QR code labels, and prefixes
 */
export function cleanTelebirrTxCode(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim().toUpperCase();
  // Strip common receipt suffixes (e.g. "QR CODE", "BARCODE", "CODE")
  str = str.replace(/(?:\s*(?:QR\s*CODE|QR|BARCODE|BAR\s*CODE|CODE|RECEIPT|SCAN|DOWNLOAD))$/gi, '').trim();
  // Strip common prefixes (e.g. "Txn:", "Ref No:", "TX:")
  str = str.replace(/^(?:transaction\s*(?:no|number|id)?|txn|ref|tx|id|#)[:\s-]*/gi, '').trim();
  // Extract core Telebirr / CBE code if embedded (e.g. "DIL30S56DV" in "DIL30S56DV QR CODE")
  const codeMatch = str.match(/\b(D[A-Z0-9]{8,14}|FT[A-Z0-9]{8,16}|[A-Z0-9]{9,16})\b/i);
  if (codeMatch) {
    return codeMatch[1].toUpperCase().trim();
  }
  // Fallback: strip non-alphanumeric
  return str.replace(/[^A-Z0-9]/gi, '').trim();
}

/**
 * Scan receipt image using Google Gemini Vision AI
 * @param {string|Buffer} imageData - Base64 string or binary Buffer
 * @param {string} mimeType - e.g. 'image/jpeg', 'image/png'
 * @returns {Promise<{ isReceipt: boolean, transactionCode: string|null, amountETB: number|null, bankName: string, confidenceScore: number, senderName: string|null, receiverName: string|null, reasonIfInvalid: string|null }|null>}
 */
export async function scanReceiptWithVisionAI(imageData, mimeType = 'image/jpeg') {
  if (!ENV.GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY not configured for Receipt OCR scanning.');
    return null;
  }

  let cleanBase64 = '';
  if (Buffer.isBuffer(imageData)) {
    cleanBase64 = imageData.toString('base64');
  } else if (typeof imageData === 'string') {
    cleanBase64 = imageData.replace(/^data:image\/\w+;base64,/, '').trim();
  } else {
    return null;
  }

  const prompt = `
You are an expert OCR AI scanner specializing in Ethiopian payment receipts (Telebirr, CBE Birr, Commercial Bank of Ethiopia / CBE, Dashen Bank, Awash Bank, Bank of Abyssinia).
Examine the uploaded screenshot image carefully.

Extract the payment details and return a strict JSON object:
{
  "isReceipt": true/false (Set to false if this is a random image, car, selfie, house, meme, or non-payment screenshot),
  "transactionCode": "string or null" (The unique transaction ID / reference number. In modern Telebirr it starts with DI e.g. DIR96IMI19, DIQ26DVA48, or DH e.g. DH77LM0UV3. In CBE it starts with FT e.g. FT24080312. Extract ONLY the code itself, uppercase, no labels or colons),
  "amountETB": number or null (The actual transfer amount in Ethiopian Birr ETB as a float or int, e.g. 1000.0, 500.0, 2000.0. Exclude transaction fee if listed separately),
  "senderName": "string or null" (Name of person who sent the money, or null if not shown),
  "receiverName": "string or null" (Name of recipient e.g. EthioDV or Selamawit, or null),
  "bankName": "Telebirr" / "CBE" / "CBE Birr" / "Bank of Abyssinia" / "Awash" / "Other",
  "confidenceScore": number (Between 0.0 and 1.0),
  "reasonIfInvalid": "string or null" (If isReceipt is false, a short polite explanation in Amharic explaining why)
}

Return ONLY valid JSON without markdown codeblock formatting or explanation.
  `.trim();

  // Candidate models in order of priority & speed
  const candidateModels = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
  ];

  for (const model of candidateModels) {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ENV.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType || 'image/jpeg',
                      data: cleanBase64,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 250,
              responseMimeType: 'application/json',
            },
          }),
        }
      );
      clearTimeout(timeoutTimer);

      if (!response.ok) {
        console.warn(`[Receipt-OCR] Model ${model} returned HTTP ${response.status}, trying fallback model...`);
        continue;
      }

      const data = await response.json();
      const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResult) {
        const cleanJsonText = textResult.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJsonText);

        if (parsed.transactionCode) {
          parsed.transactionCode = cleanTelebirrTxCode(parsed.transactionCode);
        }

        return parsed;
      }
    } catch (err) {
      clearTimeout(timeoutTimer);
      console.warn(`[Receipt-OCR] Model ${model} failed: ${err.message}, trying next fallback...`);
    }
  }

  return null;
}
