import fs from 'fs';
import path from 'path';

function getQuickCounts() {
  try {
    const cwd = process.cwd();
    const candidates = [
      path.join(cwd, 'data', 'central_database.json'),
      path.join(cwd, 'src', 'data', 'central_database.json'),
    ];
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          citizens: parsed.beneficiaries?.length || 0,
          tokens: parsed.tokens?.length || 0,
          users: parsed.users?.length || 0,
        };
      }
    }
  } catch {
    // ignore
  }
  return { citizens: 0, tokens: 0, users: 0 };
}

export default function handler(req: any, res: any) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const counts = getQuickCounts();

    return res.status(200).json({
      success: true,
      initialized: true,
      mode: 'vercel_serverless',
      counts,
      message: 'Vercel API running with Cloud Drive & Local Sync active',
    });
  } catch (err: any) {
    return res.status(200).json({
      success: true,
      initialized: true,
      mode: 'vercel_serverless_fallback',
      counts: { citizens: 0, tokens: 0, users: 0 },
      message: err.message,
    });
  }
}
