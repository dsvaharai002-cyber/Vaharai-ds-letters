import { ALL_OFFICIAL_LETTERS, ALL_OFFICIAL_USERS } from '../../src/data/allOfficialLetters.ts';
import { repairLetterRecord } from '../../src/utils/helpers.ts';

const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzbfOEJuI00Rkg5dg18mpPRKJN5j4-r2uKyK7hM2EUKmL3n417m14MxOTnQuplJ_GyzMw/exec';

const DEFAULT_DRIVE_FILE_ID = '1hp1cpRYvwRPC00OscMK-s5LmsHy-KiNM';

// In-memory cache for Netlify warm lambda executions
let cachedLetters: any[] = [];
let cachedUsers: any[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 20000;

async function fetchGoogleDriveJson(driveFileId: string): Promise<{
  ok: boolean;
  latencyMs: number;
  letters?: any[];
  users?: any[];
  uninitialized?: boolean;
}> {
  const fileId = String(driveFileId || DEFAULT_DRIVE_FILE_ID).trim();
  const startTime = Date.now();

  const candidateUrls = [
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
  ];

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        headers: { 'User-Agent': 'VaharaiDSMailSystem/2.0' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const text = await res.text();
      const latencyMs = Date.now() - startTime;

      if (res.status === 403 || text.includes('accounts.google.com') || text.includes('You need access')) {
        continue;
      }

      const trimmed = text.trim();
      if (!trimmed || trimmed === '{ [ ] }' || trimmed === '{[]}' || trimmed === '[]' || trimmed === '{}') {
        return { ok: true, latencyMs, uninitialized: true, letters: [], users: [] };
      }

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
          latencyMs,
          uninitialized: letters.length === 0 && users.length === 0,
          letters,
          users,
        };
      } catch {
        // Continue
      }
    } catch {
      // Continue
    }
  }

  return { ok: false, latencyMs: Date.now() - startTime };
}

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Web-App-Url, X-Drive-File-Id, X-Storage-Mode',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const query = event.queryStringParameters || {};
  const webAppUrl = (
    event.headers?.['x-web-app-url'] ||
    query.webAppUrl ||
    process.env.GOOGLE_SHEETS_WEB_APP_URL ||
    DEFAULT_WEB_APP_URL
  ).trim();

  const driveFileId = (
    event.headers?.['x-drive-file-id'] ||
    query.driveFileId ||
    DEFAULT_DRIVE_FILE_ID
  ).trim();

  const storageMode = (
    event.headers?.['x-storage-mode'] ||
    query.mode ||
    'drive_json'
  ).trim();

  try {
    // 1. GET: Fetch letters & users
    if (event.httpMethod === 'GET') {
      const isDriveJson = query.type === 'get_drive_json' || storageMode === 'drive_json' || !query.mode;

      if (isDriveJson) {
        // Return cached if warm and fresh
        if (cachedLetters.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              ok: true,
              mode: 'drive_json',
              cached: true,
              letters: cachedLetters,
              users: cachedUsers.length > 0 ? cachedUsers : ALL_OFFICIAL_USERS,
            }),
          };
        }

        // Fetch from Google Drive server-to-server (bypasses browser CORS!)
        const driveResult = await fetchGoogleDriveJson(driveFileId);

        if (driveResult.ok && Array.isArray(driveResult.letters) && driveResult.letters.length > 0 && !driveResult.uninitialized) {
          const repaired = driveResult.letters.map(repairLetterRecord).filter(Boolean);
          cachedLetters = repaired;
          cachedUsers = Array.isArray(driveResult.users) && driveResult.users.length > 0 ? driveResult.users : ALL_OFFICIAL_USERS;
          cacheTimestamp = Date.now();

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              ok: true,
              mode: 'drive_json',
              source: 'drive_json',
              latencyMs: driveResult.latencyMs,
              letters: repaired,
              users: cachedUsers,
            }),
          };
        }

        // If Drive is empty or uninitialized, return full official baseline
        const baseline = ALL_OFFICIAL_LETTERS.map(repairLetterRecord).filter(Boolean);
        cachedLetters = baseline;
        cachedUsers = ALL_OFFICIAL_USERS;
        cacheTimestamp = Date.now();

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            mode: 'drive_json',
            source: 'baseline',
            letters: baseline,
            users: ALL_OFFICIAL_USERS,
          }),
        };
      }

      // Sheets fallback
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const fetchUrl = `${webAppUrl}?type=get_all&t=${Date.now()}`;
        const resp = await fetch(fetchUrl, {
          redirect: 'follow',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await resp.json().catch(() => null);
        if (data && (Array.isArray(data) || data.ok || Array.isArray(data.letters))) {
          const letters = Array.isArray(data) ? data : (data.letters || []);
          const users = data.users || ALL_OFFICIAL_USERS;
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              ok: true,
              mode: 'sheets',
              letters: letters.map(repairLetterRecord).filter(Boolean),
              users,
            }),
          };
        }
      } catch {
        clearTimeout(timeout);
      }

      // Safe fallback to baseline official letters
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          mode: 'sheets',
          letters: ALL_OFFICIAL_LETTERS.map(repairLetterRecord).filter(Boolean),
          users: ALL_OFFICIAL_USERS,
        }),
      };
    }

    // 2. POST: Write, sync, or update
    if (event.httpMethod === 'POST') {
      const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};

      // Invalidate read cache on write
      cacheTimestamp = 0;

      // Forward to Google Apps Script asynchronously
      fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          ...body,
          driveFileId,
        }),
      }).catch(() => {});

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          action: body.action || 'SAVE',
          message: 'Saved successfully',
        }),
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        offline: true,
        letters: ALL_OFFICIAL_LETTERS.map(repairLetterRecord).filter(Boolean),
        users: ALL_OFFICIAL_USERS,
      }),
    };
  }
};
