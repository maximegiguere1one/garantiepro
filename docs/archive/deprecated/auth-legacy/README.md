# Legacy Auth Code

This folder contains the original authentication implementation for reference.

## Moved Files

The following files have been moved here as part of the auth refactoring:

- **AuthContext.tsx (original)** - Legacy auth context with direct Supabase calls
- **OrganizationContext.tsx (original)** - Legacy organization context

## Why Moved?

These files were part of the original implementation that had:
- Direct Supabase calls mixed with business logic
- No adapter pattern for demo/production separation
- Complex error handling spread across components
- Difficult to test in isolation

## New Implementation

The new implementation uses:
- **Data Layer** (`src/data/`) - Clean adapter pattern
- **AuthProvider** (`src/contexts/AuthProvider.tsx`) - Simplified auth logic
- **Adapters** - Separate supabase-adapter and demo-adapter
- **Types** - Strongly typed interfaces

## Rollback

If you need to rollback to the legacy implementation:

1. Copy files from this folder back to `src/contexts/`
2. Update imports in components
3. Remove new `src/data/` folder
4. Revert `src/contexts/AuthProvider.tsx` changes

**Note:** Keep this folder for at least 48 hours after production deployment is stable.

---

**Date Moved:** November 9, 2025
**Reason:** Architecture refactoring for better testability and separation of concerns
**New Location:** See `src/data/` and `src/contexts/AuthProvider.tsx`
