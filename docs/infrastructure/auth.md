# Authentication Architecture

## Current Provider: Netlify Identity

Netlify Identity is used as a **temporary auth provider** for the admin page during the initial deployment phase. It was chosen because:
- It requires no backend code to implement
- It is free and included in the Netlify free plan
- It can be replaced entirely by changing one file (`assets/js/auth.js`)

### Admin Access Setup (Netlify)
1. Enable Netlify Identity in the Netlify dashboard (Site Settings → Identity)
2. Set registration to **Invite only**
3. Invite the admin user by email
4. In the Identity dashboard, assign the invited user the `admin` role
5. The `Auth.isAdmin()` function in `auth.js` checks for this role

## Future Provider: Supabase Auth

Supabase Auth is the intended long-term auth provider because:
- It is already in the stack (same Supabase project)
- It supports role-based access via JWT custom claims or `ledger.user_roles` table
- It eliminates the Netlify dependency entirely
- Migration is a single-file change (see `assets/js/auth.js` migration guide)

### Migration Steps
See the `MIGRATION GUIDE` comment block at the top of `assets/js/auth.js`.

## Auth Abstraction Layer

All auth calls in the application go through `assets/js/auth.js`.

```
Application code
     ↓
  Auth.login()
  Auth.logout()
  Auth.getCurrentUser()
  Auth.isAdmin()
     ↓
  auth.js (single provider swap point)
     ↓
  Netlify Identity  →  (future) Supabase Auth
```

No other file imports or calls an auth provider directly.
