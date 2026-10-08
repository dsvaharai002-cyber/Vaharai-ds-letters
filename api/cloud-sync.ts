const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzbfOEJuI00Rkg5dg18mpPRKJN5j4-r2uKyK7hM2EUKmL3n417m14MxOTnQuplJ_GyzMw/exec';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const webAppUrl = process.env.GOOGLE_SHEETS_WEB_APP_URL || DEFAULT_WEB_APP_URL;

  if (req.method === 'GET') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(`${webAppUrl}?type=get_all&t=${Date.now()}`, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        return res.status(200).json({ ok: false, offline: true, letters: [], users: [] });
      }
      const data = await response.json();
      return res.status(200).json({ ok: true, ...data });
    } catch {
      clearTimeout(timeout);
      return res.status(200).json({ ok: false, offline: true, letters: [], users: [] });
    }
  }

  if (req.method === 'POST') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const bodyStr =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
      const response = await fetch(webAppUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: bodyStr,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.status(200).json({ ok: response.ok || response.status === 302 });
    } catch {
      clearTimeout(timeout);
      return res.status(200).json({ ok: false, offline: true });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
