import { createHash, randomUUID } from 'node:crypto';
import { contentHash } from './restore.mjs';

// Private Supabase Storage bucket. Only the server secret key can read or write it.
export const BACKUP_BUCKET = 'note-backups';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');

function storageHeaders(key, extra = {}) {
  return { apikey: key, Authorization: 'Bearer ' + key, ...extra };
}

function paths(ownerId, noteId) {
  if (!UUID.test(String(ownerId)) || !/^[0-9]+$/u.test(String(noteId))) return null;
  return { backup: `notes/${ownerId}/${noteId}.json`, manifest: `manifests/${ownerId}/${noteId}.json` };
}

async function ensureBucket(url, key) {
  const response = await fetch(url + '/storage/v1/bucket', {
    method: 'POST', headers: storageHeaders(key, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: BACKUP_BUCKET, name: BACKUP_BUCKET, public: false }),
  });
  return response.ok || response.status === 400 || response.status === 409;
}

// x-upsert:false — an existing object is never overwritten.
async function uploadOnce(url, key, path, text) {
  const send = () => fetch(`${url}/storage/v1/object/${BACKUP_BUCKET}/${path}`, {
    method: 'POST', body: text,
    headers: storageHeaders(key, { 'Content-Type': 'application/json', 'x-upsert': 'false' }),
  });
  let response = await send();
  if (response.ok) return 'created';
  let message = await response.text();
  if (/bucket/iu.test(message) && /not.?found/iu.test(message) && await ensureBucket(url, key)) {
    response = await send();
    if (response.ok) return 'created';
    message = await response.text();
  }
  return /duplicate|already exists|409/iu.test(message) ? 'exists' : 'failed';
}

async function download(url, key, path) {
  const response = await fetch(`${url}/storage/v1/object/authenticated/${BACKUP_BUCKET}/${path}`,
    { headers: storageHeaders(key), cache: 'no-store' });
  return response.ok ? response.text() : null;
}

// Called only when a note is created, so the copy is the verified pre-breach version.
// A separate manifest records the SHA-256 of the exact backup bytes for later re-verification.
export async function captureNoteBackup(url, key, note) {
  const target = paths(note?.owner_id, note?.id);
  if (!target || typeof note.content !== 'string' || typeof note.title !== 'string') return false;
  const version = new Date().toISOString();
  const backupText = JSON.stringify({
    schema: 'aleph.note-backup.v1', version, id: String(note.id), owner_id: note.owner_id,
    title: note.title, content: note.content, content_sha256: contentHash(note.content),
  });
  try {
    const stored = await uploadOnce(url, key, target.backup, backupText);
    if (stored !== 'created') return stored === 'exists';
    const manifest = JSON.stringify({
      schema: 'aleph.note-backup-manifest.v1', version, id: String(note.id), owner_id: note.owner_id,
      backup_sha256: sha256(backupText), content_sha256: contentHash(note.content),
    });
    return await uploadOnce(url, key, target.manifest, manifest) === 'created';
  } catch { return false; }
}

// Re-reads the backup and its manifest from storage and verifies them. Any failure stops the restore.
export async function readVerifiedBackup(url, key, ownerId, noteId) {
  const target = paths(ownerId, noteId);
  if (!target) return { ok: false, reason: 'invalid_target' };
  const [backupText, manifestText] = await Promise.all([
    download(url, key, target.backup), download(url, key, target.manifest),
  ]);
  if (backupText === null || manifestText === null) return { ok: false, reason: 'backup_missing' };
  let backup, manifest;
  try { backup = JSON.parse(backupText); manifest = JSON.parse(manifestText); } catch { return { ok: false, reason: 'backup_unreadable' }; }
  const checks = {
    manifestSchema: manifest?.schema === 'aleph.note-backup-manifest.v1',
    backupSchema: backup?.schema === 'aleph.note-backup.v1',
    backupFileHash: sha256(backupText) === manifest?.backup_sha256,
    version: typeof backup?.version === 'string' && backup.version === manifest?.version,
    id: String(backup?.id) === String(noteId) && String(manifest?.id) === String(noteId),
    owner: backup?.owner_id === ownerId && manifest?.owner_id === ownerId,
    contentHash: typeof backup?.content === 'string' && typeof backup?.title === 'string'
      && contentHash(backup.content) === backup.content_sha256
      && backup.content_sha256 === manifest?.content_sha256,
  };
  const failed = Object.keys(checks).filter(name => !checks[name]);
  if (failed.length) return { ok: false, reason: 'backup_verification_failed', failed };
  return { ok: true, backup, manifest, checks };
}

export async function listBackupIds(url, key, ownerId) {
  if (!UUID.test(String(ownerId))) return [];
  try {
    const response = await fetch(`${url}/storage/v1/object/list/${BACKUP_BUCKET}`, {
      method: 'POST', headers: storageHeaders(key, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefix: `manifests/${ownerId}/`, limit: 50, offset: 0 }),
    });
    if (!response.ok) return [];
    const items = await response.json();
    return Array.isArray(items) ? items.map(item => /^([0-9]+)\.json$/u.exec(item?.name ?? '')?.[1])
      .filter(Boolean) : [];
  } catch { return []; }
}

// Audit entries are appended under a new name and never edited or deleted. No note body is stored.
export async function appendRestoreAudit(url, key, entry) {
  const name = `audit/${new Date().toISOString().replace(/[:.]/gu, '-')}-${randomUUID()}.json`;
  try {
    return await uploadOnce(url, key, name, JSON.stringify({ schema: 'aleph.restore-audit.v1', ...entry })) === 'created';
  } catch { return false; }
}
