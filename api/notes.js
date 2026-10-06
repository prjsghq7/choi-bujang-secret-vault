import { createLoginVerifier } from '../src/verify-login.mjs';

const verifierConfig = {
  judgeIssuer: 'https://aleph-judge-production.up.railway.app/defense/judge',
  publicAppUrl: 'https://choi-bujang-secret-vault-navy.vercel.app',
  identityProvider: { issuer: 'https://ybaymbdaagpiqfwytkld.supabase.co/auth/v1', audience: 'authenticated', jwksUrl: 'https://ybaymbdaagpiqfwytkld.supabase.co/auth/v1/.well-known/jwks.json' },
};

function notePayload(body) {
  const payload = {};
  if (typeof body?.title === 'string') payload.title = body.title.trim();
  if (typeof body?.content === 'string') payload.content = body.content.trim();
  return payload;
}

export default async function handler(request, response) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return response.status(500).json({ error: 'Server storage is not configured' });
  const authorization = request.headers.authorization ?? '';
  if (!authorization.startsWith('Bearer ')) return response.status(401).json({ error: 'Authentication required' });
  try {
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) { response.setHeader('Allow', 'GET, POST, PATCH, DELETE'); return response.status(405).json({ error: 'Method not allowed' }); }
    const verify = createLoginVerifier({ config: verifierConfig, supabaseSecretKey: key });
    const identity = await verify(authorization);
    if (!identity) return response.status(401).json({ error: 'Invalid authentication token' });
    const ownerId = encodeURIComponent(identity.userId);
    const headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const body = request.body && typeof request.body === 'object' ? request.body : {};
    let endpoint = url + '/rest/v1/notes';
    let payload;
    if (request.method === 'GET') endpoint += `?select=id,title,content,created_at&owner_id=eq.${ownerId}&order=id`;
    else if (request.method === 'POST') {
      payload = notePayload(body);
      if (!payload.title || !payload.content) return response.status(400).json({ error: 'Title and content are required' });
      payload.owner_id = identity.userId;
    } else {
      const id = body.id ?? new URL(request.url, 'https://local.invalid').searchParams.get('id');
      if (!/^[0-9]+$/.test(String(id ?? ''))) return response.status(400).json({ error: 'A numeric note id is required' });
      endpoint += `?id=eq.${encodeURIComponent(id)}&owner_id=eq.${ownerId}`;
      if (request.method === 'PATCH') {
        payload = notePayload(body);
        if (!Object.keys(payload).length) return response.status(400).json({ error: 'A title or content is required' });
      }
    }
    const upstream = await fetch(endpoint, { method: request.method, headers, body: payload ? JSON.stringify(payload) : undefined });
    if (!upstream.ok) return response.status(502).json({ error: 'Storage request failed' });
    const notes = await upstream.json();
    return response.status(200).json({ notes });
  } catch { return response.status(502).json({ error: 'Authentication or storage request failed' }); }
}
