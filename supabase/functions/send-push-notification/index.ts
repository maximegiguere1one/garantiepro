import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

interface SendPushRequest {
  user_id?: string;
  organization_id?: string;
  notification: PushNotificationPayload;
  preferences_filter?: {
    new_messages?: boolean;
    claim_updates?: boolean;
    warranty_expiring?: boolean;
    system_alerts?: boolean;
  };
}

// Web Push encryption utilities (RFC 8291)
async function encryptPayload(
  payload: string,
  userPublicKey: string,
  userAuth: string
): Promise<Uint8Array> {
  try {
    // Decode user keys from base64
    const p256dh = base64UrlDecode(userPublicKey);
    const auth = base64UrlDecode(userAuth);

    // Generate local keypair
    const localKeyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveBits']
    );

    // Export local public key
    const localPublicKey = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);

    // Import user public key
    const remotePublicKey = await crypto.subtle.importKey(
      'raw',
      p256dh,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false,
      []
    );

    // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: remotePublicKey,
      },
      localKeyPair.privateKey,
      256
    );

    // Create salt (random 16 bytes)
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive encryption key and nonce using HKDF
    const ikm = await hkdfExtract(auth, new Uint8Array(sharedSecret));
    const prk = await hkdfExtract(salt, ikm);

    const cekInfo = buildInfo('aesgcm', new Uint8Array(localPublicKey), p256dh);
    const cek = await hkdfExpand(prk, cekInfo, 16);

    const nonceInfo = buildInfo('nonce', new Uint8Array(localPublicKey), p256dh);
    const nonce = await hkdfExpand(prk, nonceInfo, 12);

    // Import CEK for encryption
    const key = await crypto.subtle.importKey(
      'raw',
      cek,
      'AES-GCM',
      false,
      ['encrypt']
    );

    // Add padding to payload
    const paddedPayload = addPadding(payload, 0);

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
      },
      key,
      paddedPayload
    );

    // Build final payload: salt (16) + rs (4) + idlen (1) + publicKey (65) + ciphertext
    const rs = 4096;
    const idlen = 65;

    const result = new Uint8Array(
      salt.length + 4 + 1 + idlen + encrypted.byteLength
    );

    let offset = 0;

    // Salt
    result.set(salt, offset);
    offset += salt.length;

    // Record size (4 bytes, big-endian)
    const rsBytes = new Uint8Array(4);
    new DataView(rsBytes.buffer).setUint32(0, rs, false);
    result.set(rsBytes, offset);
    offset += 4;

    // ID length (1 byte)
    result.set([idlen], offset);
    offset += 1;

    // Local public key
    result.set(new Uint8Array(localPublicKey), offset);
    offset += idlen;

    // Encrypted payload
    result.set(new Uint8Array(encrypted), offset);

    return result;
  } catch (error) {
    console.error('Encryption error:', error);
    // Fallback to simple encoding if encryption fails
    const encoder = new TextEncoder();
    return encoder.encode(payload);
  }
}

function addPadding(payload: string, padding: number): Uint8Array {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const result = new Uint8Array(2 + padding + data.length);

  // Padding length (2 bytes)
  result[0] = (padding >> 8) & 0xff;
  result[1] = padding & 0xff;

  // Padding bytes
  for (let i = 0; i < padding; i++) {
    result[2 + i] = 0;
  }

  // Payload
  result.set(data, 2 + padding);

  return result;
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    salt,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, ikm);
  return new Uint8Array(signature);
}

async function hkdfExpand(
  prk: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;

  const signature = await crypto.subtle.sign('HMAC', key, infoWithCounter);
  return new Uint8Array(signature).slice(0, length);
}

function buildInfo(
  type: string,
  localPublicKey: Uint8Array,
  remotePublicKey: Uint8Array
): Uint8Array {
  const encoder = new TextEncoder();
  const prefix = encoder.encode(`Content-Encoding: ${type}\0`);

  const info = new Uint8Array(
    prefix.length + 5 + remotePublicKey.length + localPublicKey.length
  );

  let offset = 0;
  info.set(prefix, offset);
  offset += prefix.length;

  info.set([0, 0], offset); // Context
  offset += 2;

  info.set([remotePublicKey.length], offset);
  offset += 1;
  info.set(remotePublicKey, offset);
  offset += remotePublicKey.length;

  info.set([localPublicKey.length], offset);
  offset += 1;
  info.set(localPublicKey, offset);

  return info;
}

async function sendPushToSubscription(
  subscription: any,
  notification: PushNotificationPayload,
  vapidPrivateKey: string,
  vapidPublicKey: string
) {
  try {
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/vite.svg',
      badge: notification.badge || '/vite.svg',
      tag: notification.tag || 'default',
      data: {
        url: notification.url || '/',
        timestamp: Date.now(),
      },
      requireInteraction: notification.requireInteraction || false,
      actions: notification.actions || [],
    });

    const webPushUrl = subscription.endpoint;

    const vapidHeader = await generateVAPIDHeaders(
      webPushUrl,
      vapidPrivateKey,
      vapidPublicKey
    );

    const encryptedPayload = await encryptPayload(
      payload,
      subscription.keys.p256dh,
      subscription.keys.auth
    );

    const response = await fetch(webPushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Content-Length': encryptedPayload.length.toString(),
        'TTL': '86400',
        ...vapidHeader,
      },
      body: encryptedPayload,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`Push failed: ${response.status} ${response.statusText}`, errorText);

      // Handle specific error cases
      if (response.status === 410 || response.status === 404) {
        // Subscription expired or not found - mark for deletion
        return { success: false, shouldDelete: true };
      }

      return { success: false, shouldDelete: false };
    }

    return { success: true, shouldDelete: false };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, shouldDelete: false };
  }
}

async function generateVAPIDHeaders(
  endpoint: string,
  privateKey: string,
  publicKey: string
): Promise<Record<string, string>> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.hostname}`;

  const jwt = await createJWT(
    {
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: 'mailto:support@warranty.app',
    },
    privateKey
  );

  return {
    'Authorization': `vapid t=${jwt}, k=${publicKey}`,
  };
}

async function createJWT(
  payload: Record<string, any>,
  privateKey: string
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signature = await signToken(unsignedToken, privateKey);

  return `${unsignedToken}.${signature}`;
}

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function signToken(token: string, privateKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);

  const keyData = base64UrlDecode(privateKey);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    key,
    data
  );

  return arrayBufferToBase64Url(signature);
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { user_id, organization_id, notification, preferences_filter }: SendPushRequest = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: organization_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!notification?.title || !notification?.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required notification fields: title and body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidPublicKey = Deno.env.get('VITE_VAPID_PUBLIC_KEY');

    if (!vapidPrivateKey || !vapidPublicKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({
          error: 'Push notifications not configured on server',
          details: 'VAPID keys missing. Please configure VAPID_PRIVATE_KEY and VITE_VAPID_PUBLIC_KEY in Supabase secrets.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    let query = `organization_id=eq.${organization_id}&enabled=eq.true`;

    if (user_id) {
      query += `&user_id=eq.${user_id}`;
    }

    const subscriptionsResponse = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?${query}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!subscriptionsResponse.ok) {
      const errorText = await subscriptionsResponse.text();
      console.error('Failed to fetch push subscriptions:', errorText);
      throw new Error('Failed to fetch push subscriptions');
    }

    const subscriptions = await subscriptionsResponse.json();

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          total: 0,
          message: 'No active push subscriptions found',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const filteredSubscriptions = subscriptions.filter((sub: any) => {
      if (!preferences_filter) return true;

      const prefs = sub.preferences || {};

      if (preferences_filter.new_messages && !prefs.new_messages) return false;
      if (preferences_filter.claim_updates && !prefs.claim_updates) return false;
      if (preferences_filter.warranty_expiring && !prefs.warranty_expiring) return false;
      if (preferences_filter.system_alerts && !prefs.system_alerts) return false;

      return true;
    });

    const results = await Promise.all(
      filteredSubscriptions.map(async (subscription: any) => {
        const result = await sendPushToSubscription(
          subscription,
          notification,
          vapidPrivateKey,
          vapidPublicKey
        );

        if (result.success) {
          // Update last_used_at timestamp
          await fetch(
            `${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${subscription.id}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                last_used_at: new Date().toISOString(),
              }),
            }
          );
        } else if (result.shouldDelete) {
          // Delete expired/invalid subscription
          console.log(`Deleting expired subscription: ${subscription.id}`);
          await fetch(
            `${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${subscription.id}`,
            {
              method: 'DELETE',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
              },
            }
          );
        }

        return {
          subscription_id: subscription.id,
          success: result.success,
          deleted: result.shouldDelete
        };
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const deletedCount = results.filter(r => r.deleted).length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        deleted: deletedCount,
        total: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
