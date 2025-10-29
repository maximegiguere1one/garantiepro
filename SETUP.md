# Warranty Management System - Setup Guide

## Quick Start

### 1. Create Demo Admin User

To get started, you need to create an admin user in Supabase. Run this SQL in your Supabase SQL Editor:

```sql
-- Create a demo admin user
-- Email: admin@warranty.ca
-- Password: password

-- Note: You'll need to sign up through the application first, then update the profile role

-- After signing up through the app, run this to make the user an admin:
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@warranty.ca';
```

### 2. Environment Setup

Your `.env` file should already have the Supabase connection details. The application will connect automatically.

### 3. Email Configuration (IMPORTANT)

For email notifications to work, you MUST configure Resend:

**Quick Setup (10 minutes):**
1. Create account at https://resend.com/signup
2. Get API key from https://resend.com/api-keys
3. Add secrets in Supabase Dashboard (Settings > Edge Functions > Secrets):
   - `RESEND_API_KEY` = your API key
   - `FROM_EMAIL` = onboarding@resend.dev (or your verified domain)
   - `FROM_NAME` = Pro-Remorque

See `FIX_RAPIDE_EMAIL.md` for quick instructions or `RESEND_SETUP_GUIDE.md` for detailed guide.

### 4. Login Credentials

After creating the admin user:
- Email: `admin@warranty.ca`
- Password: `password`

### 5. Database Schema

The database schema includes:
- **profiles** - User roles (admin, f_and_i, operations, client)
- **warranty_plans** - Pre-seeded with 4 plans (Essential, Plus, Premium, Commercial)
- **warranty_options** - 5 add-on options available
- **customers** - Customer information
- **trailers** - Trailer details
- **warranties** - Warranty contracts with legal validation
- **payments** - Payment tracking (Stripe ready)
- **claims** - 5-step claim workflow
- **loyalty_credits** - $2,000 CAD loyalty tracking
- **nps_surveys** - Customer satisfaction tracking
- **audit_log** - Complete audit trail

## Key Features Implemented

### Sales & Quotes (< 5 minutes)
- Multi-step warranty creation form
- Customer and trailer information capture
- 3-plan comparison interface (Essential, Plus, Premium)
- Add-on options selection
- Real-time price calculation with provincial taxes
- Legal validation (province, duration, deductible)
- Sale duration tracking

### Claims Management
- 5-step workflow (Incident → Documentation → Review → Decision → Resolution)
- Visual progress tracker
- SLA deadline tracking
- Repair shop integration with PO numbers
- Automatic letter generation (approved/partially approved/denied)
- Complete claim timeline

### Legal Controls
- Province validation
- Duration validation (12-60 months)
- Deductible validation ($0-$2,000)
- Language compliance (Quebec FR-CA requirements)
- Warning system for non-blocking issues
- Blocks signature if validation fails

### Loyalty Program
- Automatic $2,000 CAD credit tracking
- Eligibility based on claim history
- Dashboard visibility

### Security & Compliance
- Row Level Security (RLS) enabled on all tables
- Role-based access control (Admin, F&I, Operations, Client)
- CASL-compliant marketing consent
- Complete audit logging
- IP address and user agent tracking

### Analytics Dashboard
- Total revenue and margin tracking
- Monthly growth calculations
- Average sale duration
- Open claims monitoring
- ROI impact display ($1,470 savings per warranty)

## User Roles

1. **Admin** - Full system access, settings, analytics
2. **F&I (Finance & Insurance)** - Warranty sales, customer management
3. **Operations** - Claims management, customer support
4. **Client** - View own warranties and file claims

## Next Steps

1. Sign up through the application UI
2. Update your profile to 'admin' role using SQL
3. Create warranty plans and options (already seeded)
4. Start processing warranty sales
5. Test the claim workflow

## ROI Metrics

- **Cost per warranty with intermediary**: $1,500 CAD
- **Variable costs (payment, signature, SMS)**: $30-40 CAD
- **Net savings per warranty**: $1,460-$1,470 CAD
- **Target sale duration**: < 5 minutes

## Technical Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS with custom design system
