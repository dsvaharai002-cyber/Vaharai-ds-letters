import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzbfOEJuI00Rkg5dg18mpPRKJN5j4-r2uKyK7hM2EUKmL3n417m14MxOTnQuplJ_GyzMw/exec';

const CONFIG_FILE = path.resolve(process.cwd(), 'cloud-config.json');

export const getStoredWebAppUrl = (): string => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data.webAppUrl === 'string' && data.webAppUrl.trim()) {
        return data.webAppUrl.trim();
      }
    }
  } catch {
    // Ignore read errors
  }
  return (process.env.GOOGLE_SHEETS_WEB_APP_URL || DEFAULT_WEB_APP_URL).trim();
};

export const setStoredWebAppUrl = (url: string): void => {
  try {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify({ webAppUrl: url.trim(), updatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('Failed to write cloud-config.json:', err);
  }
};

/**
 * Tests connection to a Google Apps Script Web App URL and diagnoses permissions.
 */
async function testConnection(url: string) {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) {
    return {
      ok: false,
      statusCode: 400,
      errorType: 'MISSING_URL',
      url: '',
      message: 'Google Apps Script URL தேவை (URL is required).',
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(`${cleanUrl}?type=ping&t=${Date.now()}`, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text();

    // Check for Google Login redirect or 403 permission denied
    const isGoogleLogin =
      res.status === 403 ||
      text.includes('accounts.google.com') ||
      text.includes('You need access') ||
      text.includes('ServiceLogin') ||
      text.includes('Sign in - Google Accounts');

    if (isGoogleLogin) {
      return {
        ok: false,
        statusCode: 403,
        errorType: 'ACCESS_DENIED',
        url: cleanUrl,
        message:
          'Google Apps Script அனுமதி மறுக்கப்பட்டது (403 Forbidden / Access Denied). Web App Deploy அமைப்பில் "Who has access" என்பதை "Anyone" (அனைவருக்கும்) என அமைக்க வேண்டும்.',
      };
    }

    try {
      const json = JSON.parse(text);
      const isSuccess =
        json &&
        (json.ok !== undefined ||
          json.status === 'connected' ||
          json.result === 'success' ||
          json.result === 'ok' ||
          json.success === true ||
          Array.isArray(json.letters) ||
          (res.status === 200 && !json.error));

      if (isSuccess) {
        return {
          ok: true,
          statusCode: 200,
          url: cleanUrl,
          message: 'Google Sheets API வெற்றிகரமாக இணைக்கப்பட்டுள்ளது (Connected successfully)!',
          letterCount: Array.isArray(json.letters) ? Math.max(0, json.letters.length - 1) : undefined,
          data: json,
        };
      }
    } catch {
      // If it returned non-JSON text but valid 200 response
      if (res.status === 200 && (text.includes('success') || text.includes('connected') || text.includes('ok'))) {
        return {
          ok: true,
          statusCode: 200,
          url: cleanUrl,
          message: 'Google Sheets API வெற்றிகரமாக இணைக்கப்பட்டுள்ளது (Connected successfully)!',
        };
      }
    }

    // Secondary lightweight check: POST ping
    try {
      const postController = new AbortController();
      const postTimeout = setTimeout(() => postController.abort(), 15000);
      const postRes = await fetch(cleanUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'PING' }),
        signal: postController.signal,
      });
      clearTimeout(postTimeout);
      const postText = await postRes.text();
      const postJson = JSON.parse(postText);
      if (
        postJson &&
        (postJson.result === 'success' ||
          postJson.result === 'ok' ||
          postJson.ok ||
          postJson.success !== false ||
          (postRes.status === 200 && !postJson.error))
      ) {
        return {
          ok: true,
          statusCode: 200,
          url: cleanUrl,
          message: 'Google Sheets API வெற்றிகரமாக இணைக்கப்பட்டுள்ளது (Connected successfully)!',
          data: postJson,
        };
      }
    } catch {
      // POST fallback check failed
    }

    return {
      ok: false,
      statusCode: res.status,
      errorType: 'INVALID_RESPONSE',
      url: cleanUrl,
      message: 'Google Sheets Web App பதில் செல்லுபடியாகவில்லை (Valid response கிடைக்கவில்லை).',
    };
  } catch (err: any) {
    const isTimeout =
      err?.name === 'AbortError' ||
      String(err?.message || '').toLowerCase().includes('aborted') ||
      String(err?.message || '').toLowerCase().includes('timeout');

    return {
      ok: false,
      statusCode: isTimeout ? 504 : 500,
      errorType: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      url: cleanUrl,
      message: isTimeout
        ? 'கூகிள் சேவையக இணைப்பு நேரம் கடந்துவிட்டது (Timeout). Apps Script சர்வர் பதிலளிக்க அதிக நேரம் எடுத்தது. தயவுசெய்து சிறிது நேரம் கழித்து மீண்டும் சோதிக்கவும்.'
        : `கூகிள் சேவையக இணைப்பு தோல்வி: ${err?.message || 'Connection timeout or network failure'}`,
    };
  }
}

export default async function handler(req: Request, res: Response): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Web-App-Url');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Resolve target Google Apps Script URL: request header > query > body > config > default
  const customHeaderUrl = (req.headers['x-web-app-url'] as string) || '';
  const customQueryUrl = (req.query.webAppUrl as string) || '';
  const customBodyUrl = req.body?.customWebAppUrl || '';
  const resolvedUrl = (
    customHeaderUrl ||
    customQueryUrl ||
    customBodyUrl ||
    getStoredWebAppUrl()
  ).trim();

  // Test / Diagnosis Endpoint
  if (req.query.type === 'test' || req.query.type === 'status') {
    const testResult = await testConnection(resolvedUrl);
    res.status(200).json(testResult);
    return;
  }

  // Get Config URL Endpoint
  if (req.query.type === 'get_config') {
    res.status(200).json({
      ok: true,
      url: getStoredWebAppUrl(),
      isDefault: getStoredWebAppUrl() === DEFAULT_WEB_APP_URL,
    });
    return;
  }

  // GET: Fetch letters and users from Google Sheets
  if (req.method === 'GET') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(`${resolvedUrl}?type=get_all&t=${Date.now()}`, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const rawText = await response.text();

      // Check if redirected to Google sign-in or 403 Forbidden
      const isAccessDenied =
        response.status === 403 ||
        rawText.includes('accounts.google.com') ||
        rawText.includes('You need access') ||
        rawText.includes('ServiceLogin');

      if (isAccessDenied) {
        res.status(200).json({
          ok: false,
          offline: true,
          statusCode: 403,
          errorType: 'ACCESS_DENIED',
          message:
            'Google Apps Script 403 Forbidden: Apps Script Web App Deploy அமைப்பில் "Who has access" என்பதை "Anyone" (அனைவருக்கும்) என அமைக்க வேண்டும்.',
          letters: [],
          users: [],
        });
        return;
      }

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        res.status(200).json({
          ok: false,
          offline: true,
          statusCode: response.status,
          errorType: 'NON_JSON_RESPONSE',
          message: 'Google Sheets பதில் JSON வடிவில் இல்லை.',
          letters: [],
          users: [],
        });
        return;
      }

      res.status(200).json({ ok: true, ...data });
      return;
    } catch (err: any) {
      clearTimeout(timeout);
      const isTimeout =
        err?.name === 'AbortError' ||
        String(err?.message || '').toLowerCase().includes('aborted');

      res.status(200).json({
        ok: false,
        offline: true,
        statusCode: isTimeout ? 504 : 500,
        errorType: isTimeout ? 'TIMEOUT' : 'FETCH_ERROR',
        message: isTimeout
          ? 'Google Sheets தகவல்கள் பெற அதிக நேரம் எடுத்தது (Timeout). இணைய இணைப்பைச் சோதிக்கவும்.'
          : err?.message || 'Google Sheets fetch timeout',
        letters: [],
        users: [],
      });
      return;
    }
  }

  // POST: Write letter, update status, batch sync, or configure URL
  if (req.method === 'POST') {
    // Action: Set Config URL
    if (req.body?.action === 'SET_CONFIG_URL' && req.body?.url) {
      const newUrl = String(req.body.url).trim();
      setStoredWebAppUrl(newUrl);
      const testRes = await testConnection(newUrl);
      res.status(200).json({ ok: true, url: newUrl, test: testRes });
      return;
    }

    // Action: Test Connection via POST
    if (req.body?.action === 'TEST_CONNECTION') {
      const testResult = await testConnection(resolvedUrl);
      res.status(200).json(testResult);
      return;
    }

    // Action: Data push (ADD_LETTER, UPDATE_LETTER, BATCH_ADD_LETTERS, etc.)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

      const response = await fetch(resolvedUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: bodyStr,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const resText = await response.text();

      // Check for Google Access Denied / Login screen
      const isAccessDenied =
        response.status === 403 ||
        resText.includes('accounts.google.com') ||
        resText.includes('You need access') ||
        resText.includes('ServiceLogin');

      if (isAccessDenied) {
        res.status(200).json({
          ok: false,
          statusCode: 403,
          errorType: 'ACCESS_DENIED',
          message:
            'Google Apps Script 403 Forbidden: Apps Script அமைப்பில் "Who has access" என்பதை "Anyone" (அனைவருக்கும்) என அமைக்க வேண்டும்.',
        });
        return;
      }

      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(resText);
      } catch {
        // Plain text response from script
      }

      const hasError =
        Boolean(parsedJson?.error) ||
        parsedJson?.result === 'error' ||
        parsedJson?.status === 'error' ||
        parsedJson?.ok === false ||
        parsedJson?.success === false;

      const isSuccess = response.ok && !hasError;

      res.status(200).json({
        ok: isSuccess,
        statusCode: response.status,
        data: parsedJson,
        message: isSuccess
          ? 'Google Sheet-இல் வெற்றிகரமாகப் பதிவு செய்யப்பட்டது'
          : parsedJson?.error || 'Sheet sync failed',
      });
      return;
    } catch (err: any) {
      clearTimeout(timeout);
      res.status(200).json({
        ok: false,
        statusCode: 504,
        errorType: 'TIMEOUT',
        message: `Google Apps Script நேரம் கடந்துவிட்டது அல்லது நெட்வொர்க் பிழை (${err?.message || 'Timeout'})`,
      });
      return;
    }
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
}
