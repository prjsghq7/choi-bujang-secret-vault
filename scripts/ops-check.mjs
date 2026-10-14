import { readFileSync, writeFileSync } from 'node:fs';
import { runLiveAttackChecks } from '../src/attack-check.mjs';
import { decide, RULE_IDS } from '../src/decider.mjs';
import { detect } from '../src/detect.mjs';
import { checkDecider } from './decider-test.mjs';
import { fixtureRequests8 } from './fixture-8.mjs';
import { checkDetection } from './detect-test.mjs';

// 12단계 실측 표. live rows are the exact requests `src/attack-check.mjs` sends (same attackId,
// X-Request-Id, status, time); local rows are practice runs of the decider/detector; not_run rows
// were not sent. No tokens, keys or note bodies are written.
const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
const rows = (await runLiveAttackChecks(config)).map(({ attackId, stage, expected, method, path, status, reason, requestId, checkedAt, result }) => ({
  attackId, stage, kind: result === 'not_run' ? 'not_run' : 'live', expected, method, path, status, reason, requestId, checkedAt, result }));

const local = (attackId, stage, expected, passed) => rows.push({ attackId, stage, kind: 'local', expected, method: null, path: null,
  status: null, reason: null, requestId: null, checkedAt: new Date().toISOString(), result: passed ? 'pass' : 'fail' });
for (const [index, item] of (await checkDecider({ decide, ruleIds: RULE_IDS })).entries()) {
  local(`local_decider_${index + 1}`, item.name.includes('복합') ? 7 : 6, item.name, item.passed);
}
for (const [name, request] of Object.entries(fixtureRequests8())) {
  const expected = name === 'own' ? 'allow' : 'deny';
  local(`local_zone_${name}`, 8, `구역 판정 ${name} → ${expected}`, (await decide(request)).decision === expected);
}
for (const [index, item] of (await checkDetection(detect)).entries()) local(`local_detect_${index + 1}`, 9, item.name, item.passed);

const summary = { pass: rows.filter(r => r.result === 'pass').length, fail: rows.filter(r => r.result === 'fail').length,
  notRun: rows.filter(r => r.result === 'not_run').length };
const output = { schema: 'aleph.ops-results.v1', target: new URL(config.publicAppUrl).origin, generatedAt: new Date().toISOString(),
  note: '심판의 41종 시험 결과가 아닙니다. live 행만 실제 배포 응답(npm run bundle의 attackId와 같음)이고 local은 로컬 연습, not_run은 보내지 않은 요청입니다.',
  summary, rows };
writeFileSync(new URL('../public/ops-results.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
const label = { pass: '통과', fail: '실패', not_run: '미실행' };
const md = ['# 12단계 실측 결과', '', `대상: ${output.target} · 생성: ${output.generatedAt}`, '', output.note, '',
  `통과 ${summary.pass} · 실패 ${summary.fail} · 미실행 ${summary.notRun}`, '',
  '| attackId | 단계 | 종류 | 기대 | 요청 | 실제 | 요청 ID | 확인 시각 | 결과 |', '|---|---|---|---|---|---|---|---|---|',
  ...rows.map(r => `| ${r.attackId} | ${r.stage} | ${r.kind} | ${r.expected} | ${r.method ? `${r.method} ${r.path}` : '-'} | ${r.status ?? '-'}${r.reason ? ` ${r.reason}` : ''} | ${r.requestId ?? '-'} | ${r.checkedAt ?? '-'} | ${label[r.result]} |`)];
writeFileSync(new URL('../docs/OPS_RESULTS.md', import.meta.url), md.join('\n') + '\n');
process.stdout.write(`실측 표 생성 · 통과 ${summary.pass} · 실패 ${summary.fail} · 미실행 ${summary.notRun}\n`);
if (summary.fail) process.exitCode = 1;
