// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (config.step !== 4) throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
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
  const githubResponse = await fetch('https://raw.githubusercontent.com/prjsghq7/choi-bujang-secret-vault/main/data.json', { redirect: 'error', signal: AbortSignal.timeout(10000) });
  const githubText = await githubResponse.text();
  return [
    { attackId: 'anonymous_api_read', expected: '비로그인 API 요청이 JSON 401 또는 403으로 차단됨',
      observed: exposed ? '비로그인 API 요청이 차단되지 않음' : `비로그인 API 요청이 JSON 오류로 차단됨 (HTTP ${response.status})` },
    { attackId: 'deployment_secret_search', expected: 'Vercel 배포 번들에 시험 비밀값이 없음',
      observed: /SAMPLE_NOTE_1|실습용 가상/u.test(rootText) ? '배포 응답에서 시험 문구가 발견됨' : `배포 응답에서 시험 문구가 보이지 않음 (HTTP ${rootResponse.status})` },
    { attackId: 'github_static_search', expected: 'GitHub 최신 공개 파일에 메모가 없음',
      observed: /SAMPLE_NOTE_1|실습용 가상/u.test(githubText) ? 'GitHub 최신 data.json에서 시험 문구가 발견됨' : `GitHub 최신 data.json에서 시험 문구가 보이지 않음 (HTTP ${githubResponse.status})` },
  ];
}
