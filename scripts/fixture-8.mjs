import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from '../src/decider.mjs';

const request = (overrides = {}) => ({
  schema: 'aleph.decision.v1', requestId: randomUUID(), classId: 'class_fixture',
  projectId: 'project_fixture', subjectId: 'learner_fixture', deviceId: 'a'.repeat(16),
  service: 'notes', method: 'GET', path: '/notes/1', route: 'GET /notes/:id',
  queryLength: 0, querySha256: createHash('sha256').update('').digest('hex'),
  at: new Date().toISOString(), policyRevision: 1, deviceRegistered: true,
  stepUp: { verified: false, authAgeSeconds: null }, recentEvents: [],
  signals: { source: 'judge_fixture', region: 'local', network: 'usual', hour: 14 },
  ...overrides,
});

export function fixtureRequests8() {
  return {
    own: request(),
    otherRead: request({ path: '/notes/other', route: 'GET /notes/:id' }),
    otherUpdate: request({ method: 'PATCH', path: '/notes/other', route: 'PATCH /notes/:id' }),
    otherList: request({ path: '/notes', route: 'GET /notes' }),
    teacherNotice: request({ method: 'PATCH', service: 'notices', path: '/notices/class', route: 'PATCH /notices/:id' }),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cases = fixtureRequests8();
  const results = [];
  for (const [name, input] of Object.entries(cases)) {
    const output = await decide(input);
    const expected = name === 'own' ? 'allow' : 'deny';
    const passed = output.decision === expected;
    results.push(passed);
    process.stdout.write(`${passed ? '통과' : '확인 필요'} · ${name}: ${output.decision}\n`);
  }
  process.stdout.write('이 명령은 가상 요청으로 연습하며 심판 통과 증거가 아닙니다.\n');
  if (results.some(passed => !passed)) process.exitCode = 1;
}
