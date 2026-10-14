import { join } from 'node:path';
import { createLoginVerifier } from '../src/verify-login.mjs';
import { attachRequestId, hasDeviceSignature, verifyDeviceRequest } from '../src/device-auth.mjs';
import { listDevices } from '../src/device-store.mjs';
import { listBackupIds } from '../src/note-backup.mjs';
import { verifyBackupFiles } from '../src/restore.mjs';
import { RULE_IDS } from '../src/decider.mjs';
import { retestPolicies } from '../src/retest.mjs';

const verifierConfig = {
  judgeIssuer: 'https://aleph-judge-production.up.railway.app/defense/judge',
  publicAppUrl: 'https://choi-bujang-secret-vault-navy.vercel.app',
  identityProvider: { issuer: 'https://ybaymbdaagpiqfwytkld.supabase.co/auth/v1', audience: 'authenticated', jwksUrl: 'https://ybaymbdaagpiqfwytkld.supabase.co/auth/v1/.well-known/jwks.json' },
};

// 12단계 탈환 작전실: reads the real server state for the signed-in owner. Never returns note bodies,
// keys, tokens or other owners' data. Anything not measured here is reported as not run.
export default async function handler(request, response) {
  const requestId = attachRequestId(request, response);
  if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return response.status(405).json({ error: 'Method not allowed' }); }
  const authorization = request.headers.authorization ?? '';
  if (!authorization.startsWith('Bearer ')) return response.status(401).json({ error: 'Authentication required' });
  if (!hasDeviceSignature(request.headers)) return response.status(401).json({ error: 'Approved device signature required', reason: 'device_signature_required' });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return response.status(500).json({ error: 'Server storage is not configured' });
  try {
    const verify = createLoginVerifier({ config: verifierConfig, supabaseSecretKey: key });
    const identity = await verify(authorization);
    if (!identity) return response.status(401).json({ error: 'Invalid authentication token' });
    const device = await verifyDeviceRequest(request, identity, { url, key });
    if (!device.ok) return response.status(device.status).json({ error: 'Approved device signature required', reason: device.reason });

    const devices = await listDevices(url, key, identity.userId);
    const count = status => devices.filter(item => item.status === status).length;
    const files = verifyBackupFiles(join(process.cwd(), 'backups'));
    const retest = await retestPolicies();
    return response.status(200).json({
      schema: 'aleph.ops-room.v1', requestId, checkedAt: new Date().toISOString(),
      decider: { source: 'src/decider.mjs', ruleIds: [...RULE_IDS] },
      detection: { source: 'src/detect.mjs', rule: 'burst_read', threshold: 'same subject GET > 120 within 10 minutes',
        action: 'propose_revocation', liveEvents: 'not_run', note: 'The class engine does not deliver live events to this app yet.' },
      revocation: { identityRevoked: false, devices: { approved: count('approved'), pending: count('pending'), revoked: count('revoked') },
        currentDevice: device.deviceId },
      restore: { manifestVerified: files.ok, version: files.ok ? files.version : null, failed: files.ok ? [] : files.failed,
        privateNoteBackups: (await listBackupIds(url, key, identity.userId)).length },
      retest: { kind: 'server-side practice run of stage 6~9 rules', passed: retest.filter(item => item.passed).length, total: retest.length },
    });
  } catch { return response.status(502).json({ error: 'Ops room request failed' }); }
}
