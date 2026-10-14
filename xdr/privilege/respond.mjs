// decide 결과 가운데 차단 후보만 ZTNA 판정기의 거부 규칙 후보로 내보내고, 알림을 xdr/alerts.log 에 쌓습니다.
// 판정기의 기존 규칙(src/decider.mjs)은 고치지 않습니다. 규칙은 xdr/privilege/deny-rules.json 에 따로 둡니다.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { decide } from './decide.mjs';

const RULE_TTL_MS = 60 * 60 * 1000;

export async function respond({ now = new Date(), write = true } = {}) {
  const fixture = JSON.parse(readFileSync(new URL('../fixtures/privilege.json', import.meta.url), 'utf8'));
  const decided = [];
  for (const alert of fixture.alerts) decided.push({ alert, out: await decide(alert) });
  // Addresses that also carried normal (record) traffic are never blocked, so normal users are not cut off.
  const normalSources = new Set(decided.filter(item => item.out.action === 'record').map(item => item.alert?.data?.srcip).filter(Boolean));
  const rules = [];
  const lines = [];
  for (const { alert, out } of decided) {
    if (out.action === 'record') continue;
    lines.push(`${now.toISOString()}\tprivilege\t${alert.id}\t${out.action}\t${out.confidence}\t${alert?.data?.srcip ?? '-'}\t${out.reason}`);
    const srcip = alert?.data?.srcip;
    if (out.action !== 'block' || !srcip || normalSources.has(srcip)) continue;
    if (rules.some(rule => rule.match.srcip === srcip)) { rules.find(rule => rule.match.srcip === srcip).evidence.push(alert.id); continue; }
    rules.push({ id: `xdr-privilege-${alert.id}`, effect: 'deny', match: { srcip }, reasonCode: 'xdr_privilege',
      evidence: [alert.id], expiresAt: new Date(now.getTime() + RULE_TTL_MS).toISOString() });
  }
  if (write) {
    writeFileSync(new URL('./deny-rules.json', import.meta.url), `${JSON.stringify({ schema: 'aleph.xdr.deny-rules.v1', moduleKey: 'privilege', generatedAt: now.toISOString(), rules }, null, 2)}\n`);
    if (lines.length) appendFileSync(new URL('../alerts.log', import.meta.url), `${lines.join('\n')}\n`);
  }
  return { rules, alerts: lines.length };
}

// The ZTNA side: a request from a source with an active deny rule is refused until the rule expires.
export function isDeniedByXdr(rules, { srcip, at = new Date() }) {
  return rules.some(rule => rule.effect === 'deny' && rule.match.srcip === srcip && Date.parse(rule.expiresAt) > at.getTime());
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { rules, alerts } = await respond();
  process.stdout.write(`알림 ${alerts}줄 · 거부 규칙 ${rules.length}개 (만료 1시간)\n`);
}
