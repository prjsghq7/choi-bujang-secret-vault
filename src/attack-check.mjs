import { randomUUID } from 'node:crypto';

// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (config.step < 5) {
    throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
  }
  let app;
  try {
    app = new URL(config.publicAppUrl);
  } catch {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash
      || app.pathname !== '/' || app.hostname.endsWith('.example')) {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (config.step >= 12) {
    return (await runLiveAttackChecks(config)).map(({ attackId, expected, observed }) => ({ attackId, expected, observed }));
  }
  if (config.step >= 6) {
    const rootResponse = await fetch(app, { redirect: 'error', signal: AbortSignal.timeout(10000) });
    const apiResponse = await fetch(new URL('/api/notes', app), {
      redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    let apiError = false;
    try {
      const data = await apiResponse.json();
      apiError = !apiResponse.ok && typeof data?.error === 'string';
    } catch {
      // A non-JSON response is a failed check, not a successful deployment.
    }
    const checks = [
      { attackId: 'registered_device_surface', expected: '등록 기기에서 기존 자료실 화면이 열림',
        observed: rootResponse.ok ? `자료실 화면이 열림 (HTTP ${rootResponse.status})` : `자료실 화면 오류 (HTTP ${rootResponse.status})` },
      { attackId: 'anonymous_notes_api', expected: '비로그인 자료 API 요청이 JSON 401 또는 403으로 차단됨',
        observed: apiError ? `비로그인 자료 API가 JSON 오류로 차단됨 (HTTP ${apiResponse.status})` : `비로그인 자료 API 차단 확인 실패 (HTTP ${apiResponse.status})` },
    ];
    if (config.step >= 11) {
      const manifestResponse = await fetch(new URL('/manifest.webmanifest', app), { redirect: 'error', signal: AbortSignal.timeout(10000) });
      let manifestName = '';
      try { manifestName = (await manifestResponse.json())?.name ?? ''; } catch { /* reported below */ }
      const unsigned = await fetch(new URL('/api/notes?id=1', app), {
        redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Authorization: 'Bearer unsigned.check.only' },
      });
      checks.push(
        { attackId: 'install_manifest', expected: '설치형 웹앱 manifest가 열리고 앱 이름이 있음',
          observed: manifestResponse.ok && manifestName ? `manifest 확인 (HTTP ${manifestResponse.status})` : `manifest 확인 실패 (HTTP ${manifestResponse.status})` },
        { attackId: 'unsigned_protected_request', expected: '기기 서명 없는 보호 요청이 401 또는 403으로 거부됨',
          observed: unsigned.status === 401 || unsigned.status === 403 ? `서명 없는 요청 거부됨 (HTTP ${unsigned.status})` : `서명 없는 요청 거부 확인 실패 (HTTP ${unsigned.status})` },
      );
    }
    if (config.step >= 9) checks.push({
      attackId: 'revocation_detection_contract',
      expected: '복합 조회 사건의 회수 제안은 서버 측 탐지 계약으로만 생성됨',
      observed: '탐지 입력은 배포 브라우저 경로가 아닌 서버 측 detect(events) 계약으로 제한됨',
    });
    return checks;
  }
  const response = await fetch(new URL('/api/notes', app), {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  let exposed = false;
  if (response.ok) {
    try {
      const data = await response.json();
      exposed = response.status < 400 || typeof data?.error !== 'string';
    } catch {
      // A non-JSON response is a failed check, not a successful deployment.
    }
  }
  const rootResponse = await fetch(app, { redirect: 'error', signal: AbortSignal.timeout(10000) });
  const rootText = await rootResponse.text();
  const alephResponse = await fetch(new URL('/aleph.json', app), { redirect: 'error', signal: AbortSignal.timeout(10000) });
  const aleph = await alephResponse.json();
  const githubResponse = await fetch('https://raw.githubusercontent.com/prjsghq7/choi-bujang-secret-vault/main/data.json', { redirect: 'error', signal: AbortSignal.timeout(10000) });
  const githubText = await githubResponse.text();
  return [
    { attackId: 'anonymous_api_read', expected: '비로그인 API 요청이 JSON 401 또는 403으로 차단됨',
      observed: exposed ? '비로그인 API 요청이 차단되지 않음' : `비로그인 API 요청이 JSON 오류로 차단됨 (HTTP ${response.status})` },
    { attackId: 'deployment_secret_search', expected: 'Vercel 배포 번들에 시험 비밀값이 없음',
      observed: /SAMPLE_NOTE_1|실습용 가상/u.test(rootText) ? '배포 응답에서 시험 문구가 발견됨' : `배포 응답에서 시험 문구가 보이지 않음 (HTTP ${rootResponse.status})` },
    { attackId: 'github_static_search', expected: 'GitHub 최신 공개 파일에 메모가 없음',
      observed: /SAMPLE_NOTE_1|실습용 가상/u.test(githubText) ? 'GitHub 최신 data.json에서 시험 문구가 발견됨' : `GitHub 최신 data.json에서 시험 문구가 보이지 않음 (HTTP ${githubResponse.status})` },
    { attackId: 'public_storage_key_search', expected: '브라우저 번들에 공개 저장소 키가 없음',
      observed: /supabase\.co|sb_publishable_|anon key|SUPABASE_SECRET_KEY/u.test(rootText) ? '브라우저 응답에서 저장소 키 표식이 발견됨' : `브라우저 응답에 저장소 키 표식이 없음 (HTTP ${rootResponse.status})` },
    { attackId: 'allowed_routes_manifest', expected: 'aleph.json에 서버 허용 경로가 있음',
      observed: Array.isArray(aleph.allowedRoutes) && aleph.allowedRoutes.length ? `허용 경로 ${aleph.allowedRoutes.length}개 확인 (HTTP ${alephResponse.status})` : '허용 경로가 없음' },
  ];
}

// 12단계: only read requests (GET) are sent, as the submission bundle allows. Every attackId below is one real request with its own X-Request-Id. The same records
// (attackId, request ID, status, time) are written by `npm run ops:check` to docs/OPS_RESULTS.md and
// public/ops-results.json, which the ops room screen reads. A check that sends no request is `not_run`.
const FAKE_SIGNATURE = { 'X-Device-Id': '0'.repeat(16), 'X-Device-Timestamp': '1970-01-01T00:00:00.000Z',
  'X-Device-Nonce': '0'.repeat(32), 'X-Device-Signature': 'A'.repeat(86) };
const noNotes = text => !/실습용 가상|SAMPLE_NOTE_1/u.test(text);

export const LIVE_ATTACKS = Object.freeze([
  { attackId: 'registered_device_surface', stage: 11, expected: '자료실 화면이 열리고 승인 전 메모 영역은 비어 있음', method: 'GET', path: '/',
    pass: (status, text) => status === 200 && text.includes('<section id="app" hidden></section>') },
  { attackId: 'public_data_json', stage: 1, expected: '공개 data.json이 없거나 메모가 없음', method: 'GET', path: '/data.json',
    pass: (status, text) => status === 404 || (status === 200 && noNotes(text)) },
  { attackId: 'anonymous_notes_api', stage: 3, expected: '비로그인 메모 조회 401', method: 'GET', path: '/api/notes?id=1', pass: status => status === 401 },
  { attackId: 'forged_token_notes', stage: 4, expected: '위조 토큰·위조 서명 메모 조회 401', method: 'GET', path: '/api/notes?id=1',
    headers: { Authorization: 'Bearer a.b.c', ...FAKE_SIGNATURE }, pass: status => status === 401 },
  { attackId: 'anonymous_notes_list', stage: 8, expected: '비로그인 전체 목록 조회 401', method: 'GET', path: '/api/notes', pass: status => status === 401 },
  { attackId: 'anonymous_restore', stage: 10, expected: '비로그인 복구 미리 보기 401', method: 'GET', path: '/api/restore?id=1', pass: status => status === 401 },
  { attackId: 'unsigned_restore_preview', stage: 12, expected: '서명 없는 복구 경로 조회 401', method: 'GET', path: '/api/restore?id=1',
    headers: { Authorization: 'Bearer a.b.c' }, pass: status => status === 401 },
  { attackId: 'unsigned_protected_request', stage: 11, expected: '기기 서명 없는 보호 요청 401', method: 'GET', path: '/api/notes?id=1',
    headers: { Authorization: 'Bearer a.b.c' }, pass: status => status === 401 },
  { attackId: 'install_manifest', stage: 11, expected: 'manifest 200, 앱 이름 있음', method: 'GET', path: '/manifest.webmanifest',
    pass: (status, text) => status === 200 && /"name"/u.test(text) },
  { attackId: 'stage2_page_removed', stage: 11, expected: '예전 무인증 화면 404', method: 'GET', path: '/index.stage2.html', pass: status => status === 404 },
  { attackId: 'anonymous_ops_room', stage: 12, expected: '비로그인 작전실 조회 401', method: 'GET', path: '/api/ops', pass: status => status === 401 },
  { attackId: 'anonymous_device_registry', stage: 12, expected: '비로그인 기기 등록부 조회 401', method: 'GET', path: '/api/device', pass: status => status === 401 },
]);

export const NOT_SENT = Object.freeze([
  { attackId: 'unsigned_change_after_restore', stage: 12, expected: '복구 뒤 서명 없는 변경(PATCH) 401', why: '제출 묶음은 읽기 요청(GET·HEAD)만 보내므로 보내지 않음(npm run device:test 로컬 연습은 통과)' },
  { attackId: 'revocation_detection_contract', stage: 9, expected: '운영 엔진 실사건으로 burst_read 회수 제안', why: '운영 엔진이 실사건을 이 앱에 전달하지 않아 요청을 보내지 않음' },
  { attackId: 'revoked_identity_resend', stage: 12, expected: '회수된 신원 재전송 403 identity_revoked', why: '실제 계정 토큰과 승인된 기기 키가 필요해 보내지 않음' },
  { attackId: 'cross_owner_read', stage: 4, expected: 'B 토큰으로 A 메모 조회 404/403', why: '실제 계정 토큰과 승인된 기기 키가 필요해 보내지 않음' },
  { attackId: 'signed_path_body_tamper', stage: 11, expected: '서명 뒤 경로·본문 변경 401', why: '승인된 기기 키가 필요해 보내지 않음(npm run device:test 로컬 연습은 통과)' },
]);

export async function runLiveAttackChecks(config) {
  const app = new URL(config.publicAppUrl);
  const rows = [];
  for (const attack of LIVE_ATTACKS) {
    const requestId = randomUUID();
    const checkedAt = new Date().toISOString();
    try {
      const response = await fetch(new URL(attack.path, app), { method: attack.method, redirect: 'manual', signal: AbortSignal.timeout(15000),
        headers: { 'X-Request-Id': requestId, 'X-Aleph-Attack-Id': attack.attackId, 'X-Attack-Id': attack.attackId, ...(attack.headers ?? {}), ...(attack.body ? { 'Content-Type': 'application/json' } : {}) },
        body: attack.body ? JSON.stringify(attack.body) : undefined });
      const text = await response.text();
      let reason = null;
      try { reason = JSON.parse(text)?.reason ?? null; } catch { /* not JSON */ }
      const passed = attack.pass(response.status, text);
      const serverId = response.headers.get('x-request-id') ?? requestId;
      rows.push({ ...attack, status: response.status, reason, requestId: serverId, checkedAt, result: passed ? 'pass' : 'fail',
        observed: `${attack.method} ${new URL(attack.path, app).href} → HTTP ${response.status}${reason ? ` ${reason}` : ''} (${passed ? '기대대로' : '기대와 다름'}, requestId ${serverId}, ${checkedAt})` });
    } catch (error) {
      // The request never reached the server (e.g. no network in an isolated run): nothing was observed.
      rows.push({ ...attack, status: null, reason: error.cause?.code ?? error.name, requestId: null, checkedAt: null,
        result: 'not_run', observed: 'not_run' });
    }
  }
  for (const item of NOT_SENT) {
    rows.push({ ...item, method: null, path: null, status: null, reason: item.why, requestId: null, checkedAt: null, result: 'not_run', observed: 'not_run' });
  }
  return rows;
}
