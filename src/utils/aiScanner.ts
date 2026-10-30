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
  const payload = JSON.stringify({ imageBase64, mimeType });
  const headers = { 'Content-Type': 'application/json' };

  // Try standard Express route /api/scan-letter, then Netlify functions route if 404
  const endpoints = ['/api/scan-letter', '/.netlify/functions/scan-letter'];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: payload,
      });

      if (response.status === 404) {
        // Try next candidate endpoint (e.g. Netlify serverless)
        continue;
      }

      const resJson = await response.json().catch(() => ({}));
      if (!response.ok || !resJson.success) {
        return {
          success: false,
          apiKeyMissing: Boolean(resJson.apiKeyMissing),
          error:
            resJson.message ||
            resJson.error ||
            'கடிதப் புகைப்படம் இணைக்கப்பட்டுள்ளது. தகவல்களை நேரடியாக உள்ளிட்டு சேமிக்கலாம்.',
        };
      }

      return {
        success: true,
        data: resJson.data,
      };
    } catch {
      // Try next endpoint on network issue
    }
  }

  return {
    success: false,
    error: 'கடிதப் புகைப்படம் இணைக்கப்பட்டுள்ளது. தகவல்களை நேரடியாக உள்ளிட்டு சேமிக்கலாம்.',
  };
}
