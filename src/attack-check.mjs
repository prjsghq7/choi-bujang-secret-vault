// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (config.step !== 2) throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
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
  const response = await fetch(new URL('/data.json', app), {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  let exposed = false;
  if (response.ok) {
    try {
      const data = await response.json();
      exposed = data?.sampleMarker === 'SAMPLE_NOTE_1'
        || (Array.isArray(data?.notes) && data.notes.length > 0);
    } catch {
      // A non-JSON response is a failed check, not a successful deployment.
    }
  }
  const rootResponse = await fetch(app, { redirect: 'error', signal: AbortSignal.timeout(10000) });
  const rootText = await rootResponse.text();
  const githubResponse = await fetch('https://raw.githubusercontent.com/prjsghq7/choi-bujang-secret-vault/main/data.json', { redirect: 'error', signal: AbortSignal.timeout(10000) });
  const githubText = await githubResponse.text();
  return [
    { attackId: 'anonymous_static_note_read', expected: '공개 정적 data.json에서 메모가 노출되지 않음',
      observed: exposed ? '공개 정적 응답에서 메모 또는 확인 표시가 보임' : `공개 정적 응답에서 메모가 보이지 않음 (HTTP ${response.status})` },
    { attackId: 'deployment_secret_search', expected: 'Vercel 배포 번들에 시험 비밀값이 없음',
      observed: /SAMPLE_NOTE_1|실습용 가상/u.test(rootText) ? '배포 응답에서 시험 문구가 발견됨' : `배포 응답에서 시험 문구가 보이지 않음 (HTTP ${rootResponse.status})` },
    { attackId: 'github_static_search', expected: 'GitHub 최신 공개 파일에 메모가 없음',
      observed: /SAMPLE_NOTE_1|실습용 가상/u.test(githubText) ? 'GitHub 최신 data.json에서 시험 문구가 발견됨' : `GitHub 최신 data.json에서 시험 문구가 보이지 않음 (HTTP ${githubResponse.status})` },
  ];
}
