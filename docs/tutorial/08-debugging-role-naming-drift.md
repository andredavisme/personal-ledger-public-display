# 08 — Debugging Role Naming Drift: The `moderator` → `community_rep` Problem
**Last Updated:** May 29, 2026

> **What this teaches:** How a naming inconsistency introduced early in development can silently block an entire feature — and the methodical chain of diagnostic steps that finally surfaces it.

---

## The Symptom

A community representative with a fully approved submission was unable to access the Community Finance Portal. Instead of the portal, they saw a redirect card: **"Admin Session Active — Go to Admin Panel."**

The admin account (`andre.davis.me@gmail.com`) was working fine. The portal redirect logic itself was working correctly. Everything *appeared* to be functioning — yet the portal was inaccessible.

---

## Why This Was Hard to Spot

The failure was silent. There were no errors in the browser console, no failed network requests, and no Supabase RLS errors surfaced to the UI. The portal simply redirected — which is the *correct behavior* for an unauthorized user.

The problem was not in the code that was written for this feature. It was in code written months earlier, before the role naming had been finalized.

---

## The Diagnostic Chain

This is the sequence of hypotheses explored before finding the root cause. Each step was logically sound given what was known at the time.

### Step 1 — Is the role assigned at all?
Checked whether `profiles.show_role` had been set for the user in question.

```sql
SELECT p.id, u.email, p.show_role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'andre.davis.me@gmail.com';
```

**Result:** `show_role = 'admin'`. Role was set. This eliminated auth assignment as the cause.

### Step 2 — Do the functions and trigger exist?
Verified that the RBAC functions deployed in earlier migrations were present.

```sql
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'approve_community_rep', 'reject_community_rep',
    'handle_submission_approved', 'set_rep_display', 'my_show_role'
  );
```

**Result:** All 5 functions present as `SECURITY DEFINER`. This eliminated missing infrastructure as the cause.

### Step 3 — Do the RLS policies reference the right role value?
Inspected every RLS policy in the `public` schema that referenced `show_role`.

```sql
SELECT tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual ILIKE '%show_role%' OR with_check ILIKE '%show_role%');
```

**Result:** Every policy that was supposed to grant community rep access checked for:

```sql
show_role = ANY (ARRAY['admin'::text, 'moderator'::text])
```

`'community_rep'` did not appear anywhere in the policy arrays. The role value in `profiles` and the role value in the policies had never been the same string.

---

## Root Cause

The RLS policies were written during an early development phase, before the role vocabulary was finalized. The author used `'moderator'` as a shorthand for "elevated non-admin user" — a reasonable placeholder at the time.

When the role was formally named `community_rep` in planning documentation (see `docs/architecture/community-finance-portal.md`), the policies were never updated to match. The planning docs, the migration code, and the portal logic all used `community_rep` — but the policies silently continued to check for `moderator`.

Because `profiles.show_role` had no constraint at the time of policy creation, there was no database-level error. A user with `show_role = 'community_rep'` simply never matched any policy granting elevated access.

---

## The Fix

Two changes were made in migration `rename_moderator_to_community_rep_in_rls`:

**1. All 10 affected RLS policies were rewritten** — replacing `'moderator'` with `'community_rep'` in the role arrays.

Affected tables:
- `community_financials` (2 policies)
- `contributors`
- `donations`
- `guests`
- `polls`
- `posts`
- `recognition_wall`
- `shows`
- `stream_links`

**2. The `profiles_show_role_check` constraint was tightened** to explicitly permit only the three valid values:

```sql
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_show_role_check
  CHECK (show_role IN ('viewer', 'community_rep', 'admin'));
```

This ensures that `'moderator'` cannot be assigned to any future user, closing the drift permanently.

---

## The Methodology That Found It

When a feature appears to be working (no errors, correct redirects, all infrastructure present) but access is still blocked, the failure is almost always in **the gap between two systems that each believe they are correct**.

The diagnostic sequence that works:

1. **Verify the data** — confirm the value actually stored in the database matches what you expect
2. **Verify the infrastructure** — confirm functions, triggers, and constraints are deployed
3. **Verify the contract** — confirm that the *exact string values* used by the data match the *exact string values* checked by the policies

Step 3 is the one that gets skipped. It feels obvious in retrospect, but it requires going directly to `pg_policies` and reading the raw policy SQL — not the code you wrote, but the SQL that is actually executing.

The naming drift was invisible to application-level debugging because both sides were technically correct. The `profiles` row had a valid role. The policy had valid logic. Only when compared directly did the mismatch appear.

---

## What to Watch For in Your Own Projects

- **Role values are strings.** Unlike enums enforced at the type level, text-based role columns allow any value to be stored. A constraint is the only guard.
- **Policies don't fail loudly.** A non-matching RLS policy doesn't throw an error — it simply returns no rows or denies access silently.
- **Naming decisions made early spread everywhere.** If a placeholder name is used in migrations, it will appear in policies, functions, and comments across the codebase. Renaming it later requires a deliberate audit, not just updating the new code.
- **Read the policy SQL, not the application code.** Your app code may use the right name. The policy it relies on may not.

---

## Related Files
- `docs/architecture/community-finance-portal.md` — where `community_rep` was formally defined
- Migration: `add_community_rep_rbac` — where the role and request table were created
- Migration: `submission_approval_triggers_rep_and_display_control` — where the trigger was wired
- Migration: `rename_moderator_to_community_rep_in_rls` — the fix
