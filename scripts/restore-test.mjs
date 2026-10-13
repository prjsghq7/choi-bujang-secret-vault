import { readFileSync } from 'node:fs';
import { contentHash, selectRestoreRecord, verifiedPolicyDiff } from '../src/restore.mjs';

const notes = JSON.parse(readFileSync(new URL('../backups/notes.json', import.meta.url), 'utf8'));
const policy = JSON.parse(readFileSync(new URL('../backups/verified-policy.json', import.meta.url), 'utf8'));
const record = notes.records[0];
const selected = selectRestoreRecord(notes, record.id, record.owner_key, record.content_sha256);
const diff = verifiedPolicyDiff(policy, policy.policy);
if (!selected || contentHash(selected.content) !== selected.content_sha256 || !diff.ok || diff.changes.length !== 0) {
  throw new Error('백업 검증 연습 실패');
}
process.stdout.write('통과 · 사본 형식·소유자·ID·내용 해시 검증\n');
process.stdout.write('실제 복구 API 호출은 하지 않았습니다.\n');
