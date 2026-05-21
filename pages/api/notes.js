import { createSign } from 'crypto';

let cachedNotes = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, 'base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${payload}.${signature}`,
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description || 'Failed to get access token');
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const now = Date.now();
    if (cachedNotes && now - cacheTimestamp < CACHE_TTL_MS) {
      return res.status(200).json({ notes: cachedNotes });
    }

    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetTab = process.env.GOOGLE_SHEET_TAB || 'Sheet1';

    if (!privateKey || !clientEmail || !sheetId) {
      return res.status(500).json({ error: 'Missing environment variables.' });
    }

    const token = await getAccessToken(clientEmail, privateKey);

    const range = encodeURIComponent(`${sheetTab}!A:F`);
    const sheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { values: rows } = await sheetRes.json();

    if (!rows || rows.length < 2) return res.status(200).json({ notes: [] });

    const headers = rows[0].map(h => h.trim().toLowerCase());
    const col = name => {
      const exact = headers.findIndex(h => h === name);
      return exact !== -1 ? exact : headers.findIndex(h => h.includes(name));
    };

    const typeCol   = col('annotation type') !== -1 ? col('annotation type') : col('type');
    const annotCol  = col('annotation') !== -1 ? col('annotation') : 2;
    const bookCol   = col('book');
    const authorCol = col('author');

    const notes = rows.slice(1)
      .map(row => ({
        type:       (row[typeCol]   || '').trim(),
        annotation: (row[annotCol]  || '').trim(),
        book:       (row[bookCol]   || '').trim(),
        author:     (row[authorCol] || '').trim(),
      }))
      .filter(n => n.annotation && n.book);

    cachedNotes = notes;
    cacheTimestamp = now;

    return res.status(200).json({ notes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to fetch notes' });
  }
}
