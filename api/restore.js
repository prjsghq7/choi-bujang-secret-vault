import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createLoginVerifier } from '../src/verify-login.mjs';
import { contentHash, planToken, verifiedPolicyDiff } from '../src/restore.mjs';
import { appendRestoreAudit, listBackupIds, readVerifiedBackup } from '../src/note-backup.mjs';
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

// Re-reads and verifies the backup, then lists exactly what a restore would change.
// Returns { status, body } to stop, or { preview } when the backup is verified.
async function notePreview(url, key, headers, identity, id) {
  const verified = await readVerifiedBackup(url, key, identity.userId, id);
  if (!verified.ok) return { status: verified.reason === 'backup_missing' ? 404 : 412, body: { error: 'Verified backup check failed; restore stopped', reason: verified.reason, failed: verified.failed ?? [] } };
  const { backup, manifest } = verified;
  const current = await noteState(url, headers, id);
  if (current && current.owner_id !== identity.userId) return { status: 403, body: { error: 'Resource owner mismatch' } };
  const state = !current ? 'deleted'
    : current.title === backup.title && current.content === backup.content ? 'intact' : 'tampered';
  const changes = !current ? ['recreate', 'title', 'content']
    : ['title', 'content'].filter(field => current[field] !== backup[field]);
  const preview = {
    id, owner_key: ownerKey(identity), backupVersion: backup.version, backupSha256: manifest.backup_sha256,
    backupContentSha256: backup.content_sha256, currentContentSha256: current ? contentHash(current.content) : null,
    state, changes, backupChecks: verified.checks,
  };
  const token = planToken({ id, owner: identity.userId, version: backup.version, backup: manifest.backup_sha256,
    current: current ? [current.title, contentHash(current.content)] : null });
  return { preview, planToken: token, backup };
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
    if (!policyDiff.ok) return response.status(412).json({ error: 'Backup policy verification failed; restore stopped' });
    const plan = { backupVersion: policy.version, scope: 'single_note', changes: policyDiff.changes };
    const body = request.body && typeof request.body === 'object' ? request.body : {};
    const id = requestedId(request, body);
    if (id !== null && !/^[0-9]+$/.test(id)) return response.status(400).json({ error: 'A numeric note id is required' });

    if (request.method === 'GET') {
      // Preview only: nothing is changed.
      if (id !== null) {
        const result = await notePreview(url, key, headers, identity, id);
        if (!result.preview) return response.status(result.status).json(result.body);
        return response.status(200).json({ preview: result.preview, planToken: result.planToken });
      }
      const notes = [];
      for (const backupId of await listBackupIds(url, key, identity.userId)) {
        const result = await notePreview(url, key, headers, identity, backupId);
        if (result.preview) notes.push({ id: backupId, state: result.preview.state, changes: result.preview.changes });
      }
      return response.status(200).json({ plan, planToken: planToken(plan), owner_key: ownerKey(identity), notes });
    }

    // Policy restore: preview → explicit confirmation. The production policy is never modified.
    if (body.target === 'policy') {
      if (body.confirmed !== true || body.planToken !== planToken(plan)) return response.status(428).json({ error: 'Verified restore plan confirmation is required', plan, planToken: planToken(plan) });
      return response.status(200).json({ policy: { version: policy.version, rules: policy.policy.rules, changes: policyDiff.changes } });
    }

    if (id === null) return response.status(400).json({ error: 'Specify exactly one note id to restore' });
    if (body.content_sha256 !== undefined) {
      const check = await readVerifiedBackup(url, key, identity.userId, id);
      if (check.ok && body.content_sha256 !== check.backup.content_sha256) return response.status(409).json({ error: 'Requested content hash does not match the verified backup' });
    }
    const first = await notePreview(url, key, headers, identity, id);
    if (!first.preview) return response.status(first.status).json(first.body);
    // Step 1: show the version and the fields that will change. No write without confirmation.
    if (body.confirmed !== true || body.planToken !== first.planToken) {
      return response.status(428).json({ error: 'Confirm this restore plan before it runs', preview: first.preview, planToken: first.planToken });
    }

    // Step 2: re-read and re-verify the backup immediately before writing; stop if anything changed.
    const recheck = await notePreview(url, key, headers, identity, id);
    if (!recheck.preview) return response.status(recheck.status).json(recheck.body);
    if (recheck.planToken !== body.planToken) return response.status(409).json({ error: 'Backup or note changed after the preview; restore stopped', preview: recheck.preview, planToken: recheck.planToken });
    const { backup, preview } = recheck;

    // Restore only this one note. Other notes and the audit log are never touched.
    if (preview.state !== 'intact') {
      const upstream = preview.state === 'deleted'
        ? await fetch(url + '/rest/v1/notes', { method: 'POST', headers, body: JSON.stringify({ id: Number(id), owner_id: identity.userId, title: backup.title, content: backup.content }) })
        : await fetch(url + `/rest/v1/notes?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(identity.userId)}`, { method: 'PATCH', headers, body: JSON.stringify({ title: backup.title, content: backup.content }) });
      if (!upstream.ok) return response.status(502).json({ error: 'Restore storage request failed' });
    }
    const after = await noteState(url, headers, id);
    const verification = {
      source: 'private_verified_backup', backupVersion: backup.version, previousState: preview.state,
      backupChecks: preview.backupChecks,
      idMatch: String(after?.id) === id,
      ownerMatch: after?.owner_id === identity.userId,
      contentHashMatch: Boolean(after) && contentHash(after.content) === backup.content_sha256,
    };
    if (!verification.idMatch || !verification.ownerMatch || !verification.contentHashMatch) {
      return response.status(502).json({ error: 'Restore storage verification failed', verification });
    }
    const auditPreserved = await appendRestoreAudit(url, key, {
      at: new Date().toISOString(), owner_key: ownerKey(identity), id, previousState: preview.state,
      changes: preview.changes, backupVersion: backup.version, content_sha256: backup.content_sha256,
    });
    const retestResults = await retestPolicies();
    const retest = { executed: true, executedAt: new Date().toISOString(),
      passed: retestResults.every(item => item.passed), results: retestResults };
    const result = {
      id, owner_key: ownerKey(identity), owner_id: after.owner_id, title: after.title,
      content: after.content, content_sha256: contentHash(after.content),
    };
    return response.status(200).json({ restored: result, ...result, changes: preview.changes, verification, auditPreserved, retest });
  } catch { return response.status(502).json({ error: 'Restore verification failed' }); }
}
