import { createHash } from 'node:crypto';

export function contentHash(content) {
  return createHash('sha256').update(String(content), 'utf8').digest('hex');
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

export function selectRestoreRecord(snapshot, id, ownerKey, expectedHash) {
  const record = snapshot?.records?.find((item) => item?.id === id);
  if (!record || record.owner_key !== ownerKey || record.content_sha256 !== expectedHash
      || contentHash(record.content) !== record.content_sha256) return null;
  return { id: record.id, owner_key: record.owner_key, title: record.title, content: record.content,
    content_sha256: record.content_sha256 };
}
