import { randomBytes } from 'node:crypto';
import { canonicalRequest, deviceIdFor, verifyDeviceRequest } from '../src/device-auth.mjs';

// Local practice with an in-memory stand-in for the private device registry. No network, no real keys.
const owner = '00000000-0000-4000-8000-000000000001';
const objects = new Map();
globalThis.fetch = async (input, init = {}) => {
  const path = new URL(input).pathname;
  const read = /\/object\/authenticated\/devices\/(.+)$/u.exec(path);
  if (read) return objects.has(read[1]) ? new Response(objects.get(read[1])) : new Response('{}', { status: 400 });
  const write = /\/object\/devices\/(.+)$/u.exec(path);
  if (write) {
    if (objects.has(write[1]) && init.headers?.['x-upsert'] !== 'true') return new Response('{"error":"Duplicate"}', { status: 400 });
    objects.set(write[1], init.body); return new Response('{}');
  }
  return new Response('{}', { status: 404 });
};

const { subtle } = globalThis.crypto;
const keys = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
const { kty, crv, x, y } = await subtle.exportKey('jwk', keys.publicKey);
const publicKey = { kty, crv, x, y };
const deviceId = deviceIdFor(publicKey);
const store = { url: 'https://registry.invalid', key: 'practice-only' };
const register = status => objects.set(`devices/${owner}/${deviceId}.json`, JSON.stringify({ deviceId, owner_id: owner, publicKey, status }));

async function signedRequest(method, url, body) {
  const timestamp = new Date().toISOString();
  const nonce = randomBytes(16).toString('hex');
  const text = canonicalRequest({ method, path: url, body, timestamp, nonce, deviceId });
  const signature = Buffer.from(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, new TextEncoder().encode(text))).toString('base64url');
  return { method, url, body, headers: { 'x-device-id': deviceId, 'x-device-timestamp': timestamp, 'x-device-nonce': nonce, 'x-device-signature': signature } };
}
const identity = { kind: 'student', userId: owner };
const run = request => verifyDeviceRequest(request, identity, store);

const cases = [];
register('pending');
cases.push(['승인 전 기기의 서명 요청 → 거부', await run(await signedRequest('GET', '/api/notes?id=1')), 'device_not_approved']);
register('approved');
cases.push(['서명 없는 보호 요청 → 거부', await run({ method: 'GET', url: '/api/notes?id=1', headers: {} }), 'device_signature_required']);
const pathChanged = await signedRequest('GET', '/api/notes?id=1');
cases.push(['서명 뒤 요청 경로 변경 → 거부', await run({ ...pathChanged, url: '/api/notes?id=2' }), 'device_signature_invalid']);
const bodyChanged = await signedRequest('PATCH', '/api/notes', { id: 1, content: '정상 수정' });
cases.push(['서명 뒤 수정 본문 변경 → 거부', await run({ ...bodyChanged, body: { id: 1, content: '변조 수정' } }), 'device_signature_invalid']);
const normal = await signedRequest('PATCH', '/api/notes', { id: 1, content: '정상 수정' });
cases.push(['승인 기기의 정상 서명 요청 → 허용', await run(normal), 'ok']);
cases.push(['같은 서명 재전송 → 거부', await run(normal), 'device_signature_replayed']);

let failed = false;
for (const [name, result, expected] of cases) {
  const actual = result.ok ? 'ok' : result.reason;
  const passed = actual === expected;
  failed ||= !passed;
  process.stdout.write(`${passed ? '통과' : '확인 필요'} · ${name} (${actual})\n`);
}
process.stdout.write('가상 기기 등록부로 연습하며 실제 심판 판정이나 운영 승인 증거가 아닙니다.\n');
if (failed) process.exitCode = 1;
