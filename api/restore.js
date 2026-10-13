import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createLoginVerifier } from '../src/verify-login.mjs';
import { planToken, selectRestoreRecord, verifiedPolicyDiff } from '../src/restore.mjs';

const verifierConfig = {
  judgeIssuer: 'https://aleph-judge-production.up.railway.app/defense/judge',
  publicAppUrl: 'https://choi-bujang-secret-vault-navy.vercel.app',
  identityProvider: { issuer: 'https://ybaymbdaagpiqfwytkld.supabase.co/auth/v1', audience: 'authenticated', jwksUrl: 'https://ybaymbdaagpiqfwytkld.supabase.co/auth/v1/.well-known/jwks.json' },
};

function ownerKey(identity) {
  return identity.kind === 'judge' ? `judge:${identity.identity}` : `student:${identity.userId}`;
}

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) { response.setHeader('Allow', 'GET, POST'); return response.status(405).json({ error: 'Method not allowed' }); }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return response.status(500).json({ error: 'Server storage is not configured' });
  const authorization = request.headers.authorization ?? '';
  if (!authorization.startsWith('Bearer ')) return response.status(401).json({ error: 'Authentication required' });
  try {
    const verify = createLoginVerifier({ config: verifierConfig, supabaseSecretKey: key });
    const identity = await verify(authorization);
    if (!identity) return response.status(401).json({ error: 'Invalid authentication token' });
    const snapshot = JSON.parse(readFileSync(join(process.cwd(), 'backups', 'notes.json'), 'utf8'));
    const policy = JSON.parse(readFileSync(join(process.cwd(), 'backups', 'verified-policy.json'), 'utf8'));
    const currentPolicy = { step: 10, rules: ['device_registered', 'step_up_required', 'resource_zone', 'resource_owner'] };
    const policyDiff = verifiedPolicyDiff(policy, currentPolicy);
    if (!policyDiff.ok) return response.status(412).json({ error: 'Backup policy verification failed' });
    const plan = { backupVersion: policy.version, scope: 'single_note', changes: policyDiff.changes };
    if (request.method === 'GET') return response.status(200).json({ plan, planToken: planToken(plan), noteCount: snapshot.records.length });
    const body = request.body && typeof request.body === 'object' ? request.body : {};
    if (body.confirmed !== true || body.planToken !== planToken(plan)) return response.status(428).json({ error: 'Verified restore plan confirmation is required', plan });
    if (typeof body.id !== 'string' || typeof body.content_sha256 !== 'string') return response.status(400).json({ error: 'Restore id and content hash are required' });
    const record = selectRestoreRecord(snapshot, body.id, ownerKey(identity), body.content_sha256);
    if (!record) return response.status(403).json({ error: 'Backup target verification failed' });
    const headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates' };
    const upstream = await fetch(url + '/rest/v1/notes', { method: 'POST', headers, body: JSON.stringify({ id: record.id, owner_id: identity.userId, title: record.title, content: record.content }) });
    if (!upstream.ok) return response.status(502).json({ error: 'Restore storage request failed' });
    return response.status(200).json({ restored: { id: record.id, owner_id: identity.userId, owner_key: record.owner_key, content_sha256: record.content_sha256 } });
  } catch { return response.status(502).json({ error: 'Restore verification failed' }); }
}
