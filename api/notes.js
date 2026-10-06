export default async function handler(request, response) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return response.status(500).json({ error: 'Server storage is not configured' });
  const token = request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : '';
  if (!token) return response.status(401).json({ error: 'Authentication required' });
  try {
    const identity = await fetch(url + '/auth/v1/user', { headers: { apikey: key, Authorization: 'Bearer ' + token } });
    if (!identity.ok) return response.status(401).json({ error: 'Invalid authentication token' });
    const user = await identity.json();
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) { response.setHeader('Allow', 'GET, POST, PATCH, DELETE'); return response.status(405).json({ error: 'Method not allowed' }); }
    const query = request.method === 'GET' ? '?select=id,title,content,created_at&order=id' : '';
    const upstream = await fetch(url + '/rest/v1/notes' + query, { method: request.method, headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: request.method === 'GET' ? undefined : JSON.stringify({ ...(request.body || {}), owner_id: user.id }) });
    if (!upstream.ok) return response.status(502).json({ error: 'Storage request failed' });
    const notes = await upstream.json();
    return response.status(200).json({ notes });
  } catch { return response.status(502).json({ error: 'Authentication or storage request failed' }); }
}
