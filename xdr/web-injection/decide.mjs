const ACTIONS = Object.freeze({ block: 'block', alert: 'alert', record: 'record' });

function countOf(alert) {
  const count = Number(alert?.data?.count);
  return Number.isFinite(count) ? count : 0;
}

export function decide(alert) {
  const level = Number(alert?.rule?.level) || 0;
  const count = countOf(alert);
  const mitre = Array.isArray(alert?.rule?.mitre) ? alert.rule.mitre : [];

  if (!alert?.id || !mitre.includes('T1190')) {
    return { action: ACTIONS.record, confidence: 0.98, reason: '주입 공격 표식이 없는 정상 웹 요청' };
  }

  if (level >= 10 && count >= 8) {
    return { action: ACTIONS.block, confidence: 0.98, reason: '같은 주소에서 주입 표식이 반복돼 명확한 공격으로 판단' };
  }

  return { action: ACTIONS.alert, confidence: 0.72, reason: '주입 형태가 관찰됐지만 반복 차단 기준에는 부족' };
}
