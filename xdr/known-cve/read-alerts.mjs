// 확인용 경보 읽기 모듈입니다. decide.mjs 가 불러오지 않습니다. 원본 경보는 고치지 않습니다.
// 시각·출발 주소·계정·규칙 수준·설명만 뽑고, 비밀값처럼 보이는 값은 출력하지 않습니다.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const SECRETISH = /(\$\{[^}]*\}|bearer\s+\S+|eyJ[\w-]+\.[\w-]+|sb_secret_\w+|password\s*[=:]\s*\S+|-----BEGIN [A-Z ]*KEY-----)/giu;
const mask = value => (value === undefined || value === null ? '-' : String(value).replace(SECRETISH, '[가림]'));

export function readAlerts(fixturePath = new URL('../fixtures/known-cve.json', import.meta.url)) {
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  return fixture.alerts.map(alert => ({
    time: mask(alert?.timestamp), srcip: mask(alert?.data?.srcip), account: mask(alert?.data?.srcuser),
    level: Number(alert?.rule?.level) || 0, description: mask(alert?.rule?.description),
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fixture = JSON.parse(readFileSync(new URL('../fixtures/known-cve.json', import.meta.url), 'utf8'));
  const rows = readAlerts();
  for (const row of rows) process.stdout.write(`${row.time}\t${row.srcip}\t${row.account}\t${row.level}\t${row.description}\n`);
  process.stdout.write(`경보 ${fixture.alerts.length}건 · 뽑은 줄 ${rows.length}줄 · ${fixture.alerts.length === rows.length ? '일치' : '불일치'}\n`);
}
