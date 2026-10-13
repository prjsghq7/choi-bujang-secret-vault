import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createLoginVerifier } from '../src/verify-login.mjs';
import { contentHash, planToken, verifiedPolicyDiff } from '../src/restore.mjs';
import { appendRestoreAudit, listBackupIds, readNoteBackup, verifyNoteBackup } from '../src/note-backup.mjs';
import { RULE_IDS } from '../src/decider.mjs';
import { retestPolicies } from '../src/retest.mjs';

const verifierConfig = {
  judgeIssuer: 'https://aleph-judge-production.up.railway.app/defense/judge',
  publicAppUrl: 'https://choi-bujang-secret-vault-navy.vercel.app',
  identityProvider: { issuer: 'https://ybaymbdaagpiqfwytkld.supabase.co/auth/v1', audience: 'authenticated', jwksUrl: 'https://ybaymbdaagpiqfwytkld.supabase.co/auth/v1/.well-known/jwks.json' },
};

function ownerKey(identity) {
  return identity.kind === 'judge' ? `judge:${identity.identity}` : `student:${identity.userId}`;
}

function requestedId(request, body) {
  const query = new URL(request.url, 'https://local.invalid').searchParams;
  const value = body.id ?? body.noteId ?? body.note_id ?? query.get('id');
  return value === undefined || value === null || value === '' ? null : String(value);
}

async function noteState(url, headers, id) {
  const response = await fetch(url + `/rest/v1/notes?select=id,owner_id,title,content&id=eq.${encodeURIComponent(id)}`, { headers });
  if (!response.ok) throw new Error('storage');
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

function stateOf(row, backup) {
  if (!row) return 'deleted';
  return row.title === backup.title && row.content === backup.content ? 'intact' : 'tampered';
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
    const headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const policy = JSON.parse(readFileSync(join(process.cwd(), 'backups', 'verified-policy.json'), 'utf8'));
    const policyDiff = verifiedPolicyDiff(policy, { step: policy.policy.step, rules: [...RULE_IDS].filter(rule => policy.policy.rules.includes(rule)) });
    if (!policyDiff.ok) return response.status(412).json({ error: 'Backup policy verification failed' });
    const plan = { backupVersion: policy.version, scope: 'single_note', changes: policyDiff.changes };
    const body = request.body && typeof request.body === 'object' ? request.body : {};

    // Preview: the verified policy version, its change scope and the caller's own backed-up notes.
    if (request.method === 'GET') {
      const notes = [];
      for (const id of await listBackupIds(url, key, identity.userId)) {
        const backup = await readNoteBackup(url, key, identity.userId, id);
        if (!verifyNoteBackup(backup, identity.userId, id)) continue;
        const row = await noteState(url, headers, id);
        if (row && row.owner_id !== identity.userId) continue;
        notes.push({ id, content_sha256: backup.content_sha256, state: stateOf(row, backup) });
      }
      return response.status(200).json({ plan, planToken: planToken(plan), owner_key: ownerKey(identity), notes });
    }

    // Policy restore keeps the explicit preview → confirm step.
    if (body.target === 'policy') {
      if (body.confirmed !== true || body.planToken !== planToken(plan)) return response.status(428).json({ error: 'Verified restore plan confirmation is required', plan, planToken: planToken(plan) });
      return response.status(200).json({ policy: { version: policy.version, rules: policy.policy.rules, changes: policyDiff.changes } });
    }

    let id = requestedId(request, body);
    if (id === null) {
      const candidates = [];
      for (const backupId of await listBackupIds(url, key, identity.userId)) {
        const backup = await readNoteBackup(url, key, identity.userId, backupId);
        if (!verifyNoteBackup(backup, identity.userId, backupId)) continue;
        const row = await noteState(url, headers, backupId);
        if (row && row.owner_id !== identity.userId) continue;
        if (stateOf(row, backup) !== 'intact') candidates.push(backupId);
      }
      if (candidates.length !== 1) return response.status(400).json({ error: 'Specify exactly one note id to restore', candidates });
      id = candidates[0];
    }
    if (!/^[0-9]+$/.test(id)) return response.status(400).json({ error: 'A numeric note id is required' });

    // The backup must exist for this owner and match its own id and SHA-256.
    const backup = await readNoteBackup(url, key, identity.userId, id);
    if (!verifyNoteBackup(backup, identity.userId, id)) return response.status(404).json({ error: 'No verified backup for this note and owner' });
    if (body.content_sha256 !== undefined && body.content_sha256 !== backup.content_sha256) {
      return response.status(409).json({ error: 'Requested content hash does not match the verified backup' });
    }
    const before = await noteState(url, headers, id);
    if (before && before.owner_id !== identity.userId) return response.status(403).json({ error: 'Resource owner mismatch' });
    const previousState = stateOf(before, backup);

    // Restore only this one note. Other notes and the audit log are never touched.
    if (previousState !== 'intact') {
      const write = before
        ? fetch(url + `/rest/v1/notes?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(identity.userId)}`, { method: 'PATCH', headers, body: JSON.stringify({ title: backup.title, content: backup.content }) })
        : fetch(url + '/rest/v1/notes', { method: 'POST', headers, body: JSON.stringify({ id: Number(id), owner_id: identity.userId, title: backup.title, content: backup.content }) });
      const upstream = await write;
      if (!upstream.ok) return response.status(502).json({ error: 'Restore storage request failed' });
    }
    const after = await noteState(url, headers, id);
    const verification = {
      source: 'private_verified_backup',
      backupVersion: backup.captured_at,
      previousState,
      idMatch: String(after?.id) === id,
      ownerMatch: after?.owner_id === identity.userId,
      contentHashMatch: Boolean(after) && contentHash(after.content) === backup.content_sha256,
    };
    if (!verification.idMatch || !verification.ownerMatch || !verification.contentHashMatch) {
      return response.status(502).json({ error: 'Restore storage verification failed', verification });
    }
    const auditPreserved = await appendRestoreAudit(url, key, {
      at: new Date().toISOString(), owner_key: ownerKey(identity), id, previousState,
      content_sha256: backup.content_sha256,
    });
    const retestResults = await retestPolicies();
    const retest = { executed: true, executedAt: new Date().toISOString(),
      passed: retestResults.every(item => item.passed), results: retestResults };
    const result = {
      id, owner_key: ownerKey(identity), owner_id: after.owner_id, title: after.title,
      content: after.content, content_sha256: contentHash(after.content),
    };
    return response.status(200).json({ restored: result, ...result, verification, auditPreserved, retest });
  } catch { return response.status(502).json({ error: 'Restore verification failed' }); }
}
