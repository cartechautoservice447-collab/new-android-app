# Mobile Phase 1 verification checklist

Use the existing desktop Liquid Glass Studio only as a reference; do not modify it.

## Verify now
- App starts from a clean mobile-first shell.
- Liquid Glass Studio identity is present.
- The supplied master artwork is used as the foundation icon artwork.
- Login screen is mobile-friendly and touch-sized.
- Email/password authentication is wired through Supabase.
- Google OAuth is wired directly through Supabase with account selection.
- Existing sessions are restored with `getSession()` and persisted locally by Supabase Auth.
- Supabase credentials are environment-based and are not committed.
- No Lovable dependency is present.
- No desktop, Android, or Windows code is copied into this project.

## Cannot be fully verified from GitHub alone
- Actual OAuth success against the production Supabase/Google configuration.
- Pixel-perfect appearance on a physical Android/iPhone device.
- Real keyboard, safe-area, browser/PWA, and touch behavior.
- Production database/data synchronization.

Do not add the next product feature until Phase 1 is reviewed and approved.
