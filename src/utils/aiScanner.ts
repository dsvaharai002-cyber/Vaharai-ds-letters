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
      return {
        success: false,
        error: 'கடிதப் புகைப்படம் இணைக்கப்பட்டுள்ளது. தகவல்களை நேரடியாக உள்ளிட்டு சேமிக்கலாம்.',
      };
    }

    const resJson = await response.json().catch(() => ({}));
    if (!resJson.success) {
      return {
        success: false,
        apiKeyMissing: Boolean(resJson.apiKeyMissing),
        error: resJson.message || 'கடிதப் புகைப்படம் இணைக்கப்பட்டுள்ளது. தகவல்களை நேரடியாக உள்ளிட்டு சேமிக்கலாம்.',
      };
    }

    return {
      success: true,
      data: resJson.data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: 'கடிதப் புகைப்படம் இணைக்கப்பட்டுள்ளது. தகவல்களை நேரடியாக உள்ளிட்டு சேமிக்கலாம்.',
    };
  }
}
