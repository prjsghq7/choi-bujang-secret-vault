// 9단계에서 학생이 채우는 탐지 함수입니다. 이 기본값은 어떤 접속도 회수하지 않습니다.
// 반 엔진이 검증한 사건만 전달해야 하며, 브라우저가 보낸 사용자 번호는 받지 않습니다.
export function detect(events) {
  if (!Array.isArray(events)) throw new TypeError('invalid_detection_events');
  const reads = events
    .filter((event) => event?.method === 'GET'
      && typeof event?.at === 'string'
      && typeof event?.identity?.sub === 'string'
      && event.identity.sub.length > 0)
    .map((event) => ({ at: Date.parse(event.at), subject: event.identity.sub }))
    .filter((event) => Number.isFinite(event.at))
    .sort((left, right) => left.at - right.at);

  for (let start = 0; start < reads.length; start += 1) {
    const subject = reads[start].subject;
    let count = 0;
    for (let end = start; end < reads.length; end += 1) {
      if (reads[end].subject !== subject || reads[end].at - reads[start].at > 600_000) continue;
      count += 1;
      if (count > 120) return { action: 'propose_revocation', reasonCode: 'burst_read', subject };
    }
  }
  return { action: 'observe' };
}
