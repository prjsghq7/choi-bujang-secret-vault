import { randomBytes } from 'node:crypto';
import { createLoginVerifier } from '../src/verify-login.mjs';
import { attachRequestId, deviceIdFor, publicKeyJwk, verifySignature } from '../src/device-auth.mjs';
import { readDevice, readRevocation, writeDevice, writeRevocation } from '../src/device-store.mjs';

const verifierConfig = {
  judgeIssuer: 'https://aleph-judge-production.up.railway.app/defense/judge',
  publicAppUrl: 'https://choi-bujang-secret-vault-navy.vercel.app',
  identityProvider: { issuer: 'https://ybaymbdaagpiqfwytkld.supabase.co/auth/v1', audience: 'authenticated', jwksUrl: 'https://ybaymbdaagpiqfwytkld.supabase.co/auth/v1/.well-known/jwks.json' },
};
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// Re-checks the account password on the server. The password is never stored or logged.
async function passwordMatches(url, key, userId, password) {
  if (typeof password !== 'string' || !password || password.length > 200) return false;
  const userResponse = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
  if (!userResponse.ok) return false;
  const user = await userResponse.json();
  if (typeof user?.email !== 'string' || user.id !== userId) return false;
  const login = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password }) });
  if (!login.ok) return false;
  const session = await login.json();
  return session?.user?.id === userId;
}

const view = device => ({ deviceId: device.deviceId, status: device.status, requestedAt: device.requestedAt, approvedAt: device.approvedAt ?? null });

export default async function handler(request, response) {
  attachRequestId(request, response);
  if (!['GET', 'POST'].includes(request.method)) { response.setHeader('Allow', 'GET, POST'); return response.status(405).json({ error: 'Method not allowed' }); }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return response.status(500).json({ error: 'Server storage is not configured' });
  const authorization = request.headers.authorization ?? '';
  if (!authorization.startsWith('Bearer ')) return response.status(401).json({ error: 'Authentication required' });
  try {
    const verify = createLoginVerifier({ config: verifierConfig, supabaseSecretKey: key });
    const identity = await verify(authorization);
    if (!identity) return response.status(401).json({ error: 'Invalid authentication token' });
    const body = request.body && typeof request.body === 'object' ? request.body : {};
    // A revoked identity cannot register, approve or even read device state again.
    if (await readRevocation(url, key, identity.userId)) return response.status(403).json({ error: 'Identity has been revoked', reason: 'identity_revoked' });

    // Status: the server's record is the only source of the approval state.
    if (request.method === 'GET') {
      const deviceId = new URL(request.url, 'https://local.invalid').searchParams.get('deviceId');
      const device = await readDevice(url, key, identity.userId, deviceId);
      if (!device) return response.status(404).json({ error: 'Device not found', status: 'unregistered' });
      return response.status(200).json(view(device));
    }

    // 1) Request approval: store only the public key, as pending, with a one-time challenge.
    if (body.action === 'request') {
      const publicKey = publicKeyJwk(body.publicKey);
      if (!publicKey) return response.status(400).json({ error: 'An EC P-256 public key is required' });
      const deviceId = deviceIdFor(publicKey);
      const existing = await readDevice(url, key, identity.userId, deviceId);
      if (existing?.status === 'approved') return response.status(200).json(view(existing));
      if (existing?.status === 'revoked') return response.status(403).json({ error: 'This device key was revoked; create a new key', reason: 'device_revoked' });
      const device = { schema: 'aleph.device.v1', deviceId, owner_id: identity.userId, publicKey, status: 'pending',
        requestedAt: new Date().toISOString(), challenge: randomBytes(32).toString('hex'),
        challengeExpiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString() };
      if (!await writeDevice(url, key, device)) return response.status(502).json({ error: 'Device registry request failed' });
      return response.status(201).json({ ...view(device), challenge: device.challenge });
    }

    // 2) Approve: the server must confirm both the account password and possession of the device key.
    // Clicking a button alone never approves a device.
    if (body.action === 'approve') {
      const device = await readDevice(url, key, identity.userId, body.deviceId);
      if (!device) return response.status(404).json({ error: 'Device not found' });
      if (device.status === 'approved') return response.status(200).json(view(device));
      if (device.status === 'revoked') return response.status(403).json({ error: 'A revoked device cannot be approved again', reason: 'device_revoked' });
      if (!device.challenge || Date.parse(device.challengeExpiresAt) < Date.now()) return response.status(410).json({ error: 'Approval challenge expired; request approval again' });
      if (!verifySignature(device.publicKey, `aleph-device-approve-v1\n${device.deviceId}\n${device.challenge}`, body.signature)) {
        return response.status(401).json({ error: 'Device key proof failed' });
      }
      if (identity.kind !== 'student' || !await passwordMatches(url, key, identity.userId, body.password)) {
        return response.status(403).json({ error: 'Account re-authentication failed; device not approved' });
      }
      const approved = { ...device, status: 'approved', approvedAt: new Date().toISOString(), challenge: null, challengeExpiresAt: null };
      if (!await writeDevice(url, key, approved)) return response.status(502).json({ error: 'Device registry request failed' });
      return response.status(200).json(view(approved));
    }
    // 3) Revoke one device of this account. Revocation only removes access and cannot be undone.
    if (body.action === 'revoke') {
      const device = await readDevice(url, key, identity.userId, body.deviceId);
      if (!device) return response.status(404).json({ error: 'Device not found' });
      const revoked = { ...device, status: 'revoked', revokedAt: new Date().toISOString(), challenge: null, challengeExpiresAt: null };
      if (!await writeDevice(url, key, revoked)) return response.status(502).json({ error: 'Device registry request failed' });
      return response.status(200).json({ ...view(revoked), revokedAt: revoked.revokedAt });
    }

    // 4) Revoke this whole identity (e.g. after a burst_read revocation proposal). Every later request is refused.
    if (body.action === 'revoke_identity') {
      if (body.confirmed !== true) return response.status(428).json({ error: 'Confirm identity revocation; it cannot be undone' });
      if (!await writeRevocation(url, key, identity.userId, typeof body.reason === 'string' ? body.reason.slice(0, 40) : 'owner_request')) {
        return response.status(502).json({ error: 'Revocation request failed' });
      }
      return response.status(200).json({ status: 'revoked' });
    }
    return response.status(400).json({ error: 'Unknown device action' });
  } catch { return response.status(502).json({ error: 'Device request failed' }); }
}
