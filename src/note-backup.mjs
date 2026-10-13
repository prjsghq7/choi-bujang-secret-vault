import { randomUUID } from 'node:crypto';
import { contentHash } from './restore.mjs';

// Private Supabase Storage bucket. Only the server secret key can read or write it.
export const BACKUP_BUCKET = 'note-backups';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function storageHeaders(key, extra = {}) {
  return { apikey: key, Authorization: 'Bearer ' + key, ...extra };
}

function backupPath(ownerId, noteId) {
  if (!UUID.test(String(ownerId)) || !/^[0-9]+$/u.test(String(noteId))) return null;
  return `notes/${ownerId}/${noteId}.json`;
}

async function ensureBucket(url, key) {
  const response = await fetch(url + '/storage/v1/bucket', {
    method: 'POST', headers: storageHeaders(key, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: BACKUP_BUCKET, name: BACKUP_BUCKET, public: false }),
  });
  return response.ok || response.status === 400 || response.status === 409;
}

async function upload(url, key, path, value) {
  return fetch(`${url}/storage/v1/object/${BACKUP_BUCKET}/${path}`, {
    method: 'POST',
    headers: storageHeaders(key, { 'Content-Type': 'application/json', 'x-upsert': 'false' }),
    body: JSON.stringify(value),
  });
}

// Insert-only: the first verified copy of a note is never overwritten, so a later
// tampering or deletion cannot replace the pre-breach version.
export async function captureNoteBackup(url, key, note, source) {
  const path = backupPath(note?.owner_id, note?.id);
  if (!path || typeof note.content !== 'string' || typeof note.title !== 'string') return false;
  const record = {
    schema: 'aleph.note-backup.v1', id: String(note.id), owner_id: note.owner_id,
    title: note.title, content: note.content, content_sha256: contentHash(note.content),
    captured_at: new Date().toISOString(), source,
  };
  try {
    let response = await upload(url, key, path, record);
    if (response.ok) return true;
    let text = await response.text();
    if (/bucket/iu.test(text) && /not.?found/iu.test(text)) {
      if (!await ensureBucket(url, key)) return false;
      response = await upload(url, key, path, record);
      if (response.ok) return true;
      text = await response.text();
    }
    return /duplicate|already exists|409/iu.test(text);
  } catch { return false; }
}

export async function readNoteBackup(url, key, ownerId, noteId) {
  const path = backupPath(ownerId, noteId);
  if (!path) return null;
  try {
    const response = await fetch(`${url}/storage/v1/object/authenticated/${BACKUP_BUCKET}/${path}`,
      { headers: storageHeaders(key) });
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
}

export async function listBackupIds(url, key, ownerId) {
  if (!UUID.test(String(ownerId))) return [];
  try {
    const response = await fetch(`${url}/storage/v1/object/list/${BACKUP_BUCKET}`, {
      method: 'POST', headers: storageHeaders(key, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefix: `notes/${ownerId}/`, limit: 50, offset: 0 }),
    });
    if (!response.ok) return [];
    const items = await response.json();
    return Array.isArray(items) ? items.map(item => /^([0-9]+)\.json$/u.exec(item?.name ?? '')?.[1])
      .filter(Boolean) : [];
  } catch { return []; }
}

// A verified backup must match its own owner, id and SHA-256 before it can be restored.
export function verifyNoteBackup(backup, ownerId, noteId) {
  return Boolean(backup && backup.schema === 'aleph.note-backup.v1'
    && String(backup.id) === String(noteId) && backup.owner_id === ownerId
    && typeof backup.content === 'string' && typeof backup.title === 'string'
    && backup.content_sha256 === contentHash(backup.content));
}

// Audit entries are appended under a new name and never edited or deleted. No note body is stored.
export async function appendRestoreAudit(url, key, entry) {
  const name = `audit/${new Date().toISOString().replace(/[:.]/gu, '-')}-${randomUUID()}.json`;
  try {
    const record = { schema: 'aleph.restore-audit.v1', ...entry };
    let response = await upload(url, key, name, record);
    if (!response.ok && await ensureBucket(url, key)) response = await upload(url, key, name, record);
    return response.ok;
  } catch { return false; }
}
