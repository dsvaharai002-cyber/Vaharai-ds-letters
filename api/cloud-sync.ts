import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { OFFICIAL_APPS_SCRIPT_CODE, DEFAULT_DRIVE_FILE_ID } from '../src/data/appsScriptCode';

const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzbfOEJuI00Rkg5dg18mpPRKJN5j4-r2uKyK7hM2EUKmL3n417m14MxOTnQuplJ_GyzMw/exec';

const CONFIG_FILE = path.resolve(process.cwd(), 'cloud-config.json');

export interface CloudStorageConfig {
  storageMode: 'drive_json' | 'sheets';
  driveFileId: string;
  webAppUrl: string;
  updatedAt?: string;
}

// In-memory cache for fast read responses and zero delay
let cloudDataCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds cache

export const getStoredConfig = (): CloudStorageConfig => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        return {
          storageMode: data.storageMode === 'sheets' ? 'sheets' : 'drive_json',
          driveFileId: (data.driveFileId || DEFAULT_DRIVE_FILE_ID).trim(),
          webAppUrl: (data.webAppUrl || process.env.GOOGLE_SHEETS_WEB_APP_URL || DEFAULT_WEB_APP_URL).trim(),
          updatedAt: data.updatedAt,
        };
      }
    }
  } catch {
    // Ignore read errors
  }
  return {
    storageMode: 'drive_json',
    driveFileId: DEFAULT_DRIVE_FILE_ID,
    webAppUrl: (process.env.GOOGLE_SHEETS_WEB_APP_URL || DEFAULT_WEB_APP_URL).trim(),
  };
};

export const setStoredConfig = (partial: Partial<CloudStorageConfig>): CloudStorageConfig => {
  try {
    const current = getStoredConfig();
    const updated: CloudStorageConfig = {
      ...current,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('Failed to write cloud-config.json:', err);
    return getStoredConfig();
  }
};

/**
 * Downloads and parses Google Drive JSON file directly via Google's CDN with latency measurement.
 */
export async function fetchGoogleDriveJson(driveFileId: string): Promise<{
  ok: boolean;
  latencyMs: number;
  statusCode: number;
  uninitialized?: boolean;
  letters?: any[];
  users?: any[];
  updatedAt?: string;
  error?: string;
  message?: string;
  rawText?: string;
}> {
  const fileId = String(driveFileId || DEFAULT_DRIVE_FILE_ID).trim();
  const startTime = Date.now();

  const candidateUrls = [
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
  ];

  let lastError: any = null;

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'VaharaiDSMailSystem/2.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;
      const text = await res.text();

      // Check if file is private or inaccessible
      if (res.status === 403 || text.includes('accounts.google.com') || text.includes('You need access')) {
        return {
          ok: false,
          statusCode: 403,
          latencyMs,
          error: 'ACCESS_DENIED',
          message: 'Google Drive கோப்பிற்கான அனுமதி மறுக்கப்பட்டது. Drive-இல் General Access "Anyone with the link can edit/view" என அமைக்கப்பட்டிருக்க வேண்டும்.',
        };
      }

      const trimmed = text.trim();

      // Handle uninitialized / placeholder files such as "{ [ ] }" or empty
      if (!trimmed || trimmed === '{ [ ] }' || trimmed === '{[]}' || trimmed === '[]' || trimmed === '{}') {
        return {
          ok: true,
          statusCode: res.status,
          latencyMs,
          uninitialized: true,
          letters: [],
          users: [],
          rawText: trimmed,
          message: 'Google Drive JSON கோப்பு தயாராக உள்ளது (இன்னும் தகவல்கள் உள்ளிடப்படவில்லை).',
        };
      }

      // Try parsing JSON
      try {
        const parsed = JSON.parse(text);
        let letters: any[] = [];
        let users: any[] = [];

        if (Array.isArray(parsed)) {
          letters = parsed;
        } else if (parsed && typeof parsed === 'object') {
          letters = Array.isArray(parsed.letters) ? parsed.letters : [];
          users = Array.isArray(parsed.users) ? parsed.users : [];
        }

        return {
          ok: true,
          statusCode: 200,
          latencyMs,
          uninitialized: letters.length === 0 && users.length === 0,
          letters,
          users,
          updatedAt: parsed?.updatedAt,
          message: `Google Drive JSON கோப்பு வெற்றிகரமாக பெறப்பட்டது (${latencyMs}ms, ${letters.length} கடிதங்கள்).`,
        };
      } catch {
        // If file content is currently invalid JSON (e.g. malformed manual edits in Drive UI)
        return {
          ok: true,
          statusCode: 200,
          latencyMs,
          uninitialized: true,
          letters: [],
          users: [],
          rawText: trimmed,
          message: 'Drive கோப்பில் உள்ள தகவல்கள் புதிய வடிவில் புதுப்பிக்கப்பட வேண்டும் (Click "Upload to Drive").',
        };
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  return {
    ok: false,
    statusCode: 500,
    latencyMs: Date.now() - startTime,
    error: lastError?.message || 'Drive fetch failed',
    message: 'Google Drive இணைப்பில் பிழை ஏற்பட்டது. இணைய இணைப்பைச் சரிபார்க்கவும்.',
  };
}

/**
 * Tests connection to Google Apps Script Web App
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
          'Google Apps Script அனுமதி மறுக்கப்பட்டது (403 Forbidden). Web App Deploy அமைப்பில் "Who has access" என்பதை "Anyone" என அமைக்க வேண்டும்.',
      };
    }

    try {
      const json = JSON.parse(text);
      if (json && (json.ok !== undefined || json.status === 'connected' || json.result === 'success')) {
        return {
          ok: true,
          statusCode: 200,
          url: cleanUrl,
          message: 'Google Apps Script வெற்றிகரமாக இணைக்கப்பட்டுள்ளது!',
          data: json,
        };
      }
    } catch {
      if (res.status === 200) {
        return {
          ok: true,
          statusCode: 200,
          url: cleanUrl,
          message: 'Google Apps Script வெற்றிகரமாக பதிலளித்தது.',
        };
      }
    }

    return {
      ok: false,
      statusCode: res.status,
      errorType: 'INVALID_RESPONSE',
      url: cleanUrl,
      message: 'Google Apps Script பதில் செல்லுபடியாகவில்லை.',
    };
  } catch (err: any) {
    return {
      ok: false,
      statusCode: 500,
      errorType: 'NETWORK_ERROR',
      url: cleanUrl,
      message: `Apps Script இணைப்பு தோல்வி: ${err?.message || 'Network error'}`,
    };
  }
}

export default async function handler(req: Request, res: Response): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Web-App-Url, X-Drive-File-Id, X-Storage-Mode');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const config = getStoredConfig();
  const effectiveMode = ((req.headers['x-storage-mode'] as string) || (req.query.mode as string) || config.storageMode || 'drive_json').trim();
  const effectiveDriveFileId = ((req.headers['x-drive-file-id'] as string) || (req.query.driveFileId as string) || config.driveFileId || DEFAULT_DRIVE_FILE_ID).trim();
  const effectiveWebAppUrl = ((req.headers['x-web-app-url'] as string) || (req.query.webAppUrl as string) || config.webAppUrl || DEFAULT_WEB_APP_URL).trim();

  // Test Google Drive JSON Speed & Status Endpoint
  if (req.query.type === 'test_drive') {
    const driveResult = await fetchGoogleDriveJson(effectiveDriveFileId);
    res.status(200).json({
      ok: driveResult.ok,
      mode: 'drive_json',
      driveFileId: effectiveDriveFileId,
      latencyMs: driveResult.latencyMs,
      statusCode: driveResult.statusCode,
      uninitialized: driveResult.uninitialized,
      letterCount: driveResult.letters?.length ?? 0,
      userCount: driveResult.users?.length ?? 0,
      message: driveResult.message,
    });
    return;
  }

  // Get Stored Cloud Storage Config Endpoint
  if (req.query.type === 'get_config') {
    res.status(200).json({
      ok: true,
      config: getStoredConfig(),
    });
    return;
  }

  // Get Official Apps Script Code Endpoint
  if (req.query.type === 'get_script') {
    res.status(200).json({
      ok: true,
      code: OFFICIAL_APPS_SCRIPT_CODE,
      driveFileId: effectiveDriveFileId,
    });
    return;
  }

  // Test / Diagnosis Endpoint
  if (req.query.type === 'test' || req.query.type === 'status') {
    if (effectiveMode === 'drive_json') {
      const driveTest = await fetchGoogleDriveJson(effectiveDriveFileId);
      res.status(200).json({
        ok: driveTest.ok,
        mode: 'drive_json',
        latencyMs: driveTest.latencyMs,
        statusCode: driveTest.statusCode,
        message: driveTest.message,
        letterCount: driveTest.letters?.length ?? 0,
      });
      return;
    } else {
      const testResult = await testConnection(effectiveWebAppUrl);
      res.status(200).json(testResult);
      return;
    }
  }

  // GET: Fetch letters and users
  if (req.method === 'GET') {
    const forceFresh = req.query.force === 'true' || req.query.fresh === 'true';

    // 1. FAST GOOGLE DRIVE JSON MODE (~0.3s)
    if (effectiveMode === 'drive_json') {
      if (!forceFresh && cloudDataCache && Date.now() - cloudDataCache.timestamp < CACHE_TTL_MS) {
        res.status(200).json({ ok: true, cached: true, ...cloudDataCache.data });
        return;
      }

      const driveRes = await fetchGoogleDriveJson(effectiveDriveFileId);

      // If valid data exists in Google Drive
      if (driveRes.ok && (driveRes.letters?.length || driveRes.users?.length)) {
        const payload = {
          ok: true,
          mode: 'drive_json',
          source: 'drive_json',
          latencyMs: driveRes.latencyMs,
          letters: driveRes.letters || [],
          users: driveRes.users || [],
          updatedAt: driveRes.updatedAt,
        };
        cloudDataCache = { data: payload, timestamp: Date.now() };
        res.status(200).json(payload);
        return;
      }

      // If drive file is empty/uninitialized, inform client so it preserves local baseline
      if (driveRes.ok && driveRes.uninitialized) {
        res.status(200).json({
          ok: true,
          mode: 'drive_json',
          source: 'drive_json',
          uninitialized: true,
          latencyMs: driveRes.latencyMs,
          letters: [],
          users: [],
          message: 'Google Drive JSON கோப்பு தயார் நிலையில் உள்ளது. உள்ளூர் தகவல்களைப் பதிவேற்றலாம்.',
        });
        return;
      }
    }

    // 2. GOOGLE SHEETS FALLBACK
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000);

    try {
      const response = await fetch(`${effectiveWebAppUrl}?type=get_all&t=${Date.now()}`, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const rawText = await response.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = {};
      }

      res.status(200).json({
        ok: Boolean(data?.ok || data?.letters),
        mode: 'sheets',
        source: 'sheets',
        ...data,
      });
      return;
    } catch (err: any) {
      clearTimeout(timeout);
      res.status(200).json({
        ok: false,
        offline: true,
        message: err?.message || 'Fetch failed',
        letters: [],
        users: [],
      });
      return;
    }
  }

  // POST: Write letter, save config, or bulk upload to Drive JSON
  if (req.method === 'POST') {
    cloudDataCache = null; // Invalidate cache

    // Action: Save Cloud Storage Config
    if (req.body?.action === 'SET_CONFIG' || req.body?.action === 'SET_CONFIG_URL') {
      const updated = setStoredConfig({
        storageMode: req.body.storageMode || (req.body.url ? 'sheets' : undefined),
        driveFileId: req.body.driveFileId,
        webAppUrl: req.body.url || req.body.webAppUrl,
      });
      res.status(200).json({ ok: true, config: updated });
      return;
    }

    // Action: Test Drive Connection via POST
    if (req.body?.action === 'TEST_DRIVE') {
      const driveRes = await fetchGoogleDriveJson(req.body.driveFileId || effectiveDriveFileId);
      res.status(200).json(driveRes);
      return;
    }

    // Action: Bulk Sync All to Google Drive JSON
    if (req.body?.action === 'SYNC_ALL_TO_DRIVE') {
      const targetUrl = effectiveWebAppUrl;
      const targetDriveId = req.body.driveFileId || effectiveDriveFileId;

      try {
        const scriptRes = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'SYNC_ALL_TO_DRIVE',
            driveFileId: targetDriveId,
            letters: req.body.letters || [],
            users: req.body.users || [],
          }),
        });

        const resTxt = await scriptRes.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(resTxt);
        } catch {}

        res.status(200).json({
          ok: scriptRes.ok && (parsed?.ok !== false),
          driveFileId: targetDriveId,
          data: parsed,
          message: 'Google Drive JSON கோப்பில் (vaharai_ds_letter.json) அனைத்து தகவல்களும் வெற்றிகரமாகப் பதிவேற்றப்பட்டது!',
        });
        return;
      } catch (err: any) {
        res.status(200).json({
          ok: false,
          error: err?.message,
          message: `Drive-இல் சேமிக்க முடியவில்லை: ${err?.message}`,
        });
        return;
      }
    }

    // Standard Cloud Write (Relays to Google Apps Script with Drive ID attached)
    try {
      const payload = {
        ...req.body,
        driveFileId: effectiveDriveFileId,
        storageMode: effectiveMode,
      };

      const response = await fetch(effectiveWebAppUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      const resText = await response.text();
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(resText);
      } catch {}

      const isSuccess = response.ok && (parsedJson?.ok !== false);
      res.status(200).json({
        ok: isSuccess,
        data: parsedJson,
        message: isSuccess ? 'வெற்றிகரமாகப் பதிவு செய்யப்பட்டது' : parsedJson?.error || 'Sync failed',
      });
      return;
    } catch (err: any) {
      res.status(200).json({
        ok: false,
        error: err?.message,
        message: 'Google Cloud சேமிப்பில் பிழை ஏற்பட்டது',
      });
      return;
    }
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
}
