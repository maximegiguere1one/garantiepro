# Supabase Setup Guide - Fix Connection Error

## Current Issue

You're seeing the error: **"Erreur de connexion à la base de données. Veuillez réessayer."**

This happens because the Supabase credentials in your `.env` file are pointing to a non-existent or paused project.

## Solution

### Step 1: Get Your Supabase Credentials

**Option A: If you already have a Supabase project**

1. Go to https://supabase.com and sign in
2. Select your project from the dashboard
3. Click on the **Settings** icon (gear) in the left sidebar
4. Go to **API** section
5. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

**Option B: If you need to create a new project**

1. Go to https://supabase.com and sign in (or create account)
2. Click **"New Project"**
3. Choose your organization (or create one)
4. Fill in:
   - **Name**: `warranty-management` (or your preferred name)
   - **Database Password**: Choose a strong password (save it securely!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free tier is fine for development
5. Click **"Create new project"** and wait 2-3 minutes for setup
6. Once ready, go to **Settings → API** and copy:
   - **Project URL**
   - **anon/public key**

### Step 2: Update Your .env File

Open the `.env` file in the project root and replace these values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**IMPORTANT**:
- Replace `your-project-ref` with your actual project reference
- Replace `your-actual-anon-key-here` with the anon/public key you copied
- You can find the service role key in the same API settings page (be careful, it's more powerful!)

### Step 3: Run Database Migrations

After updating the `.env` file, you need to set up the database schema:

**Using Supabase Dashboard (Recommended for first-time setup)**

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **"New query"**
4. Copy and paste the content of each migration file from `supabase/migrations/` folder
5. Start with the oldest: `20251003235928_create_warranty_management_schema.sql`
6. Run each migration in chronological order (by filename timestamp)
7. Verify no errors occur

**Using Supabase CLI (Advanced)**

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run all migrations
supabase db push
```

### Step 4: Verify Connection

1. Save your `.env` file
2. Restart your development server:
   ```bash
   npm run dev
   ```
3. Open the application in your browser
4. You should see the login page without errors

### Step 5: Create Your First Admin User

1. Go to the login page
2. You won't have credentials yet, so you need to create a user directly in Supabase
3. Go to **Authentication → Users** in your Supabase dashboard
4. Click **"Add user"** → **"Create new user"**
5. Enter:
   - **Email**: `admin@example.com` (or your email)
   - **Password**: Choose a secure password
   - Check **"Auto Confirm User"** (important!)
6. Click **"Create user"**
7. Now go to **SQL Editor** and run:
   ```sql
   -- Update the user to admin role
   UPDATE profiles
   SET role = 'admin'
   WHERE email = 'admin@example.com';
   ```
8. Go back to your app and login with these credentials

## Troubleshooting

### Error: "Missing Supabase environment variables"

- Make sure your `.env` file has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Variables must start with `VITE_` to be accessible in the frontend
- Restart your dev server after changing `.env`

### Error: "Project not found" or 404

- Your Supabase project may be paused (free tier pauses after 7 days of inactivity)
- Go to your Supabase dashboard and click "Restore project" if paused
- Verify the URL is correct (no typos)

### Error: "Invalid API key" or 401

- Your anon key may be wrong or expired
- Go to Settings → API and copy the current anon key
- Update `.env` with the new key
- Restart dev server

### Error: "relation does not exist" or PGRST errors

- Database schema not set up
- Run all migrations as described in Step 3
- Verify tables exist in **Table Editor** in Supabase dashboard

### Connection works but can't login

- Profile may not be created automatically
- Check if user exists in Authentication → Users
- Check if profile exists: `SELECT * FROM profiles WHERE email = 'your-email';`
- If profile doesn't exist, the trigger may not have run. Check migration files are applied.

## Quick Health Check

To verify your connection, you can add this to any component:

```typescript
import { performHealthCheck } from './lib/supabase-health-check';

// Run this
const health = await performHealthCheck();
console.log('Supabase Health:', health);
```

If everything is working, you should see:
```
{
  status: 'healthy',
  checks: {
    connection: true,
    authentication: true,
    database: true
  }
}
```

## Need Help?

If you're still having issues:

1. Check the browser console for detailed error messages
2. Verify your `.env` file is in the project root (same folder as `package.json`)
3. Make sure you restarted the dev server after changing `.env`
4. Check Supabase dashboard → Logs for any database errors
5. Verify your project isn't paused in the Supabase dashboard

## Security Notes

- Never commit your `.env` file to git (it's in `.gitignore` by default)
- The anon key is safe to expose in frontend code (it has limited permissions)
- The service role key is powerful - never expose it in frontend code
- Always use Row Level Security (RLS) policies to protect data
