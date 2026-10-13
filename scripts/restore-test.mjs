import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BACKUP_FILES, contentHash, selectRestoreRecord, verifiedPolicyDiff, verifyBackupFiles } from '../src/restore.mjs';

const directory = fileURLToPath(new URL('../backups', import.meta.url));
const files = verifyBackupFiles(directory);
if (!files.ok) throw new Error(`백업 사본 재검증 실패: ${files.failed.join(', ')}`);
process.stdout.write(`통과 · backups/manifest.json 기준 사본 다시 읽기·해시 검증 (${files.version})\n`);

// A tampered copy must stop the restore.
const copy = mkdtempSync(join(tmpdir(), 'restore-test-'));
try {
  for (const name of ['manifest.json', ...BACKUP_FILES]) {
    writeFileSync(join(copy, name), readFileSync(join(directory, name)));
  }
  const notesPath = join(copy, 'notes.json');
  writeFileSync(notesPath, readFileSync(notesPath, 'utf8').replace('복구 연습용', '변조된'));
  const tampered = verifyBackupFiles(copy);
  if (tampered.ok || !tampered.failed.includes('notes.json')) throw new Error('변조된 사본이 검증을 통과했습니다');
  rmSync(join(copy, 'manifest.json'));
  if (verifyBackupFiles(copy).ok) throw new Error('무결성 기록 없이 검증을 통과했습니다');
} finally { rmSync(copy, { recursive: true, force: true }); }
process.stdout.write('통과 · 변조된 사본·무결성 기록 없는 사본은 복구 중단\n');

const record = files.notes.records[0];
const selected = selectRestoreRecord(files.notes, record.id, record.owner_key, record.content_sha256);
const diff = verifiedPolicyDiff(files.policy, files.policy.policy);
if (!selected || contentHash(selected.content) !== selected.content_sha256 || !diff.ok || diff.changes.length !== 0) {
  throw new Error('백업 검증 연습 실패');
}
process.stdout.write('통과 · 사본 형식·소유자·ID·내용 해시 검증\n');
process.stdout.write('실제 복구 API 호출은 하지 않았습니다.\n');
