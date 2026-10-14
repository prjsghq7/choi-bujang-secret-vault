import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { decide, RULE_IDS } from '../src/decider.mjs';
import { detect } from '../src/detect.mjs';
import { checkDecider } from './decider-test.mjs';
import { fixtureRequests8 } from './fixture-8.mjs';
import { checkDetection } from './detect-test.mjs';

// 12단계 실측 표: sends real requests to the deployed app and records status, request ID and time.
// Requests that need a real account token or approved device key are listed as not run (미실행).
// No tokens, keys or note bodies are written to the output.
const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
const app = new URL(config.publicAppUrl);
const rows = [];

async function live(stage, name, expected, method, path, { headers = {}, body, expectStatus, check } = {}) {
  const requestId = randomUUID();
  const target = path.startsWith('http') ? new URL(path) : new URL(path, app);
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(target, { method, redirect: 'manual', signal: AbortSignal.timeout(15000),
      headers: { 'X-Request-Id': requestId, ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    const text = await response.text();
    let reason = null;
    try { reason = JSON.parse(text)?.reason ?? null; } catch { /* not JSON */ }
    const passed = expectStatus.includes(response.status) && (!check || check(text));
    rows.push({ stage, name, kind: 'live', expected, method, path: target.pathname + target.search, status: response.status,
      reason, requestId: response.headers.get('x-request-id') ?? requestId, checkedAt, result: passed ? 'pass' : 'fail' });
  } catch (error) {
    rows.push({ stage, name, kind: 'live', expected, method, path: target.pathname, status: null, reason: error.cause?.code ?? error.name,
      requestId, checkedAt, result: 'fail' });
  }
}
const local = (stage, name, expected, passed) => rows.push({ stage, name, kind: 'local', expected, method: null, path: null,
  status: null, reason: null, requestId: null, checkedAt: new Date().toISOString(), result: passed ? 'pass' : 'fail' });
const notRun = (stage, name, expected, why) => rows.push({ stage, name, kind: 'not_run', expected, method: null, path: null,
  status: null, reason: why, requestId: null, checkedAt: null, result: 'not_run' });

const fakeSig = { 'X-Device-Id': '0'.repeat(16), 'X-Device-Timestamp': new Date().toISOString(), 'X-Device-Nonce': '0'.repeat(32), 'X-Device-Signature': 'A'.repeat(86) };
const noNotes = text => !/실습용 가상|SAMPLE_NOTE_1/u.test(text);

await live(1, '공개 data.json에 메모 없음', '404 또는 메모 없음', 'GET', '/data.json', { expectStatus: [404, 200], check: noNotes });
await live(2, 'GitHub 최신 data.json에 메모 없음', '메모 문장 없음', 'GET', `https://raw.githubusercontent.com/${config.repoUrl.replace('https://github.com/', '')}/main/data.json`, { expectStatus: [200, 404], check: noNotes });
await live(3, '비로그인 메모 조회', '401', 'GET', '/api/notes?id=1', { expectStatus: [401] });
await live(4, '위조 토큰 + 위조 서명으로 메모 조회', '401', 'GET', '/api/notes?id=1', { headers: { Authorization: 'Bearer a.b.c', ...fakeSig }, expectStatus: [401] });
await live(5, '원본 Supabase REST 직접 조회(키 없음)', '401 또는 403', 'GET', config.originalApiUrl + '?select=id', { expectStatus: [401, 403] });
await live(8, '비로그인 전체 목록 조회', '401', 'GET', '/api/notes', { expectStatus: [401] });
await live(10, '비로그인 복구 요청', '401', 'POST', '/api/restore', { body: { id: '1' }, expectStatus: [401] });
await live(11, '서명 없는 보호 요청', '401 device_signature_required', 'GET', '/api/notes?id=1', { headers: { Authorization: 'Bearer a.b.c' }, expectStatus: [401] });
await live(11, '서명 없는 수정 요청(복구 뒤 변경 시도)', '401', 'PATCH', '/api/notes', { headers: { Authorization: 'Bearer a.b.c' }, body: { id: 1, content: 'x' }, expectStatus: [401] });
await live(11, '설치형 앱 manifest', '200', 'GET', '/manifest.webmanifest', { expectStatus: [200], check: text => /"name"/u.test(text) });
await live(11, '승인 전 화면에 메모 영역 없음', '200, 빈 #app', 'GET', '/', { expectStatus: [200], check: text => text.includes('<section id="app" hidden></section>') });
await live(11, '예전 무인증 화면 제거', '404', 'GET', '/index.stage2.html', { expectStatus: [404] });
await live(12, '비로그인 작전실 조회', '401', 'GET', '/api/ops', { expectStatus: [401] });
await live(12, '비로그인 기기 등록부 조회', '401', 'GET', '/api/device', { expectStatus: [401] });

for (const item of await checkDecider({ decide, ruleIds: RULE_IDS })) local(item.name.includes('복합') ? 7 : 6, item.name, '판정기 기대값', item.passed);
for (const [name, request] of Object.entries(fixtureRequests8())) {
  const expected = name === 'own' ? 'allow' : 'deny';
  local(8, `구역 판정 ${name}`, expected, (await decide(request)).decision === expected);
}
for (const item of await checkDetection(detect)) local(9, item.name, '탐지 기대값', item.passed);

const token = '실제 계정 토큰·승인된 기기 키가 필요해 이 스크립트로는 보내지 않음';
notRun(4, 'B 토큰으로 A 메모 조회', '404/403', token);
notRun(11, '승인된 기기의 정상 서명 CRUD', '200', token);
notRun(11, '서명 뒤 경로·본문 변경', '401 device_signature_invalid', token + ' (npm run device:test 로컬 연습은 통과)');
notRun(12, '미등록 기기 요청 뒤 회수된 신원으로 재전송', '403 identity_revoked', token);
notRun(10, 'B 메모 변조·삭제 뒤 복구', '200 + 해시 일치', token);
notRun(9, '운영 엔진 실사건으로 burst_read 탐지', 'propose_revocation', '운영 엔진이 실사건을 이 앱에 전달하지 않음');

const summary = { pass: rows.filter(r => r.result === 'pass').length, fail: rows.filter(r => r.result === 'fail').length,
  notRun: rows.filter(r => r.result === 'not_run').length };
const output = { schema: 'aleph.ops-results.v1', target: app.origin, generatedAt: new Date().toISOString(),
  note: '심판의 41종 시험 결과가 아닙니다. 이 표의 live 행만 실제 배포 응답이며, not_run 행은 실행하지 않았습니다.', summary, rows };
writeFileSync(new URL('../public/ops-results.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
const label = { pass: '통과', fail: '실패', not_run: '미실행' };
const md = ['# 12단계 실측 결과', '', `대상: ${app.origin} · 생성: ${output.generatedAt}`, '', output.note, '',
  `통과 ${summary.pass} · 실패 ${summary.fail} · 미실행 ${summary.notRun}`, '',
  '| 단계 | 시험 | 종류 | 기대 | 요청 | 실제 | 요청 ID | 확인 시각 | 결과 |', '|---|---|---|---|---|---|---|---|---|',
  ...rows.map(r => `| ${r.stage} | ${r.name} | ${r.kind} | ${r.expected} | ${r.method ? `${r.method} ${r.path}` : '-'} | ${r.status ?? '-'}${r.reason ? ` ${r.reason}` : ''} | ${r.requestId ?? '-'} | ${r.checkedAt ?? '-'} | ${label[r.result]} |`)];
writeFileSync(new URL('../docs/OPS_RESULTS.md', import.meta.url), md.join('\n') + '\n');
process.stdout.write(`실측 표 생성 · 통과 ${summary.pass} · 실패 ${summary.fail} · 미실행 ${summary.notRun}\n`);
if (summary.fail) process.exitCode = 1;
