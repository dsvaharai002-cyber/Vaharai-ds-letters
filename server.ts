import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import scanLetterHandler from './api/scan-letter.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Support base64 image uploads from camera / file picker
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Mount modular AI letter scan endpoint
app.post('/api/scan-letter', scanLetterHandler);

const WEB_APP_URL =
  process.env.GOOGLE_SHEETS_WEB_APP_URL ||
  'https://script.google.com/macros/s/AKfycbzbfOEJuI00Rkg5dg18mpPRKJN5j4-r2uKyK7hM2EUKmL3n417m14MxOTnQuplJ_GyzMw/exec';

app.get('/api/cloud-sync', async (_req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`${WEB_APP_URL}?type=get_all&t=${Date.now()}`, {
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
});

app.post('/api/cloud-sync', async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(req.body ?? {}),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.status(200).json({ ok: response.ok || response.status === 302 });
  } catch {
    clearTimeout(timeout);
    return res.status(200).json({ ok: false, offline: true });
  }
});

// Mount Vite middleware in development or serve static in production
const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`DS Office Mail Server running on http://0.0.0.0:${PORT}`);
});
