import { attachRequestId } from '../src/device-auth.mjs';

export default async function handler(request, response) {
  attachRequestId(request, response);
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); return response.status(405).json({ error: 'Method not allowed' }); }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  const { email, password } = request.body || {};
  if (!url || !key) return response.status(500).json({ error: 'Server auth is not configured' });
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) return response.status(400).json({ error: 'Email and password are required' });
  try {
    const upstream = await fetch(url + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await upstream.json();
    if (!upstream.ok) return response.status(401).json({ error: 'Invalid login' });
    // Only the short-lived access token is returned; no profile or refresh token reaches the page.
    return response.status(200).json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch { return response.status(502).json({ error: 'Auth request failed' }); }
}
