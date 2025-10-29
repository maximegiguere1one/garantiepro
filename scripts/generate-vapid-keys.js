#!/usr/bin/env node

/**
 * VAPID Key Generator for Push Notifications
 *
 * This script generates VAPID (Voluntary Application Server Identification) keys
 * required for Web Push notifications.
 *
 * Usage: node scripts/generate-vapid-keys.js
 */

import crypto from 'crypto';

function generateVapidKeys() {
  console.log('\n🔐 Generating VAPID Keys for Push Notifications...\n');

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });

  const publicKeyBase64 = publicKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const privateKeyBase64 = privateKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  console.log('✅ VAPID Keys Generated Successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 Add these to your .env file:\n');
  console.log('VITE_VAPID_PUBLIC_KEY=' + publicKeyBase64);
  console.log('VITE_VAPID_PRIVATE_KEY=' + privateKeyBase64);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  IMPORTANT SECURITY NOTES:\n');
  console.log('1. Keep your private key SECRET - never commit it to version control');
  console.log('2. The public key can be safely shared with the client');
  console.log('3. Store the private key as a Supabase secret for Edge Functions');
  console.log('4. These keys are unique to your application - do not share them\n');
  console.log('📚 Next Steps:\n');
  console.log('1. Copy the keys to your .env file');
  console.log('2. Add VITE_VAPID_PRIVATE_KEY to Supabase secrets:');
  console.log('   supabase secrets set VAPID_PRIVATE_KEY=<your-private-key>');
  console.log('3. Restart your development server');
  console.log('4. Test push notifications in the app\n');

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateVapidKeys();
}

export { generateVapidKeys };
