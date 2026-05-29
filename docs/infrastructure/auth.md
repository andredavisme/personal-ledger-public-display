# Infrastructure — Authentication
**Last Updated:** May 29, 2026
**Status:** Current

> **Previous provider:** Netlify Identity was used as a temporary auth provider during the initial deployment phase. It has been fully replaced by Supabase Auth. See **Historical Note** at the bottom of this document.

---

## Current Provider: Supabase Auth

Supabase Auth is the live, permanent authentication provider for this project. It is the same Supabase project (`hhyhulqngdkwsxhymmcd`) used for the database and Edge Functions.

### Admin Authentication

| Property | Value |
|---|---|
| Method | Email + password (Supabase Auth) |
| Role gate | `public.profiles.show_role = 'admin'` |
| Session scope | Supabase Auth JWT, managed by `@supabase/supabase-js` |
| Registration | Closed — admin account created directly in Supabase Auth dashboard |

**Flow:**
1. Admin navigates to `/admin`
2. `admin.js` calls `supabase.auth.getSession()`
3. If no active session → redirect to `/login`
4. After successful login, `admin.js` reads `public.profiles` for the authenticated user
5. If `show_role !== 'admin'` → redirect to `/` (access denied)
6. Admin UI renders only after both checks pass

---

### Community Representative Authentication

| Property | Value |
|---|---|
| Method | Magic link sent to `public.submissions.contact_email` |
| Role gate | `public.profiles.show_role = 'community_rep'` |
| Session scope | Supabase Auth JWT |
| Trigger | Assigned automatically by `handle_submission_approved` trigger on approval |

**Flow:**
1. Admin approves a submission
2. `handle_submission_approved` trigger fires → creates Supabase Auth user for contact email, sets `show_role = 'community_rep'` in `public.profiles`
3. Magic link sent to community contact email
4. Rep clicks link → lands on `/portal`
5. `portal.js` verifies session and `show_role = 'community_rep'`, scopes all queries to the rep’s `submission_id`

---

### Role Values

Valid values for `public.profiles.show_role`:

| Value | Access |
|---|---|
| `viewer` | Default — no elevated access |
| `community_rep` | Community Finance Portal access, scoped to their submission |
| `admin` | Full admin panel access |

> **Important:** The value `'moderator'` was an early placeholder that was renamed to `'community_rep'`. It must not appear in any policy, function, or application code. See `docs/tutorial/08-debugging-role-naming-drift.md` and migration `rename_moderator_to_community_rep_in_rls` for the full record.

---

### Auth Abstraction Layer

All auth calls go through `assets/js/auth.js`. No other file imports or calls Supabase Auth directly.

```
Application code
     ↓
  auth.js
  supabase.auth.getSession()
  supabase.auth.signInWithPassword()
  supabase.auth.signOut()
  supabase.auth.onAuthStateChange()
     ↓
  Supabase Auth (hhyhulqngdkwsxhymmcd)
```

---

### Supabase Auth Configuration

- **Site URL:** `https://personal-ledger-public-display.pages.dev`
- **Redirect URLs:** Include both production URL and `localhost` variants for local dev
- **Email confirmations:** Enabled for magic link flow
- **JWT expiry:** Default (1 hour); refresh tokens managed by Supabase client

---

## Historical Note — Netlify Identity (Deprecated)

Netlify Identity was used as the auth provider during the first deployment phase. It was chosen because it required no backend code and was free on the Netlify plan.

It was replaced by Supabase Auth when the project migrated from Netlify to Cloudflare Pages. Supabase Auth is already in the stack, supports role-based access via `public.profiles`, and eliminates the Netlify dependency entirely.

Netlify Identity is no longer present in any file in this project. The `PROVIDER` abstraction in the original `auth.js` design (intended to allow a single-line swap) was replaced by a direct Supabase Auth implementation.

---

## Related Files
- `docs/infrastructure/deployment.md` — hosting and deployment pipeline
- `docs/architecture/community-finance-portal.md` — community rep portal auth flow
- `docs/tutorial/08-debugging-role-naming-drift.md` — role naming incident and fix
- Migration: `rename_moderator_to_community_rep_in_rls`
