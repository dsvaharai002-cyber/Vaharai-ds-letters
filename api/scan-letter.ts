import type { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Candidate models ordered by priority with automatic fallback
export const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

export interface ScannedLetterPayload {
  dispatchedDate: string;
  inwardNo: string;
  originalNo: string;
  fromWhom: string;
  subject: string;
  registeredPostNo: string;
  postType: 'Normal Post' | 'Registered Post' | 'By Hand' | 'Special / Courier';
  suggestedDivision: string;
  summary: string;
}

/**
 * Normalizes varied date formats (e.g. "2026.08.17", "2026/08/17", "17.08.2026", "17/08/2026", "17-08-2026")
 * into strict ISO standard YYYY-MM-DD.
 */
export function normalizeDateToYYYYMMDD(rawDate?: string): string {
  if (!rawDate) return '';
  const trimmed = rawDate.trim();

  // Match YYYY.MM.DD, YYYY/MM/DD, YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Match DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  return '';
}

/**
 * Core AI scanning function that extracts structured mail metadata from a base64 image
 * using Gemini multimodal vision.
 */
export async function scanLetterDocument(params: {
  imageBase64: string;
  mimeType?: string;
  apiKey?: string;
}): Promise<ScannedLetterPayload> {
  const { imageBase64, mimeType = 'image/jpeg', apiKey = process.env.GEMINI_API_KEY } = params;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || !apiKey.trim()) {
    throw new Error('GEMINI_KEY_NOT_CONFIGURED');
  }

  if (!imageBase64) {
    throw new Error('Image base64 data is required');
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Strip data URI prefix if present
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

  const promptText = `You are an expert postal document scanner for the Divisional Secretariat, Koralaipattu North, Vaharai (பிரதேச செயலகம், கோறளைப்பற்று வடக்கு, வாகரை) in Sri Lanka.
Carefully examine this official Sri Lankan government letter / postal document (which may be in Tamil, Sinhala, or English, e.g. from Welfare Benefits Board நலன்புரி நன்மைகள் சபை / நிதி அமைச்சு / District Secretariat / Ministries / Public Services).

Extract these key fields with highest accuracy:
1. dispatchedDate: Letter date (திகதி / දිනය / Date). Convert to format YYYY-MM-DD. For example "2026.08.17" or "2026/08/17" should be "2026-08-17".
2. inwardNo: The sender's official letter reference number printed on the document (கடித இலக்கம் / எனது இல / මාගේ අංකය / My No, e.g. "Wbb/Operation/Policies/04", "KN/DS/ADM/2026/04").
3. fromWhom: Who sent the letter (அனுப்புனர் / Sender institution, Ministry, Department, Board, or Citizen, e.g. "நலன்புரி நன்மைகள் சபை, நிதி அமைச்சு / Welfare Benefits Board").
4. subject: The subject or topic of the letter (விடயம் / விடயம் / කරුණ / Subject, e.g. "சட்ட விரோதமான பணக் கொடுப்பனவுகளைத் தடுத்தல்").
5. registeredPostNo: Any registered postal barcode or number if present, else empty string.
6. postType: Choose one: "Normal Post", "Registered Post", "By Hand", or "Special / Courier".
7. suggestedDivision: Pick the best matching DS Division from this official list ONLY:
   - "நிர்வாகப் பிரிவு (Administration)"
   - "காணிப் பிரிவு (Land Division)"
   - "திட்டமிடல் பிரிவு (Planning)"
   - "சமூக சேவை (Social)"
   - "சமுர்த்தி (Samurdhi)"
   - "கிராம அபிவிருத்தி (Rural Development)"
   - "கணக்குப் பிரிவு (Accounts & Finance)"
   - "தேசிய அடையாள அட்டை பிரிவு (NIC)"
   - "தபால் & ஆவணப் பிரிவு (Mail & Records)"
   - "வெளிக்களம் (Field)"
   - "சிறுவர் பிரிவு (Field)"
   - "பதிவாளர் கிளை (Registrar Branch)"
8. summary: A short 1-sentence Tamil/English summary of this letter's message or instruction.

Return strictly in JSON format matching the schema.`;

  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
            {
              text: promptText,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dispatchedDate: {
                type: Type.STRING,
                description: 'Dispatched date YYYY-MM-DD or raw date on letter',
              },
              inwardNo: {
                type: Type.STRING,
                description: 'Official letter reference number / கடித இலக்கம்',
              },
              originalNo: {
                type: Type.STRING,
                description: 'Letter reference number / கடித இலக்கம்',
              },
              fromWhom: {
                type: Type.STRING,
                description: 'Sender organization or individual / அனுப்புனர்',
              },
              subject: {
                type: Type.STRING,
                description: 'Subject or regarding / கடித விடயம்',
              },
              registeredPostNo: {
                type: Type.STRING,
                description: 'Registered postal number / barcode if present',
              },
              postType: {
                type: Type.STRING,
                description: 'Normal Post | Registered Post | By Hand | Special / Courier',
              },
              suggestedDivision: {
                type: Type.STRING,
                description: 'Suggested Divisional Secretariat branch/division name',
              },
              summary: {
                type: Type.STRING,
                description: 'Brief one sentence summary of the letter',
              },
            },
            required: ['dispatchedDate', 'fromWhom', 'subject'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');

      // Ensure inwardNo and originalNo are populated
      if (!parsed.inwardNo && parsed.originalNo) {
        parsed.inwardNo = parsed.originalNo;
      } else if (!parsed.originalNo && parsed.inwardNo) {
        parsed.originalNo = parsed.inwardNo;
      }

      // Normalize date to YYYY-MM-DD
      if (parsed.dispatchedDate) {
        const normDate = normalizeDateToYYYYMMDD(parsed.dispatchedDate);
        if (normDate) parsed.dispatchedDate = normDate;
      }

      return parsed as ScannedLetterPayload;
    } catch (err: any) {
      lastError = err;
      console.log(`Model ${modelName} unavailable during letter scan, trying next candidate...`);
      // Short delay before fallback retry
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  throw lastError || new Error('All AI models failed to scan letter');
}

/**
 * Express / HTTP route handler for /api/scan-letter
 */
export async function scanLetterHandler(req: Request, res: Response): Promise<void> {
  try {
    const effectiveKey = (process.env.GEMINI_API_KEY || '').trim();

    // If API key is not configured on the server environment, handle gracefully without 500
    if (!effectiveKey || effectiveKey === 'MY_GEMINI_API_KEY') {
      res.json({
        success: false,
        apiKeyMissing: true,
        message: 'AI சேவையக API Key இணைக்கப்படவில்லை. கடிதப் புகைப்படம் இணைக்கப்பட்டுள்ளது, தகவல்களை நேரடியாக உள்ளிட்டு சேமிக்கலாம்.',
      });
      return;
    }

    const { imageBase64, mimeType } = req.body || {};

    if (!imageBase64) {
      res.status(400).json({ success: false, error: 'Image base64 data is required' });
      return;
    }

    const result = await scanLetterDocument({
      imageBase64,
      mimeType,
      apiKey: effectiveKey,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error in /api/scan-letter handler:', error?.message || error);

    const errMsg = String(error?.message || '');
    const isKeyOrAuthError =
      errMsg.includes('GEMINI_KEY_NOT_CONFIGURED') ||
      errMsg.includes('Method doesn\'t allow unregistered callers') ||
      errMsg.includes('PERMISSION_DENIED') ||
      errMsg.includes('API key not valid') ||
      errMsg.includes('API_KEY_INVALID') ||
      error?.status === 'PERMISSION_DENIED' ||
      error?.code === 403;

    if (isKeyOrAuthError) {
      res.json({
        success: false,
        apiKeyMissing: true,
        message: 'AI சேவையக அங்கீகாரம் கிடைக்கவில்லை. கடிதப் புகைப்படம் இணைக்கப்பட்டுள்ளது, தகவல்களை நேரடியாக உள்ளிட்டு சேமிக்கலாம்.',
      });
      return;
    }

    const isBusy =
      error?.status === 'UNAVAILABLE' ||
      error?.code === 503 ||
      errMsg.includes('503') ||
      errMsg.includes('overloaded');

    const errorMsg = isBusy
      ? 'AI சேவையகம் தற்போது அதிக சுமையில் உள்ளது. கடிதப் புகைப்படம் இணைக்கப்பட்டுள்ளது, தகவல்களை நேரடியாக உள்ளிட்டு சேமிக்கலாம்.'
      : 'கடிதப் புகைப்படம் இணைக்கப்பட்டுள்ளது. தகவல்களை நேரடியாக உள்ளிட்டு சேமிக்கலாம்.';

    res.json({
      success: false,
      error: errorMsg,
      message: errorMsg,
    });
  }
}

export default scanLetterHandler;
