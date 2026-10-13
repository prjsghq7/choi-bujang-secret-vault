import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const BACKUP_FILES = Object.freeze(['notes.json', 'verified-policy.json']);

export function contentHash(content) {
  return createHash('sha256').update(String(content), 'utf8').digest('hex');
}

// Line endings are normalized so the same committed bytes hash the same on Windows and Vercel.
export function fileHash(text) {
  return contentHash(String(text).replace(/\r\n/gu, '\n'));
}

// Re-reads the pre-breach backup files and backups/manifest.json from disk and verifies them
// before any restore. Missing files, a version mismatch or a hash mismatch stop the restore.
export function verifyBackupFiles(directory) {
  let manifest;
  try { manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8')); } catch {
    return { ok: false, reason: 'backup_manifest_missing', failed: ['manifest.json'] };
  }
  if (manifest?.schema !== 'aleph.backup-manifest.v1' || manifest.version !== 'stage-9-savepoint') {
    return { ok: false, reason: 'backup_manifest_invalid', failed: ['manifest.json'] };
  }
  const parsed = {};
  const failed = [];
  for (const name of BACKUP_FILES) {
    let text;
    try { text = readFileSync(join(directory, name), 'utf8'); } catch { failed.push(name); continue; }
    if (fileHash(text) !== manifest.files?.[name]) { failed.push(name); continue; }
    try { parsed[name] = JSON.parse(text); } catch { failed.push(name); continue; }
    if (parsed[name]?.version !== manifest.version) failed.push(name);
  }
  if (failed.length) return { ok: false, reason: 'backup_verification_failed', failed };
  return { ok: true, version: manifest.version, files: manifest.files,
    notes: parsed['notes.json'], policy: parsed['verified-policy.json'] };
}

export function verifiedPolicyDiff(backup, current) {
  if (!backup || backup.schema !== 'aleph.verified-backup.v1'
      || backup.version !== 'stage-9-savepoint' || backup.scope !== 'virtual-training-only') {
    return { ok: false, reason: 'backup_verification_failed' };
  }
  const before = backup.policy;
  const after = current && typeof current === 'object' ? current : {};
  const changes = Object.keys({ ...before, ...after }).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  return { ok: true, from: before, to: after, changes };
}

export function planToken(plan) {
  return createHash('sha256').update(JSON.stringify(plan), 'utf8').digest('hex');
}

export function selectRestoreRecord(snapshot, id, ownerKey, expectedHash) {
  const record = snapshot?.records?.find((item) => String(item?.id) === String(id));
  if (!record || record.owner_key !== ownerKey || record.content_sha256 !== expectedHash
      || contentHash(record.content) !== record.content_sha256) return null;
  return { id: record.id, owner_key: record.owner_key, title: record.title, content: record.content,
    content_sha256: record.content_sha256 };
}
