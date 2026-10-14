// 자료 빼돌리기(대용량 유출) 판단 모듈. xdr/exfiltration/patterns.json 의 패턴을 그대로 옮긴 상수입니다.
// 이 파일은 다른 파일·패키지를 불러오지 않고, 파일을 읽거나 쓰지 않으며, 바깥에 묻지 않습니다.
// 판단 결과만 돌려주며 알림 기록과 판정기 연결은 respond.mjs 가 합니다.
const PATTERNS = Object.freeze([
  {
    "name": "bulk_transfer_to_new_destination",
    "condition": {
      "fields": [
        "bytes"
      ],
      "min": 50000000
    },
    "basis": "T1048·T1041: 처음 보는 목적지로 대용량(50MB 이상) 전송"
  },
  {
    "name": "many_files_at_once",
    "condition": {
      "fields": [
        "files"
      ],
      "min": 50
    },
    "basis": "T1041: 한 번에 많은 자료(50건 이상)가 나감"
  },
  {
    "name": "repeated_transfers",
    "condition": {
      "fields": [
        "count"
      ],
      "min": 5
    },
    "basis": "T1041·T1048: 같은 목적지로 전송이 반복됨"
  },
  {
    "name": "archive_out_of_hours",
    "condition": {
      "fields": [
        "description"
      ],
      "regex": "(수업|업무) 시간 밖.*(압축|전송)|압축 파일.*처음 보는"
    },
    "basis": "T1048: 업무 시간 밖 압축 파일 반출"
  }
]);
const MITRE = Object.freeze(["T1041","T1048"]);
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
