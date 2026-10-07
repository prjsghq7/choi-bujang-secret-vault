const ACTIONS = Object.freeze({ block: 'block', alert: 'alert', record: 'record' });

function countOf(alert) {
  const count = Number(alert?.data?.count);
  return Number.isFinite(count) ? count : 0;
}

function description(alert) {
  return typeof alert?.rule?.description === 'string' ? alert.rule.description : '';
}

function result(action, confidence, reason) {
  return { action, confidence, reason };
}

export function decide(alert) {
  const level = Number(alert?.rule?.level) || 0;
  const count = countOf(alert);
  const text = description(alert);
  const mitre = Array.isArray(alert?.rule?.mitre) ? alert.rule.mitre : [];
  const hasBruteForceTag = mitre.includes('T1110');
  const accounts = typeof alert?.data?.accounts === 'string'
    ? alert.data.accounts.split(',').filter(Boolean).length : 0;

  if (!alert?.id || !hasBruteForceTag) return result(ACTIONS.record, 0.98, '로그인 대입 공격 표식이 없는 정상 이벤트');

  const clearAttack = level >= 10 && (
    count >= 30
    || accounts >= 8
    || /성공은 없습니다|한 글자씩|같은 주소와 같은 계정|계정 \d+개|서로 다른 계정 \d+개/u.test(text)
  );
  if (clearAttack) return result(ACTIONS.block, 0.98, '짧은 시간에 반복된 로그인 실패가 대입 공격 기준을 충족');

  if (level >= 5 || count > 0) return result(ACTIONS.alert, 0.72, '로그인 실패가 관찰됐지만 단독 차단 기준에는 부족');
  return result(ACTIONS.record, 0.95, '정상 인증 이벤트');
}
