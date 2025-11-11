# Quick Fix: Database Connection Error

## Error Message
```
Erreur de connexion à la base de données. Veuillez réessayer.
```

## What's Wrong?

The `.env` file contains credentials for a Supabase project that either:
- Doesn't exist anymore
- Is paused (free tier pauses after 7 days inactivity)
- Has incorrect credentials

## Quick Fix (5 Minutes)

### Step 1: Get Your Supabase Credentials

**If you already have a Supabase account:**

1. Go to https://supabase.com and login
2. Check if your project is paused - if so, click "Restore"
3. Click on your project
4. Go to **Settings** (gear icon) → **API**
5. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`

**If you need a new project:**

1. Go to https://supabase.com and create account (free)
2. Click **"New Project"**
3. Fill in:
   - Name: `warranty-management`
   - Password: Choose strong password (save it!)
   - Region: Choose closest to you
4. Wait 2-3 minutes for project creation
5. Go to **Settings → API** and copy URL + anon key

### Step 2: Update .env File

Open `.env` file in project root and update:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace with your actual values!

### Step 3: Setup Database (New Projects Only)

If you created a NEW project, you need to run the migrations:

1. In Supabase dashboard, click **SQL Editor**
2. Click **"New query"**
3. Open `/supabase/migrations/20251003235928_create_warranty_management_schema.sql`
4. Copy all content and paste into SQL Editor
5. Click **"Run"**
6. Repeat for other migration files in order

**OR use Supabase CLI:**

```bash
npm install -g supabase
supabase link --project-ref your-project-ref
supabase db push
```

### Step 4: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Start again
npm run dev
```

### Step 5: Create First User

1. Go to Supabase dashboard → **Authentication → Users**
2. Click **"Add user" → "Create new user"**
3. Enter email and password
4. Check **"Auto Confirm User"**
5. Click **"Create user"**
6. Go to **SQL Editor** and run:
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE email = 'your-email@example.com';
   ```
7. Login with these credentials

## Verify It's Working

You should now be able to:
- See the login page without errors
- Login successfully
- See the dashboard

## Still Not Working?

### Check These:

1. **Environment variables not loading?**
   - Restart dev server completely
   - Check `.env` is in project root (same folder as `package.json`)
   - Variables must start with `VITE_` prefix

2. **Project still paused?**
   - Check Supabase dashboard
   - Click "Restore project" if needed
   - Wait a few minutes after restoring

3. **Wrong credentials?**
   - Double-check you copied the full URL
   - Verify anon key is complete (very long string)
   - No extra spaces or quotes in `.env`

4. **Migrations not applied?**
   - Check **Table Editor** in Supabase
   - Should see tables: profiles, warranties, customers, etc.
   - If missing, run migrations again

## Need More Help?

See detailed guide: `SUPABASE_SETUP_GUIDE.md`

## Current Status

✅ **Database is working** - MCP tools confirm Supabase is functional
❌ **Frontend can't connect** - `.env` has wrong/old credentials

The fix is simply updating your `.env` file with correct credentials!
