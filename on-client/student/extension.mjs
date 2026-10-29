// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.

// 상태 코드 → 사람이 읽는 한국어. 공식 계약의 status/mode 값은 그대로 두고 라벨만 덧붙인다.
const DEVICE_STATUS = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
const SESSION_STATUS = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
const MODE_NOTE = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };

// 보안상 정상이 아닌 상태. 색상에만 기대지 않고 텍스트로 "주의"를 덧붙여 정상처럼 보이지 않게 한다.
const DEVICE_WARN = new Set(['noncompliant', 'unknown']);
const SESSION_WARN = new Set(['expired', 'revoked', 'unknown']);

// 접근 판정(decision). allow 만 정상 접근이고 나머지는 주의로 구분한다.
const DECISION_STATUS = { allow: '접근 허용', deny: '접근 거부', challenge: '추가 인증 또는 확인 필요', unknown: '판정 확인 불가' };
const DECISION_WARN = new Set(['deny', 'challenge', 'unknown']);
function decisionLabel(value) {
  // 네 가지 허용값(allow/deny/challenge/unknown)이 아니면 표시 코드도 unknown 으로 정규화한다.
  const code = Object.hasOwn(DECISION_STATUS, value) ? value : 'unknown';
  return `${DECISION_STATUS[code]}(${code})`;
}

// 보안 기록(events)용. kind·접속 상태 라벨.
const KIND_LABEL = { access: '접속 기록', xdr: 'XDR 사건' };
const ACCESS_STATUS = { allowed: '허용됨', denied: '거부됨', unknown: '확인 불가' };
function kindLabel(value) { return `${KIND_LABEL[value] || '기타'}(${value ?? 'unknown'})`; }
function accessLabel(value) { return `${ACCESS_STATUS[value] || '확인 불가'}(${value ?? 'unknown'})`; }
function sessionLabelEvent(value) { return `${SESSION_STATUS[value] || '확인 불가'}(${value ?? 'unknown'})`; }
function deviceLabelEvent(value) { return `${DEVICE_STATUS[value] || '확인 불가'}(${value ?? 'unknown'})`; }
function uniqueValues(arr) { return [...new Set(arr)]; }
// appId 가 없으면 "앱이 없다"가 아니라 "현재 등록 정보로 앱을 확인할 수 없다"는 뜻이다.
function appText(appId) { return appId || '앱 확인 불가'; }

// 「전체(all) + 원래 값」 옵션을 가진 필터 select 한 개를 만든다.
function filterSelect(labelText, value, options, onChange) {
  const wrap = document.createElement('label');
  wrap.className = 'student-filter';
  const caption = document.createElement('span');
  caption.textContent = `${labelText} `;
  const select = document.createElement('select');
  const all = document.createElement('option');
  all.value = 'all';
  all.textContent = '전체';
  select.append(all);
  for (const option of options) {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.text;
    select.append(opt);
  }
  select.value = value;
  select.addEventListener('change', () => onChange(select.value));
  wrap.append(caption, select);
  return wrap;
}

// {id,text} 행 목록(evidence·rules)을 ul 로 그린다.
function textRowList(rows, emptyText) {
  if (!Array.isArray(rows) || rows.length === 0) return line('항목', emptyText);
  const ul = document.createElement('ul');
  ul.className = 'student-text-rows';
  for (const row of rows) {
    const li = document.createElement('li');
    li.textContent = `${row.id}: ${row.text}`;
    ul.append(li);
  }
  return ul;
}

function deviceLabel(status) {
  return `${DEVICE_STATUS[status] || '확인 불가'}(${status ?? 'unknown'})`;
}
function sessionLabel(status) {
  return `${SESSION_STATUS[status] || '확인 불가'}(${status ?? 'unknown'})`;
}

// 한 줄(라벨: 값). innerHTML 없이 createElement·textContent 로만 만든다.
function line(label, value, warn) {
  const p = document.createElement('p');
  p.className = 'identity-line';
  const key = document.createElement('span');
  key.className = 'identity-key';
  key.textContent = `${label}: `;
  const val = document.createElement('span');
  val.className = 'identity-value';
  val.textContent = value;
  p.append(key, val);
  if (warn) {
    p.dataset.warn = 'true';
    const mark = document.createElement('span');
    mark.className = 'identity-warn';
    mark.textContent = ' ⚠ 주의';
    p.append(mark);
  }
  return p;
}

// demo·disconnected·unknown 자료 출처 안내. loading·error 상태에서도 함께 보여 준다.
function modeNote(resource) {
  const note = MODE_NOTE[resource && resource.mode];
  if (!note) return null;
  const p = document.createElement('p');
  p.className = 'identity-mode';
  p.textContent = `자료 출처: ${note}`;
  return p;
}

// 리소스 하나({ status, mode, data?, error? })를 상태별로 그린다.
function section(title, resource, renderOk, errorText, retryHint) {
  const box = document.createElement('section');
  box.className = 'identity-section';
  const heading = document.createElement('h4');
  heading.className = 'identity-title';
  heading.textContent = title;
  box.append(heading);

  const status = resource && resource.status;
  if (status === 'loading') {
    box.append(line('상태', '불러오는 중'));
  } else if (status === 'error') {
    const message = (resource.error && resource.error.message) || '확인 불가';
    box.append(line('상태', `${errorText || '연결 실패'}: ${message}`, true));
    // 자동 재요청을 하지 않으므로 사용자가 직접 다시 불러오도록 안내한다.
    if (retryHint) box.append(line('안내', retryHint));
  } else if (status === 'ok') {
    renderOk(box, resource.data);
  } else {
    box.append(line('상태', '확인 불가', true));
  }

  const note = modeNote(resource);
  if (note) box.append(note);
  return box;
}

// 18단계(AI 사건 설명)용. 접속·세션·기기 상태 이름.
const STATE_PART_NAME = { access: '접속', session: '세션', device: '기기' };
// 안전한 오류 code 별 실패 유형. 근거가 부족하거나 맞지 않으면 그 사실을 이유로 보여 준다.
const EXPLAIN_FAIL_REASON = {
  ON_AI_INVALID_INPUT: '근거 부족: 이 기록의 근거·규칙을 확인할 수 없어 설명을 요청할 수 없습니다.',
  ON_AI_INVALID_OUTPUT: '근거 불일치: AI 설명의 근거 ID·조치·응답 형식이 이 기록과 맞지 않아 쓸 수 없습니다.',
  SUBJECT_SCOPE_UNVERIFIED: '확인 불가: 현재 로그인과 이 기록의 연결을 확인할 수 없습니다.',
  CANCELLED: '취소됨: 이전 응답은 현재 결과가 아닙니다.',
  REQUEST_CANCELLED: '취소됨: 이전 응답은 현재 결과가 아닙니다.',
  WB_CLCO_CANCELLED: '취소됨: 이전 응답은 현재 결과가 아닙니다.',
};

// 성공(ok)으로 전달된 설명을 현재 기록(event)과 다시 대조한다.
// 제공 코드가 이미 검사했더라도, 학생 화면은 근거가 맞지 않는 설명을 성공으로 표시하지 않는다.
// 반환: 문제가 없으면 null, 있으면 { code, reason } (없는 근거 ID 를 만들어 맞추지 않는다).
function explanationProblem(event, data) {
  const evidence = Array.isArray(event.evidence) ? event.evidence : [];
  const evidenceIds = new Set(evidence.map((row) => row && row.id));
  const supported = Array.isArray(event.supportedActions) ? event.supportedActions : [];
  if (!data || typeof data !== 'object') {
    return { code: 'ON_AI_INVALID_OUTPUT', reason: '설명 자료가 없습니다.' };
  }
  if (data.executed !== false) {
    return { code: 'ON_AI_INVALID_OUTPUT', reason: 'AI가 이미 실행했다고 답한 설명은 쓸 수 없습니다. 설명·제안만으로 조치를 실행하지 않습니다.' };
  }
  if (data.requiresHumanConfirmation !== true) {
    return { code: 'ON_AI_INVALID_OUTPUT', reason: '사람 확인 필요(requiresHumanConfirmation=true)가 아닌 설명은 쓸 수 없습니다.' };
  }
  if (evidence.length === 0) {
    return { code: 'ON_AI_INVALID_INPUT', reason: '근거 부족: 이 기록에 근거가 없어 설명을 쓸 수 없습니다.' };
  }
  const cited = Array.isArray(data.evidenceIds) ? data.evidenceIds : [];
  if (cited.length === 0) {
    return { code: 'ON_AI_INVALID_OUTPUT', reason: '근거 부족: 설명이 인용한 근거 ID가 없습니다.' };
  }
  const missing = cited.filter((ref) => !evidenceIds.has(ref));
  if (missing.length > 0) {
    // 다른 기록의 설명이 늦게 도착한 경우도 여기서 걸린다(근거 ID 가 현재 기록에 없음).
    return { code: 'ON_AI_INVALID_OUTPUT', reason: `근거가 맞지 않음: 현재 기록(${event.id})에 없는 근거 ID ${missing.join(', ')}` };
  }
  if (new Set(cited).size !== cited.length || cited.length !== evidenceIds.size) {
    return { code: 'ON_AI_INVALID_OUTPUT', reason: '근거가 맞지 않음: 근거 ID가 중복되거나 이 기록의 근거를 모두 인용하지 않았습니다.' };
  }
  const proposals = Array.isArray(data.proposals) ? data.proposals : [];
  for (const p of proposals) {
    if (!p || !supported.includes(p.action)) {
      return { code: 'ON_AI_INVALID_OUTPUT', reason: `연동 시스템이 지원하지 않는 조치 제안(${p && p.action})이 있어 설명을 쓸 수 없습니다.` };
    }
    const refs = Array.isArray(p.evidenceIds) ? p.evidenceIds : [];
    if (refs.length === 0 || refs.some((ref) => !evidenceIds.has(ref))) {
      return { code: 'ON_AI_INVALID_OUTPUT', reason: `근거가 맞지 않음: 조치 제안(${p.action})의 근거 ID가 현재 기록에 없습니다.` };
    }
  }
  return null;
}

// 설명 실패(오류·근거 부족·근거 불일치) 공통 표시. 성공 속성은 붙이지 않는다.
function appendExplainFailure(box, code, message, reason) {
  box.append(line('상태', `AI 설명 실패: ${message || '확인 불가'}`, true));
  box.append(line('오류 코드', code || '확인 불가'));
  if (reason) box.append(line('실패 이유', reason));
  box.append(line('안내', '기록은 그대로입니다. AI 설명 실패는 과제 실패가 아니며, 업무 앱 판정과 보안 기록은 계속 동작합니다.'));
}

// 19단계(보안 조치 상태)용. status 마다 뜻이 다른 문장. ACK(pending)·전달 중(executing)은 성공이 아니다.
const STATUS_OF_ACTION = {
  idle: '아직 미실행',
  loading: '조치 준비 또는 결과 조회 중 · 미실행',
  prepared: '준비됨 · 미실행(사람 확인 전)',
  executing: '서버에 전달 중 · 결과 없음',
  pending: '서버 접수·처리 중 · 효과 미확인',
  succeeded: '효과 확인',
  denied: '연동 시스템 거절',
  failed: '연동 시스템 실패',
  unknown: '결과 불명 · 효과 없음으로 판단 금지',
  expired: '확인 기한 지남 · 다시 준비 필요',
  error: '요청 처리 안 됨',
};
const ACTION_WARN = new Set(['pending', 'denied', 'failed', 'unknown', 'expired', 'error']);

// 20단계(설치 패키지 취약점 대조)용. 조회 상태·패키지 상태 라벨. 미조회·확인 불가를 "없음"으로 쓰지 않는다.
const SCAN_STATUS_TEXT = {
  complete: '모두 조회',
  partial: '일부 조회 실패',
  not_checked: '아직 조회 안 함',
  not_configured: '조회 준비 미완료',
  unverifiable: 'lock 파일 확인 불가',
};
const PACKAGE_STATUS_TEXT = {
  known_vulnerabilities: '알려진 항목 있음',
  none_found: '알려진 항목 없음(조회 시점 기준)',
  unverifiable: '조회 확인 불가',
};
// package-lock.json 의 정확한 설치 버전(semver). ^·~·x·* 같은 범위는 통과하지 않는다.
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

// 마무리: 내 PC 상태 추이 비교(학생 추가 기능). 제공 카드 「내 PC 상태」의 GET /api/pc/status 를 그대로 쓰고,
// 버튼을 누를 때만 한 번 읽어 최근 표본끼리 차이를 보여 준다. 자동 반복 조회는 하지 않는다.
const PC_SCHEMA = 'aleph.on.pc-status.v1';
const PC_PATH = '/api/pc/status';
const PC_SAMPLE_MAX = 5;
const PC_REASON = {
  permission_denied: '권한 부족(관리자 권한이 필요한 항목이며 바꾸지 않습니다)',
  query_failed: '조회 실패',
  timeout: '시간 초과',
  cancelled: '조회 취소',
  unsupported: '이 운영체제에서 지원하지 않음',
  invalid_response: '응답 형식이 맞지 않음',
};
const SDP_MODE = { connected: 'SDP 연결됨', demo: 'SDP 미연결 · 예제 자료', disconnected: 'SDP 미연결', unknown: 'SDP 연결 확인 불가' };
const isNum = v => typeof v === 'number' && Number.isFinite(v);
function pcReason(metric) { return PC_REASON[metric && metric.reason] || '확인 불가'; }
function percent(part, total) { return isNum(part) && isNum(total) && total > 0 ? Math.round((1000 * part) / total) / 10 : null; }
function gib(bytes) { return `${(bytes / 1024 ** 3).toFixed(1)}GiB`; }
function timeText(ms) { return new Date(ms).toLocaleTimeString('ko-KR', { hour12: false }); }
// 응답 하나를 표본으로 바꾼다. 읽지 못한 값은 null 로 두고 정상값이나 0 으로 채우지 않는다.
function pcSample(data) {
  if (!data || data.schema !== PC_SCHEMA || data.source !== 'local-pc') return null;
  const at = Date.parse(data.measuredAt);
  if (!Number.isFinite(at)) return null;
  const m = data.metrics || {};
  const ok = k => m[k] && m[k].state === 'ok';
  return {
    at,
    metrics: m,
    cpu: ok('cpu') && isNum(m.cpu.usagePercent) ? m.cpu.usagePercent : null,
    memory: ok('memory') ? percent(m.memory.usedBytes, m.memory.totalBytes) : null,
    diskFree: ok('disk') ? percent(m.disk.freeBytes, m.disk.totalBytes) : null,
  };
}
function deltaText(now, before) {
  if (now === null || before === null || before === undefined) return '비교 불가';
  const d = Math.round((now - before) * 10) / 10;
  return d === 0 ? '변화 없음' : `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}%p`;
}

export function createStudentView({ api, onChange } = {}) {
  // 20단계: 마지막으로 표시한 패키지 조회 시각. 이보다 오래된 응답은 늦게 도착한 이전 응답으로 보고 표시하지 않는다.
  let lastVulnCheckedMs = NaN;
  // 마무리: PC 추이 표본(메모리에만, 최신이 맨 앞), 진행 중 여부, 마지막 실패, 다시 그린 뒤 버튼 초점 복원 여부.
  const pc = { samples: [], pending: false, failure: null, refocus: false };
  async function refreshPc() {
    if (pc.pending || !api || typeof api.get !== 'function') return;
    pc.pending = true;
    pc.refocus = true;
    if (onChange) onChange();
    let result;
    try { result = await api.get(PC_PATH); } catch { result = { ok: false, error: { code: 'NETWORK_ERROR', message: '조회 중 오류가 났습니다.' } }; }
    pc.pending = false;
    const sample = result && result.ok ? pcSample(result.data) : null;
    if (sample) {
      // 이미 표시한 표본보다 오래된(늦게 도착한) 응답은 쓰지 않는다.
      if (!pc.samples.length || sample.at > pc.samples[0].at) pc.samples = [sample, ...pc.samples].slice(0, PC_SAMPLE_MAX);
      pc.failure = null;
    } else if (result && result.ok) {
      pc.failure = { code: 'INVALID_RESPONSE', message: '내 PC 상태 응답 형식이 계약(aleph.on.pc-status.v1)과 다릅니다.' };
    } else {
      pc.failure = (result && result.error) || { code: 'UNKNOWN_ERROR', message: '확인 불가' };
    }
    pc.refocus = true;
    if (onChange) onChange();
  }
  function renderPcTrend(sdpMode) {
    const box = document.createElement('section');
    box.className = 'identity-section';
    box.setAttribute('aria-label', '내 PC 상태 추이 비교');
    const heading = document.createElement('h4');
    heading.className = 'identity-title';
    heading.textContent = '내 PC 상태 추이 비교 (학생 추가 기능)';
    box.append(heading);
    box.append(line('안내', '위쪽 제공 카드 「내 PC 상태」와 같은 읽기 전용 조회를 버튼을 누를 때만 한 번 읽고, 최근 표본끼리 차이를 비교합니다.'));

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = pc.pending ? '조회 중…' : '다시 조회';
    button.disabled = pc.pending;
    button.setAttribute('aria-busy', pc.pending ? 'true' : 'false');
    button.addEventListener('click', refreshPc);
    box.append(button);
    if (pc.refocus && !pc.pending) {
      pc.refocus = false;
      queueMicrotask(() => { if (button.isConnected) button.focus(); });
    }

    const live = document.createElement('div');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    box.append(live);
    if (pc.pending) live.append(line('상태', '내 PC 값을 읽는 중입니다(약 1~5초).'));

    if (pc.failure) {
      live.append(line('조회 실패', `${pc.failure.code}: ${pc.failure.message || '확인 불가'}`, true));
      const next = pc.failure.code === 'NOT_ALLOWED'
        ? '이 시작 틀은 학생 코드의 PC 조회를 허용하지 않습니다. 시작 틀을 0.2.18 이상으로 업데이트하세요.'
        : '앱 서버가 켜져 있는지 확인한 뒤 「다시 조회」를 누르세요. 아래 값은 이전에 성공한 표본이며 이번 조회 결과가 아닙니다.';
      live.append(line('다음 할 일', next));
    }

    const [latest, previous] = pc.samples;
    if (!latest) {
      if (!pc.pending && !pc.failure) box.append(line('표본', '아직 조회하지 않았습니다. 「다시 조회」를 눌러 첫 값을 읽으세요.'));
    } else {
      const m = latest.metrics;
      box.append(line('측정 시각', `${timeText(latest.at)} · 출처: 이 PC 실측(local-pc)${pc.failure ? ' · 마지막 성공 표본' : ''}`));
      const row = (label, value, warnWhenNull, prevValue, unitText) => box.append(line(
        label,
        value === null ? `확인 불가 · ${unitText}` : `${value}% · ${unitText} · 직전 대비 ${deltaText(value, prevValue)}`,
        value === null && warnWhenNull,
      ));
      row('CPU 사용률', latest.cpu, true, previous && previous.cpu, latest.cpu === null ? pcReason(m.cpu) : '200ms 표본');
      row('메모리 사용', latest.memory, true, previous && previous.memory,
        latest.memory === null ? pcReason(m.memory) : `${gib(m.memory.usedBytes)} / ${gib(m.memory.totalBytes)}`);
      row('디스크 남은 공간', latest.diskFree, true, previous && previous.diskFree,
        latest.diskFree === null ? pcReason(m.disk) : `${gib(m.disk.freeBytes)} 남음(앱 폴더 드라이브)`);
      if (latest.memory !== null && latest.memory >= 90) box.append(line('메모리', '사용량이 90% 이상입니다. 안 쓰는 프로그램을 닫아 보세요', true));
      if (latest.diskFree !== null && latest.diskFree < 10) box.append(line('디스크', '남은 공간이 10% 미만입니다', true));

      const net = m.network || {};
      box.append(line('네트워크 구성', net.state === 'ok' ? `외부 인터페이스 ${net.interfaceCount}개 · IPv4 주소 ${net.ipv4Count}개` : `확인 불가 · ${pcReason(net)}`, net.state !== 'ok'));
      const fw = m.firewall || {};
      box.append(line('방화벽(읽기만)', fw.state === 'ok'
        ? fw.profiles.map(p => `${p.name} ${p.enabled ? '켜짐' : '꺼짐'}`).join(' · ')
        : `확인 불가 · ${pcReason(fw)}`, fw.state !== 'ok' || fw.profiles.some(p => !p.enabled)));
      const ev = m.events || {};
      box.append(line('Windows 기록(24시간)', ev.state === 'ok'
        ? `경고 ${ev.warningCount}건 · 오류 ${ev.errorCount}건${ev.truncated ? ' · 최근 5,000건까지만 집계(일부)' : ''}`
        : `확인 불가 · ${pcReason(ev)}`, ev.state !== 'ok'));
      box.append(line('주의', '경고·오류 건수는 침해나 공격 탐지 결과가 아니며, 0건이거나 방화벽이 켜져 있다고 PC가 안전하다는 뜻도 아닙니다.'));
      if (pc.samples.length < 2) box.append(line('비교', '표본이 하나뿐이라 아직 비교할 수 없습니다. 잠시 뒤 「다시 조회」를 누르세요.'));
      else box.append(line('표본', `최근 ${pc.samples.length}개(최대 ${PC_SAMPLE_MAX}개, 앱을 새로 고치면 지워짐): ${pc.samples.map(s => timeText(s.at)).join(' · ')}`));
    }
    box.append(line('SDP 연결(PC 조회와 별개)', SDP_MODE[sdpMode] || SDP_MODE.unknown, sdpMode !== 'connected'));
    return box;
  }
  return {
    // 13단계: 지금 로그인한 사용자·기기·세션을 상태에 맞게 보여 주고,
    // 다시 불러오면 새 값으로 바꾼다. 오류일 때 이전 사용자 값을 남기지 않는다
    // (매 호출마다 새 DOM 요소 하나를 만들어 돌려주므로 이전 표시는 교체된다).
    renderIdentity(identity) {
      const data = identity || {};
      const root = document.createElement('div');
      root.className = 'student-identity';

      // 현재 로그인한 사용자·기기·세션 (GET /api/me)
      root.append(section('현재 계정', data.me, (box, me) => {
        const user = (me && me.user) || {};
        const device = (me && me.device) || {};
        const session = (me && me.session) || {};
        box.append(line('사용자', user.label || user.id || '확인 불가'));
        box.append(line(
          '기기',
          `${device.label || device.id || '확인 불가'} · ${deviceLabel(device.status)}`,
          DEVICE_WARN.has(device.status),
        ));
        box.append(line(
          '세션',
          `${session.id || '확인 불가'} · ${sessionLabel(session.status)}`,
          SESSION_WARN.has(session.status),
        ));
      }));

      // 현재 사용자에게 등록된 기기 목록 (GET /api/devices)
      root.append(section('등록 기기', data.devices, (box, list) => {
        const rows = Array.isArray(list) ? list : [];
        if (rows.length === 0) {
          box.append(line('목록', '표시할 기기가 없습니다.'));
          return;
        }
        for (const device of rows) {
          box.append(line(
            device.label || device.id || '기기',
            deviceLabel(device.status),
            DEVICE_WARN.has(device.status),
          ));
        }
      }));

      // 현재 확인된 세션 (GET /api/sessions)
      root.append(section('세션', data.sessions, (box, list) => {
        const rows = Array.isArray(list) ? list : [];
        if (rows.length === 0) {
          box.append(line('목록', '표시할 세션이 없습니다.'));
          return;
        }
        for (const session of rows) {
          box.append(line(
            session.id || '세션',
            sessionLabel(session.status),
            SESSION_WARN.has(session.status),
          ));
        }
      }));

      return root;
    },
    // 14단계: 선택한 업무 앱 한 개의 접근 판정과 이유·시각을 표시한다.
    // renderIdentity 는 그대로 두고 renderDecision 만 구현한다.
    // 받는 값: { status, mode, data?, error?, appId }
    //   status idle(요청 전)·loading·ok·error, ok 의 data = { appId, decision, reason, checkedAt }
    renderDecision(decision) {
      const info = decision || {};
      const appId = info.appId || (info.data && info.data.appId) || null;
      const root = document.createElement('div');
      root.className = 'student-decision';

      const box = document.createElement('section');
      box.className = 'identity-section';
      const heading = document.createElement('h4');
      heading.className = 'identity-title';
      heading.textContent = appId ? `접근 판정 · 앱 ${appId}` : '접근 판정';
      box.append(heading);

      const status = info.status;
      if (status === 'idle') {
        box.append(line('상태', '접근 요청 전입니다. 업무 앱을 선택해 접근을 요청하세요.'));
      } else if (status === 'loading') {
        box.append(line('상태', `${appId ? `앱 ${appId} ` : ''}접속 판정 요청 중`));
      } else if (status === 'error') {
        // 요청 실패·확인 불가는 접근 거부(deny)와 다르다. 텍스트로 분명히 구분한다.
        const message = (info.error && info.error.message) || '확인 불가';
        box.append(line('상태', `판정 요청 실패: ${message}`, true));
        box.append(line('구분', '요청 실패·확인 불가는 접근 거부(deny) 판정이 아닙니다.'));
      } else if (status === 'ok') {
        const data = info.data || {};
        const unknownDecision = !DECISION_STATUS[data.decision];
        box.append(line('판정', decisionLabel(data.decision), DECISION_WARN.has(data.decision) || unknownDecision));
        // challenge 는 이 화면이 추가 확인을 대신 수행하지 않음을 분명히 한다(서버 사유에 의존하지 않음).
        if (data.decision === 'challenge') {
          box.append(line('안내', '이 앱은 추가 확인 절차를 대신 수행하지 않습니다.'));
        }
        box.append(line('사유', data.reason || '사유 정보 없음'));
        box.append(line('판정 시각', data.checkedAt || '확인 불가'));
      } else {
        box.append(line('상태', '확인 불가', true));
      }

      const note = modeNote(info);
      if (note) box.append(note);
      root.append(box);
      return root;
    },
    // 15단계: 본인 보안 기록을 최신순 정렬·필터링하고, 기록별 근거·규칙·상태를 상세로 본다.
    // renderEvents 만 구현한다. 받는 값: { status, mode, data?, error? }
    //   data = [{ id, kind, at, appId, summary, evidence:[{id,text}], rules:[{id,text}],
    //            state:{access,session,device}, supportedActions:[id] }]
    renderEvents(eventsResource) {
      const res = eventsResource || {};
      const root = document.createElement('div');
      root.className = 'student-events';

      const status = res.status;
      if (status === 'loading') {
        root.append(line('상태', '기록을 불러오는 중'));
        const note = modeNote(res); if (note) root.append(note);
        return root;
      }
      if (status === 'error') {
        // 조회 실패. 이전 목록을 현재 결과처럼 남기지 않는다(매 호출 새 요소 반환).
        const message = (res.error && res.error.message) || '확인 불가';
        root.append(line('상태', '기록을 불러오지 못했습니다', true));
        root.append(line('사유', message));
        const note = modeNote(res); if (note) root.append(note);
        return root;
      }
      if (status !== 'ok') {
        root.append(line('상태', '아직 기록을 불러오지 않았습니다.'));
        return root;
      }

      const note = modeNote(res); if (note) root.append(note);

      // 원본을 수정하지 않도록 복사본을 at 기준 최신순으로 정렬한다.
      const events = (Array.isArray(res.data) ? res.data.slice() : [])
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

      if (events.length === 0) {
        root.append(line('상태', '표시할 기록이 없습니다'));
        return root;
      }

      // 필터·상세 선택 상태. renderEvents 가 다시 불릴 때(재조회) 초기화된다.
      let filterKind = 'all';
      let filterApp = 'all';
      let filterAccess = 'all';
      let selectedId = null;

      const filters = document.createElement('div');
      filters.className = 'student-filters';
      const countLine = document.createElement('p');
      countLine.className = 'identity-line';
      const listBox = document.createElement('div');
      const detailBox = document.createElement('div');
      detailBox.className = 'student-event-detail';

      const matched = () => events.filter((event) =>
        (filterKind === 'all' || event.kind === filterKind)
        && (filterApp === 'all' || appText(event.appId) === filterApp)
        && (filterAccess === 'all' || event.state.access === filterAccess));

      function drawList() {
        listBox.textContent = '';
        const rows = matched();
        countLine.textContent = `표시 ${rows.length}건 / 전체 ${events.length}건`;
        if (rows.length === 0) {
          listBox.append(line('목록', '조건에 맞는 기록이 없습니다'));
          return;
        }
        const ul = document.createElement('ul');
        ul.className = 'student-event-list';
        for (const event of rows) {
          const li = document.createElement('li');
          li.dataset.studentEventId = event.id;
          const headline = document.createElement('p');
          headline.className = 'student-event-head';
          const appPart = event.appId ? `앱 ${event.appId}` : '앱 확인 불가';
          headline.textContent = `${event.id} · ${event.at} · ${kindLabel(event.kind)} · ${appPart}`;
          const summary = document.createElement('p');
          summary.textContent = event.summary;
          const detailButton = document.createElement('button');
          detailButton.type = 'button';
          detailButton.textContent = `${event.id} 상세`;
          detailButton.addEventListener('click', () => { selectedId = event.id; drawDetail(); });
          li.append(headline, summary, detailButton);
          ul.append(li);
        }
        listBox.append(ul);
      }

      function drawDetail() {
        detailBox.textContent = '';
        if (selectedId == null) { delete detailBox.dataset.studentEventDetail; return; }
        const event = events.find((row) => row.id === selectedId);
        if (!event) { delete detailBox.dataset.studentEventDetail; return; }
        // 상세가 어떤 기록을 보여 주는지 data 속성으로 노출한다(className 으로 대체하지 않는다).
        detailBox.dataset.studentEventDetail = event.id;
        const heading = document.createElement('h4');
        heading.className = 'identity-title';
        heading.textContent = `${event.id} 상세`;
        detailBox.append(heading);
        // appId 없음은 "앱이 없다"가 아니라 "등록 정보로 앱 확인 불가"를 뜻한다.
        detailBox.append(line('앱', event.appId || '확인 불가(등록 정보로 앱 식별 불가)', !event.appId));
        detailBox.append(line('접속', accessLabel(event.state.access), event.state.access !== 'allowed'));
        detailBox.append(line('세션', sessionLabelEvent(event.state.session), SESSION_WARN.has(event.state.session)));
        detailBox.append(line('기기', deviceLabelEvent(event.state.device), DEVICE_WARN.has(event.state.device)));
        const evidenceTitle = document.createElement('p');
        evidenceTitle.className = 'student-event-subtitle';
        evidenceTitle.textContent = '근거(evidence)';
        detailBox.append(evidenceTitle, textRowList(event.evidence, '근거 없음'));
        const rulesTitle = document.createElement('p');
        rulesTitle.className = 'student-event-subtitle';
        rulesTitle.textContent = '규칙(rules)';
        detailBox.append(rulesTitle, textRowList(event.rules, '규칙 없음'));
        // 미지원 조치가 입력된 경우에만 「<action> 미지원」 비활성 버튼을 표시한다(요청 전송 없음).
        const actions = Array.isArray(event.supportedActions) ? event.supportedActions : [];
        if (actions.length > 0) {
          const actionsTitle = document.createElement('p');
          actionsTitle.className = 'student-event-subtitle';
          actionsTitle.textContent = '조치(현재 미지원)';
          detailBox.append(actionsTitle);
          for (const action of actions) {
            const actionButton = document.createElement('button');
            actionButton.type = 'button';
            actionButton.disabled = true;
            actionButton.textContent = `${action} 미지원`;
            detailBox.append(actionButton);
          }
        }
      }

      const kindOptions = uniqueValues(events.map((e) => e.kind)).map((v) => ({ value: v, text: kindLabel(v) }));
      const appOptions = uniqueValues(events.map((e) => appText(e.appId))).map((v) => ({ value: v, text: v }));
      const accessOptions = uniqueValues(events.map((e) => e.state.access)).map((v) => ({ value: v, text: accessLabel(v) }));

      filters.append(
        filterSelect('기록 종류', filterKind, kindOptions, (v) => { filterKind = v; drawList(); }),
        filterSelect('업무 앱', filterApp, appOptions, (v) => { filterApp = v; drawList(); }),
        filterSelect('접속 상태', filterAccess, accessOptions, (v) => { filterAccess = v; drawList(); }),
      );

      root.append(filters, countLine, listBox, detailBox);
      drawList();
      drawDetail();
      return root;
    },
    // 16단계: 알림·기기·세션·진단 정보를 상태별로 정리하고, 없음과 조회 실패를 구분한다.
    // 받는 값: { devices, sessions, notifications:[{resource,code,message}], diagnostics, mode }
    //   devices·sessions·diagnostics 는 { status, mode, data?, error? }
    renderStatus(statusData) {
      const data = statusData || {};
      const root = document.createElement('div');
      root.className = 'student-status';

      // 알림: resource·code·message 를 항목별로. 없으면 "알림 없음".
      const notiBox = document.createElement('section');
      notiBox.className = 'identity-section';
      const notiTitle = document.createElement('h4');
      notiTitle.className = 'identity-title';
      notiTitle.textContent = '알림';
      notiBox.append(notiTitle);
      const notifications = Array.isArray(data.notifications) ? data.notifications : [];
      if (notifications.length === 0) {
        notiBox.append(line('알림', '알림 없음'));
      } else {
        for (const item of notifications) {
          notiBox.append(line(`${item.resource}·${item.code}`, item.message || '메시지 없음', true));
        }
      }
      root.append(notiBox);

      // 기기: loading / ok(빈 목록 포함) / error 분리
      root.append(section('기기', data.devices, (box, list) => {
        const rows = Array.isArray(list) ? list : [];
        if (rows.length === 0) { box.append(line('목록', '표시할 기기가 없습니다')); return; }
        for (const device of rows) {
          box.append(line(device.label || device.id || '기기', deviceLabelEvent(device.status), DEVICE_WARN.has(device.status)));
        }
      }, '기기를 불러오지 못했습니다', '위쪽 「다시 불러오기」 버튼을 직접 눌러 다시 시도하세요.'));

      // 세션: 현재 검증된 연결 한 개 범위
      const sessionBox = section('세션', data.sessions, (box, list) => {
        const rows = Array.isArray(list) ? list : [];
        if (rows.length === 0) { box.append(line('목록', '표시할 세션이 없습니다')); return; }
        for (const session of rows) {
          box.append(line(session.id || '세션', sessionLabelEvent(session.status), SESSION_WARN.has(session.status)));
        }
      }, '세션을 불러오지 못했습니다', '위쪽 「다시 불러오기」 버튼을 직접 눌러 다시 시도하세요.');
      // 세션 범위를 화면 글자로 알린다(주석이 아니라 표시 문장).
      sessionBox.append(line('안내', '현재 검증된 연결 하나이며 지난 세션 목록이 아닙니다.'));
      root.append(sessionBox);

      // 진단 정보: 제공 화면이 전달한 결과만 표시(학생이 /api/diagnostics 직접 호출하지 않음).
      const diag = data.diagnostics || {};
      const diagBox = document.createElement('section');
      diagBox.className = 'identity-section';
      const diagTitle = document.createElement('h4');
      diagTitle.className = 'identity-title';
      diagTitle.textContent = '진단 정보';
      diagBox.append(diagTitle);
      if (diag.status === 'loading') {
        diagBox.append(line('상태', '진단 정보를 불러오는 중'));
      } else if (diag.status === 'error') {
        diagBox.append(line('상태', '진단 정보를 불러오지 못했습니다', true));
        diagBox.append(line('사유', (diag.error && diag.error.message) || '확인 불가'));
      } else if (diag.status === 'ok') {
        const d = diag.data || {};
        const engine = d.engine || {};
        const fields = [
          ['requestId', d.requestId], ['component', d.component], ['version', d.version],
          ['checkedAt', d.checkedAt], ['engine.mode', engine.mode], ['engine.code', engine.code],
        ];
        for (const [name, value] of fields) diagBox.append(line(name, value ?? '확인 불가'));
        diagBox.append(line('안내', '문제 해결을 위한 도움 요청에 사용할 정보를 복사합니다.'));
        const copyStatus = document.createElement('p');
        copyStatus.className = 'identity-line';
        const copyButton = document.createElement('button');
        copyButton.type = 'button';
        copyButton.textContent = '도움정보 복사';
        copyButton.addEventListener('click', () => {
          // 비밀 없는 진단 6개 필드만 복사한다.
          const text = fields.map(([name, value]) => `${name}: ${value ?? '확인 불가'}`).join('\n');
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
              .then(() => { copyStatus.textContent = '도움정보를 복사했습니다.'; })
              .catch(() => { copyStatus.textContent = '복사하지 못했습니다.'; });
          } else {
            copyStatus.textContent = '이 브라우저에서 복사를 지원하지 않습니다.';
          }
        });
        diagBox.append(copyButton, copyStatus);
      } else {
        diagBox.append(line('상태', '진단 정보 없음'));
      }
      root.append(diagBox);

      // 마무리: 학생 추가 기능(내 PC 상태 추이 비교).
      root.append(renderPcTrend(data.mode));

      const note = modeNote({ mode: data.mode });
      if (note) root.append(note);
      return root;
    },
    // 20단계: package-lock.json 의 실제 설치 버전을 OSV 취약점 정보와 대조한 결과를 보여 준다.
    // 받는 값: { status: idle|loading|error|ok, mode, data?, error? }
    //   data = { status: complete|partial|not_checked|not_configured|unverifiable, code?, lockfileVersion?, lockfileHash?,
    //            excluded?, checkedAt, packages:[{ name, version, status, vulnerabilities:[{id,modified}], source, checkedAt }] }
    // 매 호출 새 DOM 을 돌려준다. 다시 조회하면 새 lockfileHash·결과로 통째로 바뀌고, 조회 중·실패일 때 이전 표를 남기지 않는다.
    // 조회 실패·미조회·확인 불가는 "취약점 없음"으로 표시하지 않는다.
    renderVulnerabilities(vulnData) {
      const res = vulnData || {};
      const root = document.createElement('div');
      root.className = 'student-vulnerabilities';
      const box = document.createElement('section');
      box.className = 'identity-section';
      const heading = document.createElement('h4');
      heading.className = 'identity-title';
      heading.textContent = '설치 패키지 취약점 대조(OSV)';
      box.append(heading);
      root.append(box);
      const finish = () => {
        const note = modeNote(res);
        if (note) box.append(note);
        return root;
      };

      if (res.status === 'idle') {
        box.append(line('상태', '조회 전'));
        box.append(line('안내', '아직 조회하지 않았으므로 취약점이 없다는 뜻이 아닙니다. 「설치 패키지 조회」를 직접 누르세요.'));
        return finish();
      }
      if (res.status === 'loading') {
        // 이전 표를 현재 결과처럼 남기지 않는다.
        box.append(line('상태', '조회 중'));
        box.append(line('안내', '이전 조회 결과는 지웠습니다. 취소하면 늦게 도착한 응답은 표시하지 않습니다.'));
        return finish();
      }
      if (res.status !== 'ok') {
        const err = res.error || {};
        box.append(line('상태', `조회 실패: ${err.message || '확인 불가'}`, true));
        box.append(line('오류 코드', err.code || '확인 불가'));
        box.append(line('안내', '조회 실패는 "취약점 없음"이 아닙니다. 이전 결과를 현재 결과로 보지 않습니다. 「설치 패키지 조회」를 직접 눌러 새로 조회하세요.'));
        return finish();
      }

      const data = res.data || {};
      // 늦게 도착한 이전 조회 응답 차단: 이미 표시한 결과보다 오래된 조회 시각이면 현재 결과로 쓰지 않는다.
      const checkedMs = Date.parse(data.checkedAt);
      if (Number.isFinite(lastVulnCheckedMs) && Number.isFinite(checkedMs) && checkedMs < lastVulnCheckedMs) {
        box.append(line('상태', '이전 조회 응답이라 표시하지 않습니다', true));
        box.append(line('안내', '더 최근 조회 결과가 이미 있습니다. 필요하면 「설치 패키지 조회」를 직접 다시 누르세요.'));
        return finish();
      }
      if (Number.isFinite(checkedMs)) lastVulnCheckedMs = checkedMs;

      const scanStatus = Object.hasOwn(SCAN_STATUS_TEXT, data.status) ? data.status : 'unverifiable';
      box.append(line('조회 상태', `${SCAN_STATUS_TEXT[scanStatus]}(${scanStatus})`, scanStatus !== 'complete'));
      if (data.code) box.append(line('코드', data.code));
      box.append(line('설치 목록 원천', 'package-lock.json(실제 설치 버전)'));
      box.append(line('lockfileVersion', data.lockfileVersion != null ? String(data.lockfileVersion) : '확인 불가'));
      box.append(line('lockfileHash', data.lockfileHash || '확인 불가'));
      box.append(line('조회 시각(checkedAt)', data.checkedAt || '확인 불가'));
      if (data.excluded && Number.isSafeInteger(data.excluded.count)) {
        box.append(line('조회 제외', `${data.excluded.count}건(허용 목록 밖·비공개 패키지는 외부로 보내 조회하지 않음)`));
      }
      if (scanStatus === 'not_checked' || scanStatus === 'not_configured' || scanStatus === 'unverifiable') {
        box.append(line('안내', '조회하지 못한 상태이며 "취약점 없음"이 아닙니다.'));
      }
      if (scanStatus === 'partial') {
        box.append(line('안내', '일부 패키지 조회가 실패했습니다. 이미 받은 취약점 ID 는 지우지 않고 보여 줍니다.'));
      }

      const packages = Array.isArray(data.packages) ? data.packages : [];
      if (packages.length === 0) {
        box.append(line('패키지', scanStatus === 'complete' ? '조회 대상 패키지가 없습니다.' : '표시할 패키지 결과가 없습니다(미조회·확인 불가).'));
        return finish();
      }
      const list = document.createElement('ul');
      list.className = 'student-packages';
      for (const pkg of packages) {
        const vulns = Array.isArray(pkg.vulnerabilities) ? pkg.vulnerabilities : [];
        // ^1.2.0 같은 범위는 정확한 설치 버전이 아니므로 대조 결과로 쓰지 않는다.
        const exact = typeof pkg.version === 'string' && EXACT_VERSION.test(pkg.version);
        let pkgStatus = Object.hasOwn(PACKAGE_STATUS_TEXT, pkg.status) ? pkg.status : 'unverifiable';
        if (!exact) pkgStatus = 'unverifiable';
        const li = document.createElement('li');
        li.className = 'student-package';
        li.dataset.studentPackageName = pkg.name;
        li.dataset.studentPackageVersion = pkg.version;
        const statusText = pkgStatus === 'unverifiable' && vulns.length > 0
          ? '일부 확인·전체 조회 확인 불가'
          : PACKAGE_STATUS_TEXT[pkgStatus];
        li.append(line('패키지', `${pkg.name}@${pkg.version}`));
        li.append(line('설치 버전', exact ? `${pkg.version}(package-lock.json 정확한 버전)` : `${pkg.version}(정확한 설치 버전 아님 · 확인 불가)`, !exact));
        li.append(line('결과', `${statusText}(${pkgStatus})`, pkgStatus !== 'none_found'));
        li.append(line('출처(source)', pkg.source || '확인 불가'));
        li.append(line('조회 시각(checkedAt)', pkg.checkedAt || '확인 불가'));
        if (vulns.length > 0) {
          const ul = document.createElement('ul');
          ul.className = 'student-text-rows';
          for (const v of vulns) {
            const item = document.createElement('li');
            item.textContent = `${v.id} · 수정 시각(modified) ${v.modified || '확인 불가'}`;
            ul.append(item);
          }
          li.append(ul);
        }
        list.append(li);
      }
      box.append(list);
      return finish();
    },
    // 17단계: AI 연결 점검 결과(idle/loading/ok/error)를 표시한다.
    // 연결 점검과 실제 사건 설명 실행은 다르다는 것을 분명히 한다. 매 호출 새 DOM 반환(이전 결과 미보관).
    // 받는 값: { status, mode, data?, error?, checkedAt, explanationAccepted }
    //   data(ok) = { transportChecked, audienceAuthorization:'test'|'verified', modelCount, help }
    renderAiConnection(aiData) {
      const info = aiData || {};
      const root = document.createElement('div');
      root.className = 'student-ai-connection';
      const box = document.createElement('section');
      box.className = 'identity-section';
      const heading = document.createElement('h4');
      heading.className = 'identity-title';
      heading.textContent = 'AI 연결 점검';
      box.append(heading);

      const status = info.status;
      if (status === 'loading') {
        box.append(line('상태', 'AI 모델 응답을 점검하는 중'));
      } else if (status === 'error') {
        // 공개 오류 code 로 유형을 나누고, 키 입력·복사가 아니라 계정 연결·담당자 확인을 안내한다.
        const err = info.error || {};
        const code = (err.code || '').toUpperCase();
        box.append(line('상태', 'AI 연결 점검 실패', true));
        box.append(line('코드', err.code || '확인 불가'));
        box.append(line('사유', err.message || '확인 불가'));
        let kind;
        let recovery;
        if (/PROVISION|PENDING|PREP/.test(code)) {
          kind = '권한 준비 중';
          recovery = '앱 이용 권한의 발급·연결이 준비 중입니다. 계정 연결을 다시 확인하고 담당자에게 확인을 요청하세요.';
        } else if (/AUTH|CREDENTIAL|SIGNIN|LOGIN/.test(code)) {
          kind = '인증 실패';
          recovery = '계정 연결이 확인되지 않았습니다. 계정 연결을 다시 확인하세요. API 키를 입력하거나 복사하지 않습니다.';
        } else if (/FORBID|ACCESS|DENIED|PERMISSION|SCOPE/.test(code)) {
          kind = '접근 제한';
          recovery = '이 계정으로는 접근이 제한됩니다. 계정 연결을 다시 확인하고 담당자에게 권한을 확인하세요.';
        } else if (/TIMEOUT/.test(code)) {
          kind = '시간 초과';
          recovery = '응답이 지연됐습니다. 잠시 뒤 「현재 API 연결 점검」을 직접 다시 누르세요.';
        } else if (/CANCEL/.test(code)) {
          kind = '취소됨';
          recovery = '점검이 취소됐습니다. 필요하면 「현재 API 연결 점검」을 직접 다시 누르세요.';
        } else if (/MODEL/.test(code)) {
          kind = '모델 없음';
          recovery = '응답한 모델이 없습니다. 계정 연결과 권한을 확인한 뒤 「현재 API 연결 점검」을 직접 다시 누르세요.';
        } else if (/NETWORK/.test(code)) {
          kind = '확인 불가(네트워크 가능성)';
          recovery = '네트워크 상태가 원인일 수 있습니다(단정할 수 없음). 연결을 확인한 뒤 「현재 API 연결 점검」을 직접 다시 누르세요.';
        } else {
          kind = '확인 불가';
          recovery = '원인을 단정할 수 없습니다. 네트워크 상태를 확인한 뒤 「현재 API 연결 점검」을 직접 다시 누르세요. 계속되면 담당자에게 확인을 요청하세요.';
        }
        box.append(line('유형', kind));
        box.append(line('복구 안내', recovery));
      } else if (status === 'ok') {
        const data = info.data || {};
        const verified = data.audienceAuthorization === 'verified';
        box.append(line('점검 결과', verified
          ? '앱 권한 확인 후 모델 응답 점검(verified)'
          : '시험 transport 모델 응답 점검(test) · 실제 게이트 수용 아님'));
        box.append(line('응답 모델 수', String(data.modelCount ?? '확인 불가')));
        box.append(line('점검 시각', info.checkedAt || '확인 불가'));
        box.append(line('안내', '이 점검은 사건 설명을 실행한 것이 아닙니다. 사건 설명 결과는 보안 기록에서 별도로 확인합니다.'));
      } else {
        box.append(line('상태', 'AI 연결 점검 전입니다. 설정값이 있어도 이용 권한이 확인된 것은 아닙니다.'));
      }
      // 자동 재시도 없음(모든 상태 공통). 필요하면 사용자가 직접 재점검한다.
      box.append(line('재점검', '자동으로 다시 점검하지 않습니다. 필요하면 「현재 API 연결 점검」 버튼을 직접 누르세요.'));
      const note = modeNote(info);
      if (note) box.append(note);
      root.append(box);
      return root;
    },
    // 18단계: 선택한 기록의 AI 설명을 그 기록의 근거·규칙·현재 상태와 이어서 보여 준다.
    // 받는 값: { event, explanation:{status,mode,data?,error?}, checkedAt }
    //   explanation.data(ok) = { summary, evidenceIds, proposals:[{action,evidenceIds,reason}], requiresHumanConfirmation:true, executed:false }
    // 매 호출마다 새 DOM 을 만들어 돌려준다. 다른 기록 선택·다시 불러오기·실패 시 이전 설명과
    // 성공 속성(data-student-explanation-event)은 남지 않는다(이전 요소를 보관·재사용하지 않음).
    // 성공 속성은 아래 ok 분기에서 현재 기록과의 대조를 모두 통과한 설명에만 붙인다.
    // 실행 버튼은 만들지 않는다. AI 설명은 참고 정보이며 설명·제안만으로 조치를 실행하지 않는다.
    renderExplanation(explanationData) {
      const info = explanationData || {};
      const exp = info.explanation || {};
      const event = info.event || null;
      const root = document.createElement('div');
      root.className = 'student-explanation';
      const box = document.createElement('section');
      box.className = 'identity-section';
      const heading = document.createElement('h4');
      heading.className = 'identity-title';
      heading.textContent = 'AI 설명(참고용)';
      box.append(heading);
      root.append(box);
      const finish = () => {
        const note = modeNote(exp);
        if (note) box.append(note);
        return root;
      };

      // 1) 오류가 있으면 event 가 null 이어도 실패 이유를 먼저 보여 준다
      //    (근거·규칙이 부족한 기록은 제공 코드가 event 를 null 로 넘긴다).
      if (exp.status === 'error') {
        const err = exp.error || {};
        if (event && event.id) box.append(line('사건 ID', event.id));
        appendExplainFailure(box, err.code, err.message, EXPLAIN_FAIL_REASON[err.code] || '원인을 단정할 수 없습니다. 필요하면 설명을 직접 다시 요청하세요.');
        return finish();
      }
      if (!event) {
        box.append(line('상태', '보안 기록에서 기록을 먼저 고르세요.'));
        return finish();
      }
      box.append(line('사건 ID', event.id));

      if (exp.status === 'loading') {
        box.append(line('상태', '설명 요청 중'));
        box.append(line('안내', `이전 설명은 지웠습니다. 도착한 설명은 이 기록(${event.id})의 근거와 대조한 뒤에만 표시합니다.`));
        return finish();
      }
      if (exp.status !== 'ok') {
        box.append(line('상태', '아직 설명을 요청하지 않았습니다. 보안 기록에서 「AI 설명」을 직접 누르세요.'));
        return finish();
      }

      // 2) ok 라도 현재 기록과 맞지 않으면(없는 근거 ID·실행됨 응답 등) 실패로 표시하고 내용을 지어내지 않는다.
      const data = exp.data;
      const problem = explanationProblem(event, data);
      if (problem) {
        appendExplainFailure(box, problem.code, '이 설명은 현재 기록에 쓸 수 없습니다', problem.reason);
        return finish();
      }

      // 여기부터 성공: 현재 기록과 대조를 통과한 설명에만 성공 속성을 붙인다.
      root.dataset.studentExplanationEvent = event.id;
      box.append(line('상태', '설명 받음'));
      box.append(line('AI 요약', data.summary));
      box.append(line('안내', 'AI 요약은 해석입니다. 사실 판단은 아래 근거 글과 연동 시스템이 알려 준 현재 상태로 하세요.'));
      box.append(line('확인 시각', info.checkedAt || '확인 불가'));

      // 3) 인용한 근거 ID 마다 현재 event.evidence 에서 같은 id 의 근거 글을 찾아 보여 준다.
      const evidenceText = new Map(event.evidence.map((row) => [row.id, row.text]));
      const sub = (title) => {
        const h = document.createElement('h5');
        h.textContent = title;
        box.append(h);
      };
      const list = (texts) => {
        const ul = document.createElement('ul');
        ul.className = 'student-text-rows';
        for (const text of texts) {
          const li = document.createElement('li');
          li.textContent = text;
          ul.append(li);
        }
        box.append(ul);
      };
      sub('인용한 근거');
      list(data.evidenceIds.map((ref) => `${ref} — ${evidenceText.get(ref)}`));
      sub('규칙');
      if (Array.isArray(event.rules) && event.rules.length > 0) list(event.rules.map((rule) => `${rule.id} — ${rule.text}`));
      else box.append(line('규칙', '없음'));

      // 4) unknown 인 접속·세션·기기 상태를 각각 확인 불가로 나열한다. 정상·안전으로 바꾸지 않는다.
      sub('확인 불가 상태');
      const state = event.state || {};
      const unknownParts = Object.keys(STATE_PART_NAME).filter((key) => state[key] === 'unknown');
      if (unknownParts.length === 0) box.append(line('확인 불가', '없음'));
      else list(unknownParts.map((key) => `${STATE_PART_NAME[key]}: 확인 불가(unknown)`));

      // 5) 조치 제안: 이유와 미실행 상태를 보여 준다. 없으면 없는 까닭을 알려 준다. 실행 버튼은 없다.
      sub('조치 제안');
      const proposals = data.proposals;
      if (proposals.length === 0) {
        const supported = Array.isArray(event.supportedActions) ? event.supportedActions : [];
        box.append(line('제안', supported.length === 0
          ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
          : 'AI가 제안한 조치가 없습니다. 필요하면 근거를 보고 담당자와 판단하세요.'));
      } else {
        list(proposals.map((p) => `${p.action} — ${p.reason} (근거 ${p.evidenceIds.join(', ')}) · 사람 확인이 필요하며 실행되지 않았습니다`));
      }
      box.append(line('실행 여부', '실행되지 않음(executed=false). 설명·제안만으로 보안 조치를 실행하지 않습니다.'));
      return finish();
    },
    // 19단계: AI 조치 제안과 실제 처리(사람 확인 → 서버 전달 → 결과 재조회)를 구분해 표시한다.
    // 받는 값: { status, event, actionId, target, receipt, observation, message, confirmationExpiresAt?, error? }
    //   status: idle·loading·executing·prepared·pending·succeeded·denied·failed·unknown·error·expired
    //   target: { id, generation } | null, receipt: { requestId, receiptId, eventId, actionId, status, version, replayed, superseded? } | null
    //   observation: { observedAt, effectApplied } | null
    // 학생 코드는 조치 버튼·POST 요청·확인 티켓을 만들지 않는다(티켓은 제공 화면 메모리에만 있고 여기로 오지 않는다).
    // 매 호출 새 DOM 을 돌려주므로 새 입력이 오면 이전 대상·요청·결과 표시는 남지 않는다.
    renderAction(actionData) {
      const s = actionData || {};
      const root = document.createElement('div');
      root.className = 'student-action';
      const box = document.createElement('section');
      box.className = 'identity-section';
      const heading = document.createElement('h4');
      heading.className = 'identity-title';
      heading.textContent = '보안 조치 상태';
      box.append(heading);
      root.append(box);

      const event = s.event || null;
      const receipt = s.receipt || null;
      const target = s.target || null;
      const observation = s.observation || null;

      // 현재 의도(사건·조치)와 서버 영수증이 같은 대상인지 대조한다.
      // 최소 unknown 응답(requestId·status 만 있음)은 eventId 가 없으므로 대조 대상에서 뺀다.
      const intentMismatch = Boolean(receipt && event && (
        (receipt.eventId !== undefined && receipt.eventId !== event.id)
        || (receipt.actionId !== undefined && receipt.actionId !== s.actionId)));

      let status = STATUS_OF_ACTION[s.status] ? s.status : 'unknown';
      // 효과 확인은 succeeded 이면서 연동 시스템 관측 effectApplied===true 일 때만. 아니면 결과 불명.
      const effectConfirmed = status === 'succeeded' && observation !== null && observation.effectApplied === true
        && Boolean(observation.observedAt) && !intentMismatch;
      if (status === 'succeeded' && !effectConfirmed) status = 'unknown';
      if (intentMismatch && ['pending', 'succeeded'].includes(status)) status = 'unknown';

      box.append(line('상태', `${STATUS_OF_ACTION[status]}(${status})`, ACTION_WARN.has(status)));

      switch (status) {
        case 'idle':
          box.append(line('안내', s.message || '조치 제안은 아직 실행되지 않았습니다.'));
          box.append(line('조치 준비', '현재 기록에 연동 시스템이 지원하는 조치(supportedActions)가 없으면 「조치 준비」 버튼이 나오지 않는 것이 정상입니다.'));
          break;
        case 'loading':
          box.append(line('안내', '조치 준비 또는 결과 조회 중입니다. 아직 실행된 조치가 아니며 결과도 확인되지 않았습니다.'));
          break;
        case 'prepared':
          box.append(line('사람 확인', '아직 미실행입니다. 아래 실제 대상과 확인 기한을 읽고, 맞으면 제공 화면의 「대상과 조치를 확인했으며 집행합니다」 버튼을 직접 누르세요. 누르기 전에는 서버에 전달되지 않습니다.'));
          box.append(line('확인 기한', s.confirmationExpiresAt || '확인 불가'));
          break;
        case 'executing':
          box.append(line('안내', '사람 확인 뒤 서버에 전달 중입니다. 결과가 아직 없으며 완료 아님입니다.'));
          break;
        case 'pending':
          box.append(line('안내', '서버가 요청을 접수(ACK)해 처리 중입니다. 접수는 실행 성공이나 효과 확인이 아닙니다. 결과는 제공 화면의 「원천 결과만 재조회」(연동 시스템 결과 재조회)로 확인하세요.'));
          break;
        case 'succeeded':
          box.append(line('관측 시각', observation.observedAt));
          box.append(line('관측 결과', 'effectApplied: true'));
          box.append(line('영수증 ID(receiptId)', (receipt && receipt.receiptId) || '확인 불가'));
          break;
        case 'denied':
        case 'failed':
          box.append(line('사유', (s.error && s.error.message) || s.message || '확인 불가'));
          break;
        case 'expired':
          box.append(line('안내', '사람 확인 기한이 지나 이번 준비로는 집행할 수 없습니다. 보안 기록에서 조치를 다시 준비하세요.'));
          break;
        case 'error':
          box.append(line('오류 코드', (s.error && s.error.code) || '확인 불가'));
          box.append(line('사유', (s.error && s.error.message) || '확인 불가'));
          box.append(line('안내', '요청이 처리되지 않았습니다. 필요하면 현재 기록에서 다시 준비하세요.'));
          break;
        default: // unknown
          box.append(line('안내', '결과 불명입니다. 성공으로도, 효과 없음으로도 판단하지 마세요. 조치를 다시 집행하지 말고 제공 화면의 「원천 결과만 재조회」(연동 시스템 결과 재조회)로 결과만 다시 조회하세요.'));
          if (s.status === 'succeeded' && !intentMismatch) box.append(line('사유', '성공 응답이지만 연동 시스템 관측(effectApplied: true·관측 시각)이 없어 효과를 확인할 수 없습니다.'));
          if (intentMismatch) box.append(line('사유', '서버 영수증의 사건·조치가 현재 선택과 맞지 않아 이 결과를 현재 조치의 결과로 쓸 수 없습니다.'));
          if (s.error && s.error.message) box.append(line('서버 안내', s.error.message));
          break;
      }

      // 현재 의도·요청 식별값을 받은 범위에서만 글자로 보여 준다(만들거나 저장하지 않음).
      if (event) {
        box.append(line('사건 ID', event.id));
        const evidenceIds = Array.isArray(event.evidence) ? event.evidence.map((row) => row.id) : [];
        box.append(line('근거 ID', evidenceIds.length > 0 ? evidenceIds.join(', ') : '없음'));
      }
      if (s.actionId) box.append(line('조치(actionId)', s.actionId));
      if (target) box.append(line('실제 대상', `${target.id} · generation ${target.generation}`));
      if (receipt) {
        if (receipt.requestId) box.append(line('요청 ID(requestId)', receipt.requestId));
        if (receipt.receiptId && status !== 'succeeded') box.append(line('영수증 ID(receiptId)', receipt.receiptId));
        if (receipt.version !== undefined) box.append(line('버전(version)', String(receipt.version)));
        // 중복 방지: 같은 requestId 의 기존 접수 결과를 다시 받은 것이지 조치를 한 번 더 실행한 것이 아니다.
        if (receipt.replayed === true) box.append(line('중복 방지', '같은 요청(requestId)의 기존 처리 결과를 다시 받은 것입니다(replayed). 조치를 한 번 더 실행하지 않았습니다.'));
        if (receipt.superseded === true) box.append(line('이전 조회', '이전 조회 결과는 최신 결과를 대신하지 않습니다(superseded).'));
      }
      box.append(line('구분', 'AI 제안은 실행이 아닙니다. 사람 확인 → 서버 전달 → 연동 시스템 결과 재조회 순서로만 처리되며, 이 칸에는 실행 버튼이 없습니다. 같은 조치를 다시 집행하지 말고 결과만 재조회하세요.'));
      box.append(line('취소 안내', '「조치 화면 취소」는 화면 상태만 지웁니다. 이미 서버에 전달된 조치 효과를 되돌리지 않습니다.'));

      // 현재 사건·요청과 맞게 그린 경우에만 식별 속성을 붙인다.
      if (event && !intentMismatch) root.dataset.studentActionEvent = event.id;
      if (receipt && receipt.requestId && !intentMismatch) root.dataset.studentActionRequest = receipt.requestId;
      return root;
    },
  };
}
