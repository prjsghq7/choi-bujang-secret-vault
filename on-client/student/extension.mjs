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
function section(title, resource, renderOk) {
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
    box.append(line('상태', `연결 실패: ${message}`, true));
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
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
