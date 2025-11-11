# VAPID Key Generation - Quick Guide

## Problem Solved

The Node.js script `scripts/generate-vapid-keys.js` may not work in certain environments (StackBlitz, WebContainer) due to limitations with the Node.js crypto API.

## Solution: Web-Based Generator

A browser-based VAPID key generator has been created that works in **all environments**.

## How to Use

### Step 1: Open the Generator

Start your development server:
```bash
npm run dev
```

Then open in your browser:
```
http://localhost:5173/generate-vapid-keys.html
```

### Step 2: Generate Keys

1. Click the **"Generate VAPID Keys"** button
2. Wait for the keys to generate (instant)
3. You'll see two keys displayed:
   - **Public Key** (safe to share)
   - **Private Key** (keep secret!)

### Step 3: Copy the Keys

Click the **"Copy"** button next to each key to copy it to your clipboard.

### Step 4: Add to .env

Paste the keys into your `.env` file:

```env
VITE_VAPID_PUBLIC_KEY=your-generated-public-key-here
VITE_VAPID_PRIVATE_KEY=your-generated-private-key-here
```

### Step 5: Configure Supabase Secret

Add the private key as a Supabase secret:

```bash
supabase secrets set VAPID_PRIVATE_KEY=your-generated-private-key-here
```

Or via Supabase Dashboard:
1. Go to Project Settings > Secrets
2. Create new secret: `VAPID_PRIVATE_KEY`
3. Paste your private key

### Step 6: Restart Dev Server

```bash
# Stop the server (Ctrl+C)
npm run dev
```

## Features of the Web Generator

✅ **Works Everywhere**: Compatible with all environments including StackBlitz and WebContainer

✅ **No Dependencies**: Uses native Web Crypto API (built into all modern browsers)

✅ **Secure**: Keys are generated client-side, never sent to any server

✅ **User-Friendly**:
- Visual interface
- One-click copy buttons
- Integrated instructions
- Security warnings

✅ **Standards Compliant**: Generates ECDSA P-256 keys compatible with Web Push standards

## Technical Details

The generator uses the Web Crypto API:
```javascript
crypto.subtle.generateKey(
  {
    name: 'ECDSA',
    namedCurve: 'P-256'
  },
  true,
  ['sign', 'verify']
);
```

Keys are exported in the correct format for VAPID:
- Public Key: SPKI format, base64url encoded
- Private Key: PKCS#8 format, base64url encoded

## Troubleshooting

### Generator Page Not Found

Make sure your dev server is running:
```bash
npm run dev
```

The file is located at: `public/generate-vapid-keys.html`

### Keys Don't Work

Ensure you:
1. Copied the **entire** key (they're long!)
2. Added keys to `.env` with correct variable names
3. Restarted the dev server after updating `.env`
4. Configured the private key in Supabase secrets

### Browser Compatibility

The Web Crypto API is supported in:
- Chrome 37+
- Firefox 34+
- Safari 11+
- Edge 79+

All modern browsers support it.

## Alternative: Node.js Script

If you have a full Node.js environment with crypto support:

```bash
node scripts/generate-vapid-keys.js
```

This will work on:
- Local Node.js installations
- Most CI/CD environments
- Server environments

It will **NOT** work on:
- StackBlitz (limited crypto support)
- Some WebContainer environments
- Browser-based Node.js emulators

## Security Best Practices

🔒 **DO**:
- Generate unique keys for each environment (dev, staging, prod)
- Store private keys in secure locations (environment variables, secrets managers)
- Add `.env` to `.gitignore`
- Rotate keys if compromised

❌ **DON'T**:
- Commit private keys to version control
- Share private keys via email or chat
- Use the same keys across multiple applications
- Expose private keys in client-side code

## Next Steps

After generating keys:

1. ✅ Configure `.env` file
2. ✅ Set Supabase secret
3. ✅ Restart dev server
4. ✅ Test notifications in the app
5. ✅ Follow the full setup guide in `VAPID_SETUP_QUICK_START.md`

## Files Reference

- **Web Generator**: `/public/generate-vapid-keys.html`
- **Node.js Script**: `/scripts/generate-vapid-keys.js`
- **Full Setup Guide**: `/VAPID_SETUP_QUICK_START.md`
- **User Guide**: `/GUIDE_COMMUNICATION_TEMPS_REEL.md`
- **Browser Testing**: `/BROWSER_TESTING_GUIDE.md`

---

**Questions?** Refer to the complete documentation or check the console for any error messages.
