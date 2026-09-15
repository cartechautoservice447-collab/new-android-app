import crypto from 'crypto';

// ─── Configuration ────────────────────────────────────────────────────────────

// Existing VAPID public key used across Mobile-liquid-glass subscriptions.
// Preserved verbatim; NEVER replaced without explicit user instruction.
export const VAPID_PUBLIC_KEY = 'BIPdLNtmyxIQ_hB7b1wjTnPJxh8mrrvYtpbuvj1Zm_efLvActyompli_L_PUHWmsGQb3QbCKblysFT4rvzALdx0';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asgwpmsuutigtvaxuxmr.supabase.co';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Cryptographic Helpers (RFC 8291 & RFC 8292) ─────────────────────────────

function derToJose(der) {
  let offset = 2;
  if (der[1] & 0x80) offset += (der[1] & 0x7f);
  offset++;
  const rLen = der[offset++];
  let r = der.subarray(offset, offset + rLen);
  offset += rLen;
  offset++;
  const sLen = der[offset++];
  let s = der.subarray(offset, offset + sLen);

  while (r.length > 32 && r[0] === 0) r = r.subarray(1);
  while (s.length > 32 && s[0] === 0) s = s.subarray(1);
  while (r.length < 32) r = Buffer.concat([Buffer.from([0]), r]);
  while (s.length < 32) s = Buffer.concat([Buffer.from([0]), s]);

  return Buffer.concat([r, s]);
}

function createVapidToken(audience, subject, privateKeyPem) {
  const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    aud: audience,
    exp: now + 12 * 3600, // 12 hours validity
    sub: subject || 'mailto:admin@liquidglass.studio',
  })).toString('base64url');

  const unsignedToken = `${header}.${payload}`;
  const signer = crypto.createSign('SHA256');
  signer.update(unsignedToken);
  const derSignature = signer.sign(privateKeyPem);
  const joseSignature = derToJose(derSignature).toString('base64url');

  return `${unsignedToken}.${joseSignature}`;
}

function formatPrivateKey(rawKey) {
  const trimmed = String(rawKey || '').trim();
  if (trimmed.includes('BEGIN EC PRIVATE KEY') || trimmed.includes('BEGIN PRIVATE KEY')) {
    return trimmed;
  }
  // If provided as a base64/base64url 32-byte scalar, wrap into PKCS#8 PEM
  try {
    const keyBuf = Buffer.from(trimmed, trimmed.includes('-') || trimmed.includes('_') ? 'base64url' : 'base64');
    if (keyBuf.length === 32) {
      // PKCS#8 ASN.1 prefix for secp256r1 private key
      const pkcs8Prefix = Buffer.from('3041020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420', 'hex');
      const pkcs8Der = Buffer.concat([pkcs8Prefix, keyBuf]);
      return `-----BEGIN PRIVATE KEY-----\n${pkcs8Der.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
    }
  } catch {}
  return trimmed;
}

function encryptPayload(payloadBuffer, clientPublicKeyBase64, clientAuthBase64) {
  const clientPublicKey = Buffer.from(clientPublicKeyBase64, 'base64url');
  const clientAuth = Buffer.from(clientAuthBase64, 'base64url');

  const localECDH = crypto.createECDH('prime256v1');
  const localPublicKey = localECDH.generateKeys();
  const sharedSecret = localECDH.computeSecret(clientPublicKey);
  const salt = crypto.randomBytes(16);

  // 1. Derive IKM (Input Keying Material) per RFC 8291 Section 3.2
  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0', 'utf8'),
    clientPublicKey,
    localPublicKey,
  ]);
  const ikm = crypto.hkdfSync('sha256', sharedSecret, clientAuth, keyInfo, 32);

  // 2. Derive CEK (Content Encryption Key) and Nonce per RFC 8291 Section 3.3
  const cekInfo = Buffer.from('Content-Encoding: aes128gcm\0', 'utf8');
  const cek = crypto.hkdfSync('sha256', ikm, salt, cekInfo, 16);

  const nonceInfo = Buffer.from('Content-Encoding: nonce\0', 'utf8');
  const nonce = crypto.hkdfSync('sha256', ikm, salt, nonceInfo, 12);

  // 3. Encrypt payload with padding (0x02 delimiter byte)
  const paddedPayload = Buffer.concat([payloadBuffer, Buffer.from([2])]);
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const encrypted = Buffer.concat([cipher.update(paddedPayload), cipher.final()]);
  const tag = cipher.getAuthTag();

  // 4. Construct RFC 8291 Header: salt (16) + recordSize (4) + keyIdLen (1) + key (65)
  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);
  const keyIdLen = Buffer.from([localPublicKey.length]);
  const header = Buffer.concat([salt, recordSize, keyIdLen, localPublicKey]);

  return Buffer.concat([header, encrypted, tag]);
}

// ─── Database Helpers ─────────────────────────────────────────────────────────

async function getSubscriptionsForUser(userId, serviceRoleKey) {
  const url = `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=id,endpoint,p256dh,auth`;
  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to query push_subscriptions: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function removeSubscriptionById(subscriptionId, serviceRoleKey) {
  const url = `${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(subscriptionId)}`;
  try {
    await fetch(url, {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
  } catch (err) {
    console.warn(`Failed to delete stale push subscription ${subscriptionId}:`, err);
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Authenticate server-to-server call
  const expectedSecret = process.env.INTERNAL_NOTIFICATIONS_SECRET;
  if (!expectedSecret) {
    console.error('INTERNAL_NOTIFICATIONS_SECRET is not configured on the server.');
    return res.status(500).json({
      error: 'Sender endpoint is not configured. INTERNAL_NOTIFICATIONS_SECRET must be set.',
    });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const customHeader = req.headers['x-internal-secret'] || '';

  if (token !== expectedSecret && customHeader !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized: invalid internal secret.' });
  }

  // 2. Validate environment secrets
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return res.status(500).json({
      error: 'SUPABASE_SERVICE_ROLE_KEY is required to read push subscriptions.',
    });
  }

  const rawPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!rawPrivateKey) {
    return res.status(500).json({
      error: 'VAPID_PRIVATE_KEY is not configured on the server. Push notifications cannot be signed.',
    });
  }

  const vapidPrivateKey = formatPrivateKey(rawPrivateKey);
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@liquidglass.studio';

  // 3. Validate request body
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { user_id, notification } = body;

  if (!user_id || typeof user_id !== 'string' || !UUID_REGEX.test(user_id)) {
    return res.status(400).json({ error: 'Invalid or missing user_id. Must be a valid UUID.' });
  }

  if (!notification || typeof notification !== 'object') {
    return res.status(400).json({ error: 'Invalid or missing notification object.' });
  }

  const title = String(notification.title || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'Notification title is required.' });
  }

  const notificationPayload = {
    id: notification.id ? String(notification.id) : null,
    title: title.slice(0, 120),
    body: String(notification.body || '').trim().slice(0, 500),
    action_url: notification.action_url ? String(notification.action_url).slice(0, 500) : '/',
    type: notification.type ? String(notification.type).slice(0, 60) : 'general',
  };

  const payloadBuffer = Buffer.from(JSON.stringify(notificationPayload), 'utf8');

  // 4. Fetch subscriptions for the recipient
  let subscriptions;
  try {
    subscriptions = await getSubscriptionsForUser(user_id, serviceRoleKey);
  } catch (err) {
    console.error('Error reading subscriptions:', err);
    return res.status(502).json({ error: err.message });
  }

  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return res.status(200).json({
      success: true,
      delivered: 0,
      failed: 0,
      staleRemoved: 0,
      message: 'No active push subscriptions found for this user.',
    });
  }

  // 5. Dispatch Web Push to each registered endpoint
  let delivered = 0;
  let failed = 0;
  let staleRemoved = 0;

  for (const sub of subscriptions) {
    if (!sub.endpoint || !sub.p256dh || !sub.auth) continue;

    let endpointUrl;
    try {
      endpointUrl = new URL(sub.endpoint);
    } catch {
      continue;
    }

    try {
      const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
      const vapidToken = createVapidToken(audience, vapidSubject, vapidPrivateKey);
      const encryptedBody = encryptPayload(payloadBuffer, sub.p256dh, sub.auth);

      const pushResponse = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
          TTL: '86400',
          Urgency: 'high',
          Authorization: `vapid t=${vapidToken}, k=${VAPID_PUBLIC_KEY}`,
        },
        body: encryptedBody,
      });

      if (pushResponse.ok || pushResponse.status === 201) {
        delivered += 1;
      } else if (pushResponse.status === 404 || pushResponse.status === 410) {
        // Endpoint has expired or user unsubscribed / uninstalled browser
        staleRemoved += 1;
        await removeSubscriptionById(sub.id, serviceRoleKey);
      } else {
        failed += 1;
        console.warn(`Push delivery failed for endpoint (${pushResponse.status}):`, await pushResponse.text());
      }
    } catch (pushErr) {
      failed += 1;
      console.warn('Error sending Web Push to endpoint:', pushErr);
    }
  }

  return res.status(200).json({
    success: true,
    delivered,
    failed,
    staleRemoved,
    totalSubscriptions: subscriptions.length,
  });
}
