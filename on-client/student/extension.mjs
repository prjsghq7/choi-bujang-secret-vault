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

export function createStudentView(/* { api, onChange } */) {
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

      const note = modeNote({ mode: data.mode });
      if (note) root.append(note);
      return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
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
        // 인증·권한·한도·시간 초과·취소·모델 없음 등은 안전한 code·message 로 구분한다.
        const err = info.error || {};
        box.append(line('상태', 'AI 연결 점검 실패', true));
        box.append(line('코드', err.code || '확인 불가'));
        box.append(line('사유', err.message || '확인 불가'));
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
      const note = modeNote(info);
      if (note) box.append(note);
      root.append(box);
      return root;
    },
    // 17단계(기본 표시): 선택한 사건의 AI 설명을 공식 입력 계약대로 상태별로 보여 준다.
    // 제안은 자동 실행하지 않는다(executed=false 표시). 근거·규칙 상세는 뒤 단계에서 확장한다.
    // 받는 값: { event, explanation:{status,mode,data?,error?}, checkedAt }
    //   explanation.data(ok) = { summary, evidenceIds, proposals, requiresHumanConfirmation, executed }
    renderExplanation(explanationData) {
      const info = explanationData || {};
      const exp = info.explanation || {};
      const root = document.createElement('div');
      root.className = 'student-explanation';
      const box = document.createElement('section');
      box.className = 'identity-section';
      const heading = document.createElement('h4');
      heading.className = 'identity-title';
      heading.textContent = info.event && info.event.id ? `사건 설명 · ${info.event.id}` : '사건 설명';
      box.append(heading);

      if (!info.event) {
        box.append(line('상태', '선택한 사건이 없습니다. 보안 기록에서 사건을 선택하세요.'));
        root.append(box);
        return root;
      }

      const status = exp.status;
      if (status === 'loading') {
        box.append(line('상태', '사건 설명을 생성하는 중'));
      } else if (status === 'error') {
        const err = exp.error || {};
        box.append(line('상태', '사건 설명을 불러오지 못했습니다', true));
        box.append(line('코드', err.code || '확인 불가'));
        box.append(line('사유', err.message || '확인 불가'));
      } else if (status === 'ok') {
        const data = exp.data || {};
        box.append(line('요약', data.summary || '요약 없음'));
        box.append(line('사람 확인 필요', data.requiresHumanConfirmation ? '예' : '아니오'));
        box.append(line('실행 여부', data.executed ? '실행됨' : '실행하지 않음(제안은 자동 실행하지 않습니다)'));
        box.append(line('점검 시각', info.checkedAt || '확인 불가'));
      } else {
        box.append(line('상태', '사건 설명 전입니다.'));
      }
      const note = modeNote(exp);
      if (note) box.append(note);
      root.append(box);
      return root;
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
