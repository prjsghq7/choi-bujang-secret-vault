// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기 시작점입니다.
// 6단계부터 규칙을 하나씩 추가합니다. 등록되지 않은 기기는 기본적으로 거부합니다.
// 요청 본문의 userId, role, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
export const RULE_IDS = Object.freeze([
  'device_registered', 'step_up_required', 'resource_zone', 'resource_owner',
]);

const ROUTE_RULES = new Map([
  ['GET /notes/:id', 'GET'],
  ['POST /notes', 'POST'],
  ['PATCH /notes/:id', 'PATCH'],
  ['DELETE /notes/:id', 'DELETE'],
]);

function resourceAllowed(request) {
  if (request?.service !== 'notes' || typeof request.route !== 'string'
      || typeof request.path !== 'string' || ROUTE_RULES.get(request.route) !== request.method
      || /(?:^|\/)(?:other|foreign|teacher|notice|notices|class|admin|all|export|list|search|bulk|everyone)(?:[-_]|$|\/)/iu.test(request.path)) {
    return false;
  }
  const collection = request.route === 'POST /notes';
  return (collection ? /^\/notes\/?$/u : /^\/notes\/[0-9]+$/u).test(request.path);
}

function isCompositeRisk(request) {
  const signals = request?.signals;
  if (!signals || signals.source !== 'judge_fixture'
      || typeof signals.region !== 'string' || typeof signals.network !== 'string'
      || !Number.isInteger(signals.hour)) return false;
  const unusualTime = signals.hour < 6 || signals.hour >= 22;
  const unusualNetwork = signals.network === 'unusual';
  const unusualRegion = signals.region === 'foreign';
  const bulkRead = Array.isArray(request.recentEvents)
    && request.recentEvents.some(event => event?.kind === 'risk_signal'
      && Number(event.count) >= 10);
  return unusualTime && unusualNetwork && unusualRegion && bulkRead;
}

export async function decide(request) {
  const base = {
    schema: 'aleph.decision.v1',
    requestId: request?.requestId,
  };

  if (request?.deviceRegistered !== true) {
    return {
      ...base,
      decision: 'deny',
      reasonCode: 'device_not_registered',
      ruleIds: ['device_registered'],
    };
  }

  if (isCompositeRisk(request)) {
    const stepUp = request.stepUp;
    const verified = stepUp?.verified === true
      && Number.isInteger(stepUp.authAgeSeconds)
      && stepUp.authAgeSeconds >= 0 && stepUp.authAgeSeconds <= 900;
    if (!verified) {
      return {
        ...base,
        decision: 'step_up',
        reasonCode: 'step_up_required',
        ruleIds: ['device_registered', 'step_up_required'],
      };
    }
  }

  if (!resourceAllowed(request)) {
    return {
      ...base,
      decision: 'deny',
      reasonCode: 'resource_not_allowed',
      ruleIds: ['device_registered', 'resource_zone', 'resource_owner'],
    };
  }

  return {
    ...base,
    decision: 'allow',
    reasonCode: 'approved',
    ruleIds: ['device_registered'],
  };
}
