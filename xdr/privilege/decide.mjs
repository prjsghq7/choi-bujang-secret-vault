// 권한 가로채기(권한 상승·계정 도용) 판단 모듈. xdr/privilege/patterns.json 의 패턴을 그대로 옮긴 상수입니다.
// 이 파일은 다른 파일·패키지를 불러오지 않고, 파일을 읽거나 쓰지 않으며, 바깥에 묻지 않습니다.
// 판단 결과만 돌려주며 알림 기록과 판정기 연결은 respond.mjs 가 합니다.
const PATTERNS = Object.freeze([
  {
    "name": "added_to_admin_group",
    "condition": {
      "fields": [
        "group"
      ],
      "regex": "^(administrators|admins?|domain admins|sudo|wheel)$"
    },
    "basis": "T1078: 평범한 계정이 관리자 그룹에 추가됨"
  },
  {
    "name": "unfamiliar_admin_command",
    "condition": {
      "fields": [
        "description"
      ],
      "regex": "처음 보는|다른 계정의 권한|관리자 권한으로 바뀌"
    },
    "basis": "T1068: 처음 보는 곳·다른 계정 권한으로 관리자 명령 실행"
  },
  {
    "name": "privilege_use_outside_hours",
    "condition": {
      "fields": [
        "description"
      ],
      "regex": "수업 시간 밖|업무처럼 보이지 않는 시각|업무 시간 밖"
    },
    "basis": "T1078: 업무 시간 밖 권한 사용"
  },
  {
    "name": "repeated_admin_grants",
    "condition": {
      "fields": [
        "count"
      ],
      "min": 2
    },
    "basis": "T1078: 관리자 권한 부여가 반복됨"
  }
]);
const MITRE = Object.freeze(["T1068","T1078"]);
const BLOCK_AT = 0.85;
const ALERT_AT = 0.5;

function fieldValue(alert, field) {
  if (field === 'description') return alert?.rule?.description;
  return alert?.data?.[field];
}

function patternHits(alert) {
  const hits = [];
  for (const pattern of PATTERNS) {
    if (pattern.condition.onlyWithAnotherPattern) continue;
    if (matches(alert, pattern)) hits.push(pattern.name);
  }
  if (hits.length) {
    for (const pattern of PATTERNS) if (pattern.condition.onlyWithAnotherPattern && matches(alert, pattern)) hits.push(pattern.name);
  }
  return hits;
}

function matches(alert, pattern) {
  const { fields, regex, min } = pattern.condition;
  return fields.some(field => {
    const value = fieldValue(alert, field);
    if (value === undefined || value === null || value === '') return false;
    if (typeof min === 'number') {
      const number = Number(value);
      return Number.isFinite(number) && number >= min;
    }
    return new RegExp(regex, 'iu').test(String(value));
  });
}

// confidence: how clearly the alert matches a known pattern (0~1).
export function decide(alert) {
  const level = Number(alert?.rule?.level);
  const safeLevel = Number.isFinite(level) ? level : 0;
  const mitre = Array.isArray(alert?.rule?.mitre) ? alert.rule.mitre : [];
  const technique = mitre.some(id => MITRE.includes(id));
  const hits = patternHits(alert);

  let confidence;
  if (safeLevel <= 3) confidence = hits.length ? 0.3 : 0.05;
  else if (!technique && !hits.length) confidence = 0.1;
  else if (hits.length && safeLevel >= 10) confidence = Math.min(0.99, 0.88 + 0.03 * (hits.length - 1) + 0.01 * (safeLevel - 10));
  else if (technique && safeLevel >= 11) confidence = 0.86;
  else if (hits.length) confidence = 0.7;
  else if (technique && safeLevel >= 4) confidence = 0.55 + 0.02 * Math.min(safeLevel - 4, 5);
  else confidence = 0.2;
  confidence = Math.round(confidence * 100) / 100;

  const action = confidence >= BLOCK_AT ? 'block' : confidence >= ALERT_AT ? 'alert' : 'record';
  const reason = hits.length ? `패턴 ${hits.join(', ')} (수준 ${safeLevel})`
    : technique ? `${mitre.filter(id => MITRE.includes(id)).join(', ')} 기법 표식만 있음 (수준 ${safeLevel})`
    : `알려진 패턴 없음 (수준 ${safeLevel})`;
  return { action, confidence, reason };
}
