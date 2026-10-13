import { createLoginVerifier } from '../src/verify-login.mjs';
import { contentHash } from '../src/restore.mjs';
import { captureNoteBackup } from '../src/note-backup.mjs';
import { decideNotesRequest, verifyDeviceRequest } from '../src/device-auth.mjs';

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
    // 11단계: every protected request must be signed by a server-approved device key, then pass decide().
    const device = await verifyDeviceRequest(request, identity, { url, key });
    if (!device.ok) return response.status(device.status).json({ error: 'Approved device signature required', reason: device.reason });
    const rawQuery = new URL(request.url, 'https://local.invalid').search.replace(/^\?/u, '');
    const rawId = request.body?.id ?? new URL(request.url, 'https://local.invalid').searchParams.get('id');
    const noteId = request.method === 'POST' || rawId === null || rawId === undefined ? null : String(rawId);
    const verdict = await decideNotesRequest({ identity, deviceId: device.deviceId, deviceRegistered: device.deviceRegistered,
      method: request.method, noteId: noteId !== null && /^[0-9]+$/u.test(noteId) ? noteId : noteId === null ? null : 'invalid', query: rawQuery });
    if (verdict.decision !== 'allow') return response.status(403).json({ error: 'Request denied by policy', reason: verdict.reasonCode });
    const ownerId = encodeURIComponent(identity.userId);
    const headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const body = request.body && typeof request.body === 'object' ? request.body : {};
    const query = new URL(request.url, 'https://local.invalid').searchParams;
    if ([...query.keys()].some(name => name !== 'id')) return response.status(400).json({ error: 'Resource selection must use a note id' });
    let endpoint = url + '/rest/v1/notes';
    let payload;
    if (request.method === 'GET') {
      const requestedId = query.get('id');
      if (requestedId === null) return response.status(403).json({ error: 'A resource id is required' });
      if (requestedId !== null && !/^[0-9]+$/.test(requestedId)) return response.status(400).json({ error: 'A numeric note id is required' });
      endpoint += `?select=id,title,content,created_at,owner_id&id=eq.${encodeURIComponent(requestedId)}&owner_id=eq.${ownerId}`;
    }
    else if (request.method === 'POST') {
      payload = notePayload(body);
      if (!payload.title || !payload.content) return response.status(400).json({ error: 'Title and content are required' });
      payload.owner_id = identity.userId;
    } else {
      const id = body.id ?? query.get('id');
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
    if (!Array.isArray(notes)) return response.status(502).json({ error: 'Storage response was invalid' });
    if (notes.some(note => note?.owner_id !== identity.userId)) {
      return response.status(403).json({ error: 'Resource owner mismatch' });
    }
    // The verified backup is taken once, at creation; later edits never replace it.
    if (request.method === 'POST') await Promise.all(notes.map(note => captureNoteBackup(url, key, note)));
    if (Array.isArray(notes) && notes.length === 0 && request.method !== 'POST') {
      return response.status(404).json({ error: 'Note not found in this resource zone' });
    }
    const ownerKey = identity.kind === 'judge' ? `judge:${identity.identity}` : `student:${identity.userId}`;
    return response.status(200).json({ notes: notes.map(({ owner_id: _ownerId, ...note }) => ({
      ...note,
      owner_key: ownerKey,
      content_sha256: contentHash(note.content),
    })) });
  } catch { return response.status(502).json({ error: 'Authentication or storage request failed' }); }
}
