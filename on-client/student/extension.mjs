// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.

// 상태 코드 → 사람이 읽는 한국어. 공식 계약의 status/mode 값은 그대로 두고 라벨만 덧붙인다.
const DEVICE_STATUS = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
const SESSION_STATUS = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
const MODE_NOTE = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };

// 보안상 정상이 아닌 상태. 색상에만 기대지 않고 텍스트로 "주의"를 덧붙여 정상처럼 보이지 않게 한다.
const DEVICE_WARN = new Set(['noncompliant', 'unknown']);
const SESSION_WARN = new Set(['expired', 'revoked', 'unknown']);

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
    renderDecision() { return '학생 구현 대기: 서버의 판정과 이유를 연결하세요.'; },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
