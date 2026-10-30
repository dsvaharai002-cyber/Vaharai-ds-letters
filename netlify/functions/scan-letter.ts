import { scanLetterDocument } from '../../api/scan-letter';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Image base64 data is required' }),
      };
    }

    const effectiveKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!effectiveKey || effectiveKey === 'MY_GEMINI_API_KEY') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          apiKeyMissing: true,
          message: 'Netlify தளத்தில் GEMINI_API_KEY சேர்க்கப்படவில்லை. Site configuration > Environment variables இல் GEMINI_API_KEY ஐ உள்ளிடவும். (AI Studio தளத்தில் இது ஏற்கனவே இயங்குகிறது).',
        }),
      };
    }

    const result = await scanLetterDocument({
      imageBase64,
      mimeType,
      apiKey: effectiveKey,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, data: result }),
    };
  } catch (err: any) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: err?.message || 'கடிதப் புகைப்படம் இணைக்கப்பட்டுள்ளது. தகவல்களை நேரடியாக உள்ளிட்டு சேமிக்கலாம்.',
      }),
    };
  }
};
