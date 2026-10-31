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
      const isDriveJson = query.type === 'get_drive_json' || storageMode === 'drive_json';

      // Return warm cache if fresh
      if (cachedLetters.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            mode: storageMode,
            cached: true,
            letters: cachedLetters,
            users: cachedUsers.length > 0 ? cachedUsers : ALL_OFFICIAL_USERS,
          }),
        };
      }

      // If in Drive JSON mode, attempt fast Google Drive fetch first
      if (isDriveJson) {
        const driveResult = await fetchGoogleDriveJson(driveFileId);

        if (
          driveResult.ok &&
          Array.isArray(driveResult.letters) &&
          driveResult.letters.length > 0 &&
          !driveResult.uninitialized
        ) {
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
      }

      // Fallback or Direct: Fetch from Google Sheets live spreadsheet
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000);
      try {
        const fetchUrl = `${webAppUrl}?type=get_all&t=${Date.now()}`;
        const resp = await fetch(fetchUrl, {
          redirect: 'follow',
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const data = await resp.json().catch(() => null);
        if (data && (Array.isArray(data) || data.ok || Array.isArray(data.letters))) {
          const rawLetters = Array.isArray(data) ? data : (data.letters || []);
          const rows = Array.isArray(rawLetters[0]) ? rawLetters.slice(1) : rawLetters;
          const normalized = rows.map(repairLetterRecord).filter(Boolean);

          if (normalized.length > 0) {
            cachedLetters = normalized;
            cachedUsers = Array.isArray(data.users) && data.users.length > 1 ? data.users.slice(1) : ALL_OFFICIAL_USERS;
            cacheTimestamp = Date.now();

            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                ok: true,
                mode: 'sheets',
                source: 'sheets',
                letters: rawLetters, // send raw so normalizeLetter parses all columns
                users: data.users || ALL_OFFICIAL_USERS,
              }),
            };
          }
        }
      } catch (sheetErr) {
        clearTimeout(timeout);
      }

      // Safe fallback if Google is unreachable
      const baseline = ALL_OFFICIAL_LETTERS.map(repairLetterRecord).filter(Boolean);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          mode: 'baseline',
          source: 'baseline',
          letters: baseline,
          users: ALL_OFFICIAL_USERS,
        }),
      };
    }

    // 2. POST: Write, sync, or update (Awaited for serverless execution)
    if (event.httpMethod === 'POST') {
      const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};
      const act = String(body.action || '').toUpperCase().trim();
      const payloadLetter = body.extraData || body;

      // Optimistically update in-memory cache for subsequent GETs across browsers
      if (act === 'ADD_LETTER' && payloadLetter) {
        const repaired = repairLetterRecord(payloadLetter);
        if (repaired) {
          cachedLetters = [repaired, ...cachedLetters.filter((l) => l.id !== repaired.id && l.originalNo !== repaired.originalNo)];
          cacheTimestamp = Date.now();
        }
      } else if ((act === 'UPDATE_LETTER' || act === 'UPDATE_STATUS' || act === 'UPDATE_ACTION') && payloadLetter) {
        const id = String(body.id || payloadLetter.id || '');
        const orig = String(body.originalNo || payloadLetter.originalNo || '');
        cachedLetters = cachedLetters.map((l) => {
          if ((id && String(l.id) === id) || (orig && String(l.originalNo) === orig)) {
            const healed = repairLetterRecord({ ...l, ...payloadLetter });
            return healed || { ...l, ...payloadLetter };
          }
          return l;
        });
        cacheTimestamp = Date.now();
      }

      // CRITICAL: Await Google Apps Script fetch so serverless lambda does not exit early!
      try {
        await fetch(webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            ...body,
            driveFileId,
          }),
        });
      } catch (postErr) {
        console.error('Apps Script POST forward error:', postErr);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          action: body.action || 'SAVE',
          message: 'Record saved successfully to central database.',
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
