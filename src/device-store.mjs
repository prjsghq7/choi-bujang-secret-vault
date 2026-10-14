// Server-only device registry in a private Supabase Storage bucket. Holds public keys and
// approval state only; device private keys never leave the browser and are never stored here.
export const DEVICE_BUCKET = 'devices';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const DEVICE_ID = /^[0-9a-f]{16}$/u;
const NONCE = /^[0-9a-f]{32,64}$/u;

const headers = (key, extra = {}) => ({ apikey: key, Authorization: 'Bearer ' + key, ...extra });

async function ensureBucket(url, key) {
  const response = await fetch(url + '/storage/v1/bucket', {
    method: 'POST', headers: headers(key, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: DEVICE_BUCKET, name: DEVICE_BUCKET, public: false }),
  });
  return response.ok || response.status === 400 || response.status === 409;
}

async function put(url, key, path, value, upsert) {
  const send = () => fetch(`${url}/storage/v1/object/${DEVICE_BUCKET}/${path}`, {
    method: 'POST', body: JSON.stringify(value),
    headers: headers(key, { 'Content-Type': 'application/json', 'x-upsert': upsert ? 'true' : 'false' }),
  });
  let response = await send();
  if (response.ok) return 'created';
  let message = await response.text();
  if (/bucket/iu.test(message) && /not.?found/iu.test(message) && await ensureBucket(url, key)) {
    response = await send();
    if (response.ok) return 'created';
    message = await response.text();
  }
  return /duplicate|already exists|409/iu.test(message) ? 'exists' : 'failed';
}

const devicePath = (ownerId, deviceId) => UUID.test(String(ownerId)) && DEVICE_ID.test(String(deviceId))
  ? `devices/${ownerId}/${deviceId}.json` : null;

export async function readDevice(url, key, ownerId, deviceId) {
  const path = devicePath(ownerId, deviceId);
  if (!path) return null;
  try {
    const response = await fetch(`${url}/storage/v1/object/authenticated/${DEVICE_BUCKET}/${path}`,
      { headers: headers(key), cache: 'no-store' });
    if (!response.ok) return null;
    const device = await response.json();
    return device?.deviceId === deviceId && device?.owner_id === ownerId ? device : null;
  } catch { return null; }
}

export async function writeDevice(url, key, device) {
  const path = devicePath(device?.owner_id, device?.deviceId);
  if (!path) return false;
  try { return await put(url, key, path, device, true) === 'created'; } catch { return false; }
}

export async function listDevices(url, key, ownerId) {
  if (!UUID.test(String(ownerId))) return [];
  try {
    const response = await fetch(`${url}/storage/v1/object/list/${DEVICE_BUCKET}`, {
      method: 'POST', headers: headers(key, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefix: `devices/${ownerId}/`, limit: 50, offset: 0 }),
    });
    if (!response.ok) return [];
    const items = await response.json();
    const ids = Array.isArray(items) ? items.map(item => /^([0-9a-f]{16})\.json$/u.exec(item?.name ?? '')?.[1]).filter(Boolean) : [];
    return (await Promise.all(ids.map(id => readDevice(url, key, ownerId, id)))).filter(Boolean);
  } catch { return []; }
}

// 12단계: a revoked identity stays revoked. Records are insert-only so a revocation cannot be undone by a request.
const revocationPath = ownerId => UUID.test(String(ownerId)) ? `revocations/${ownerId}.json` : null;

export async function readRevocation(url, key, ownerId) {
  const path = revocationPath(ownerId);
  if (!path) return null;
  try {
    const response = await fetch(`${url}/storage/v1/object/authenticated/${DEVICE_BUCKET}/${path}`,
      { headers: headers(key), cache: 'no-store' });
    if (!response.ok) return null;
    const record = await response.json();
    return record?.owner_id === ownerId && record?.status === 'revoked' ? record : null;
  } catch { return null; }
}

export async function writeRevocation(url, key, ownerId, reason) {
  const path = revocationPath(ownerId);
  if (!path) return false;
  const record = { schema: 'aleph.revocation.v1', owner_id: ownerId, status: 'revoked', reason, revokedAt: new Date().toISOString() };
  try { return ['created', 'exists'].includes(await put(url, key, path, record, false)); } catch { return false; }
}

// Each signed-request nonce can be used once per device. A second use is a replay.
export async function claimNonce(url, key, deviceId, nonce) {
  if (!DEVICE_ID.test(String(deviceId)) || !NONCE.test(String(nonce))) return false;
  try {
    return await put(url, key, `nonces/${deviceId}/${nonce}.json`, { at: new Date().toISOString() }, false) === 'created';
  } catch { return false; }
}
