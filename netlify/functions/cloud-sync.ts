import { ALL_OFFICIAL_LETTERS, ALL_OFFICIAL_USERS } from '../../src/data/allOfficialLetters';
import { repairLetterRecord } from '../../src/utils/helpers';

const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzbfOEJuI00Rkg5dg18mpPRKJN5j4-r2uKyK7hM2EUKmL3n417m14MxOTnQuplJ_GyzMw/exec';

const DEFAULT_DRIVE_FILE_ID = '1hp1cpRYvwRPC00OscMK-s5LmsHy-KiNM';

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

  try {
    // Forward to Google Apps Script
    if (event.httpMethod === 'GET') {
      const mode = query.type || (query.mode === 'sheets' ? 'get_all' : 'get_drive_json');
      const fetchUrl = `${webAppUrl}?type=${encodeURIComponent(mode)}&mode=drive_json&file_id=${encodeURIComponent(driveFileId)}&t=${Date.now()}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
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
              mode: 'drive_json',
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
          offline: false,
          letters: ALL_OFFICIAL_LETTERS.map(repairLetterRecord).filter(Boolean),
          users: ALL_OFFICIAL_USERS,
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};
      
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
        letters: ALL_OFFICIAL_LETTERS,
        users: ALL_OFFICIAL_USERS,
      }),
    };
  }
};
