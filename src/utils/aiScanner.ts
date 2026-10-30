export interface ScannedLetterData {
  dispatchedDate?: string;
  originalNo?: string;
  inwardNo?: string;
  letterNo?: string;
  fromWhom?: string;
  subject?: string;
  registeredPostNo?: string;
  postType?: string;
  suggestedDivision?: string;
  summary?: string;
}

export interface ScanResult {
  success: boolean;
  data?: ScannedLetterData;
  error?: string;
  apiKeyMissing?: boolean;
}

/**
 * Sends letter image to backend Gemini OCR scanner with automatic fallback
 */
export async function scanLetterWithAI(
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<ScanResult> {
  try {
    const response = await fetch('/api/scan-letter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        mimeType,
      }),
    });

    if (!response.ok) {
      let errMsg = 'கடிதத்தை ஸ்கேன் செய்வதில் தாமதம் ஏற்பட்டுள்ளது. தகவல்களை நேரடியாக உள்ளிட்டு சேமிக்கலாம்.';
      try {
        const errJson = await response.json();
        if (errJson?.message || errJson?.error) {
          errMsg = errJson.message || errJson.error;
        }
      } catch {
        if (response.status === 404) {
          errMsg = 'AI சேவையக முனை (/api/scan-letter) இணைக்கப்படவில்லை. சேவையகம் இயங்குகிறதா என பார்க்கவும்.';
        }
      }
      return {
        success: false,
        error: errMsg,
      };
    }

    const resJson = await response.json().catch(() => ({}));
    if (!resJson.success) {
      return {
        success: false,
        apiKeyMissing: Boolean(resJson.apiKeyMissing),
        error: resJson.message || resJson.error || 'கடிதப் புகைப்படம் இணைக்கப்பட்டுள்ளது. தகவல்களை நேரடியாக உள்ளிட்டு சேமிக்கலாம்.',
      };
    }

    return {
      success: true,
      data: resJson.data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'கடிதப் புகைப்படம் இணைக்கப்பட்டுள்ளது. தகவல்களை நேரடியாக உள்ளிட்டு சேமிக்கலாம்.',
    };
  }
}
