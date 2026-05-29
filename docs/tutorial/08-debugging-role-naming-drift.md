# 08 — Debugging Role Naming Drift: The `moderator` → `community_rep` Problem
**Last Updated:** May 29, 2026

> **What this teaches:** How a naming inconsistency introduced early in development can silently block an entire feature — and the methodical chain of diagnostic steps that finally surfaces it.

---

## The Symptom

A community representative with a fully approved submission was unable to access the Community Finance Portal. Instead of the portal, they saw a redirect card: **“Admin Session Active — Go to Admin Panel.”**

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

The RLS policies were written during an early development phase, before the role vocabulary was finalized. The author used `'moderator'` as a shorthand for “elevated non-admin user” — a reasonable placeholder at the time.

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
- **Policies don’t fail loudly.** A non-matching RLS policy doesn’t throw an error — it simply returns no rows or denies access silently.
- **Naming decisions made early spread everywhere.** If a placeholder name is used in migrations, it will appear in policies, functions, and comments across the codebase. Renaming it later requires a deliberate audit, not just updating the new code.
- **Read the policy SQL, not the application code.** Your app code may use the right name. The policy it relies on may not.

---

## Related Files
- `docs/architecture/community-finance-portal.md` — where `community_rep` was formally defined
- Migration: `add_community_rep_rbac` — where the role and request table were created
- Migration: `submission_approval_triggers_rep_and_display_control` — where the trigger was wired
- Migration: `rename_moderator_to_community_rep_in_rls` — the fix

---

## ✅ Concept Check — Section 8

*Write your responses in your own words.*

**1.** The bug in this case study produced no error messages — just a redirect that looked correct. In your own words, explain why silent failures are harder to debug than loud ones.

**2.** The diagnostic chain had three steps: verify the data, verify the infrastructure, verify the contract. The root cause was found at Step 3. Why might someone skip Step 3, and what assumption would they be making if they did?

**3.** A database constraint was added as part of the fix to prevent `'moderator'` from ever being assigned again. In your own words, explain the difference between fixing a bug and closing the gap that allowed the bug. Why does the second matter?

**4.** The section says: “Naming decisions made early spread everywhere.” Think of a time in your own life — not in software — when an early decision or label stuck around longer than it should have and caused confusion later. What would have prevented it?

---

## 🏁 Milestone 8 — Name Your Roles Before You Build Them

The bug in this section happened because a placeholder name was used before the real name was decided. This milestone asks you to decide your role names *now* — before any policies are written, before any functions are created, before any columns are set.

This is not a technical step. It is a naming step. But naming is infrastructure.

### Steps

**1. Open `my-notes.md`** and add a new section:

```
## Section 8 — Role Naming

### The roles in my application
[List every user type your application will have. For each one, write:
  - The exact string value you will use in the database (e.g. community_rep)
  - One sentence describing what this role can do
  - One sentence describing what this role cannot do
Do not use placeholder names. If you are not sure what to call it,
decide now and write your reasoning.]

### How I will prevent naming drift
[Write 1–2 sentences describing how you will keep role names consistent
across your policies, functions, and application code.
Example: “I will define all role values in a single SQL file and reference
that file every time I write a new policy.”]

### The constraint I will add
[Write the CHECK constraint you would add to your profiles table to enforce
that only your named roles can be stored. Use the format from this section.]
```

**2. Fill in all three fields** with answers specific to your project.

**3. Save the file.**

**4. Add this document to your `documentation_catalog`**
- Go to Supabase → **SQL Editor**
- Run an INSERT to add `08-debugging-role-naming-drift.md` to the catalog
- Use `doc_type = 'tutorial'`, `category = 'methodology'`
- Tags suggestion: `'debugging', 'rbac', 'rls', 'naming', 'roles', 'sql'`

> ### 💡 Help Your Future You — Decide Names Before You Write Policies
> Every time you write a policy that checks `show_role = 'something'`, you are committing to that string. If that string ever changes, you are committing to a migration that touches every policy that referenced it. Make the decision once, write it in your notes, and treat it as final unless you are willing to do a full audit of everything that depends on it.

---

## ✅ Milestone Concept Check — Section 8

*Answer these after completing the milestone steps above.*

**1.** You wrote the exact string values you will use for roles in your application. Read them back. Are any of them placeholder names you might want to change later? If so, change them now, before they appear in any policy.

**2.** You wrote a constraint for your profiles table. Does your constraint allow any edge cases you did not intend? For example, does it allow a user to have no role at all, or does the column require a value? Which behavior is right for your project?

**3.** You added Section 8 to the documentation catalog. Look at the tags you chose. Are they specific enough that a future collaborator — someone who has never seen this project — could find this document by searching for the right keyword? If not, what would you change?
