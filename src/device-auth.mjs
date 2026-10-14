import { createHash, createPublicKey, randomUUID, verify } from 'node:crypto';
import { decide } from './decider.mjs';
import { claimNonce, readDevice } from './device-store.mjs';

export const SIGNATURE_SCHEME = 'aleph-device-v1';
const MAX_SKEW_MS = 60_000;
const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');

// The device ID is derived from the public key, so it cannot be chosen separately from the key.
export function deviceIdFor(publicKey) {
  const jwk = publicKeyJwk(publicKey);
  if (!jwk) return null;
  return sha256(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y })).slice(0, 16);
}

export function publicKeyJwk(value) {
  if (!value || value.kty !== 'EC' || value.crv !== 'P-256' || typeof value.x !== 'string'
      || typeof value.y !== 'string' || 'd' in value) return null;
  try { createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: value.x, y: value.y }, format: 'jwk' }); } catch { return null; }
  return { kty: 'EC', crv: 'P-256', x: value.x, y: value.y };
}

// ECDSA P-256 / SHA-256 with the raw (r||s) signature that WebCrypto produces.
export function verifySignature(publicKey, text, signatureBase64Url) {
  const jwk = publicKeyJwk(publicKey);
  if (!jwk || typeof signatureBase64Url !== 'string' || !/^[A-Za-z0-9_-]{80,100}$/u.test(signatureBase64Url)) return false;
  try {
    return verify('sha256', Buffer.from(text, 'utf8'),
      { key: createPublicKey({ key: jwk, format: 'jwk' }), dsaEncoding: 'ieee-p1363' },
      Buffer.from(signatureBase64Url, 'base64url'));
  } catch { return false; }
}

// The exact body the server received. The browser signs JSON.stringify(body), which round-trips.
export function bodyText(body) {
  if (body === undefined || body === null || body === '') return '';
  if (typeof body === 'string') return body;
  if (typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 0) return '';
  return JSON.stringify(body);
}

export function canonicalRequest({ method, path, body, timestamp, nonce, deviceId }) {
  return [SIGNATURE_SCHEME, method, path, sha256(bodyText(body)), timestamp, nonce, deviceId].join('\n');
}

// Cheap first gate, checked before any storage or environment work: a protected request without
// all four device-signature headers is rejected with 401 and nothing else runs.
export function hasDeviceSignature(headers) {
  return ['x-device-id', 'x-device-timestamp', 'x-device-nonce', 'x-device-signature']
    .every(name => typeof headers?.[name] === 'string' && headers[name].length > 0);
}

// Verifies the device signature over method + path(+query) + body hash + time + nonce.
// An unsigned request, a changed path or a changed body after signing all fail here.
export async function verifyDeviceRequest(request, identity, { url, key, now = Date.now() } = {}) {
  const deviceId = request.headers['x-device-id'];
  const timestamp = request.headers['x-device-timestamp'];
  const nonce = request.headers['x-device-nonce'];
  const signature = request.headers['x-device-signature'];
  if (!deviceId || !timestamp || !nonce || !signature) return { ok: false, status: 401, reason: 'device_signature_required' };
  const signedAt = Date.parse(timestamp);
  if (!Number.isFinite(signedAt) || Math.abs(now - signedAt) > MAX_SKEW_MS) return { ok: false, status: 401, reason: 'device_signature_expired' };
  const device = await readDevice(url, key, identity.userId, deviceId);
  if (!device || deviceIdFor(device.publicKey) !== deviceId) return { ok: false, status: 403, reason: 'device_not_registered' };
  const text = canonicalRequest({ method: request.method, path: request.url, body: request.body, timestamp, nonce, deviceId });
  if (!verifySignature(device.publicKey, text, signature)) return { ok: false, status: 401, reason: 'device_signature_invalid' };
  if (device.status !== 'approved') return { ok: false, status: 403, reason: 'device_not_approved', deviceId };
  if (!await claimNonce(url, key, deviceId, nonce)) return { ok: false, status: 401, reason: 'device_signature_replayed' };
  return { ok: true, deviceId, deviceRegistered: true };
}

// Builds the 18-field aleph.decision.v1 request from server-verified values only and asks decide().
export async function decideNotesRequest({ identity, deviceId, deviceRegistered, method, noteId, query }) {
  const path = noteId === null ? '/notes' : `/notes/${noteId}`;
  const route = noteId === null ? `${method} /notes` : `${method} /notes/:id`;
  const request = {
    schema: 'aleph.decision.v1', requestId: randomUUID(), classId: 'class_live', projectId: 'project_live',
    subjectId: 'subject_' + sha256(`${identity.kind}:${identity.userId}`).slice(0, 24), deviceId,
    service: 'notes', method, path, route, queryLength: query.length, querySha256: sha256(query),
    at: new Date().toISOString(), policyRevision: 1, deviceRegistered: deviceRegistered === true,
    stepUp: { verified: false, authAgeSeconds: null }, recentEvents: [],
    signals: { source: 'none', region: 'unknown', network: 'unknown', hour: new Date().getUTCHours() },
  };
  const decision = await decide(request);
  return decision?.requestId === request.requestId ? decision : { decision: 'deny', reasonCode: 'invalid_decision' };
}
