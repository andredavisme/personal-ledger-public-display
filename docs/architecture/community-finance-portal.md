# Architecture — Community Finance Portal
**Last Updated:** May 29, 2026

> This document defines the full architecture for the Community Finance Portal — the magic-link-gated hub where community representatives manage their ongoing relationship with donors and administrators.

---

## Purpose

The Community Finance Portal is the community's operational interface. It is not a one-time form — it is an ongoing relationship hub that gives community reps a place to:

- Confirm receipt of donations and upload supporting documentation
- Submit expense records showing how funds were applied
- Send personal messages to their supporters
- (Future) View their donation history, pipeline status, and upcoming digest schedule

This portal feeds directly into the transparency page and admin verification workflow.

---

## Authentication

| Method | Detail |
|---|---|
| Primary | **Magic link** sent to the community’s submission email (`public.submissions.contact_email`) |
| Fallback | Gmail OAuth if magic link creates conflicts with existing auth sessions |
| Session scope | Supabase Auth — same project (`hhyhulqngdkwsxhymmcd`) |

When a community rep clicks their magic link, they are authenticated as a Supabase user and their session is scoped to their community’s `submission_id`.

> The portal must verify that the authenticated user’s email matches a row in `public.submissions` and read the associated `submission_id` for all subsequent queries.

---

## Portal Sections

### 1. Receipt Confirmation
**Purpose:** Confirm that a donation was received and provide documentation.

**Workflow:**
1. Rep selects from a list of unconfirmed donations linked to their community
2. Submits confirmation: amount received, date received, optional document upload (PDF/image)
3. Record inserted into `public.community_financials` with `type = receipt`, `status = self_reported`
4. Admin reviews in Admin Finance Verification panel and promotes to `verified`
5. Verified record surfaces in Stage 3 of the transparency page

**Form Fields:**
- Donation reference (auto-linked from `public.donations`)
- Amount received (pre-filled from donation record; editable)
- Date received
- Notes (optional)
- Document upload (optional — stored in Supabase Storage)

---

### 2. Expense Record Submission
**Purpose:** Document how donated funds were applied.

**Workflow:**
1. Rep submits an expense: description, amount, date, category, optional receipt
2. Record inserted into `public.community_financials` with `type = expense`, `status = pending`
3. Admin reviews and approves or rejects in Admin Finance Verification panel
4. Approved records surface in Stage 4 of the transparency page

**Form Fields:**
- Description (what was purchased or paid for)
- Amount
- Date
- Category (e.g., supplies, rent support, food, transportation, other)
- Notes (optional)
- Receipt upload (optional — stored in Supabase Storage)

---

### 3. Message to Supporters
**Purpose:** Allow community reps to post a personal update or thank-you visible to donors.

**Workflow:**
1. Rep writes a message (text only, no HTML)
2. Message stored in `public.community_financials` with `type = message`, `status = pending`
3. Admin reviews and approves
4. Approved message displayed on community’s public page or transparency card

**Form Fields:**
- Message body (text area, max 500 characters)
- Optional subject line

---

## `public.community_financials` Table

This table is the shared data source for the portal, admin verification panel, and transparency page.

```sql
CREATE TABLE public.community_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id),
  donation_id UUID REFERENCES public.donations(id),      -- nullable; links to a specific donation if applicable
  type TEXT NOT NULL CHECK (type IN ('receipt', 'expense', 'message')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'self_reported', 'verified', 'approved', 'rejected')),
  amount NUMERIC(10, 2),                                  -- nullable for messages
  currency TEXT DEFAULT 'USD',
  description TEXT,
  notes TEXT,
  document_url TEXT,                                      -- Supabase Storage URL if file uploaded
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Status Flow
```
receipt:  self_reported → verified  (admin promotes)
expense:  pending → approved | rejected  (admin reviews)
message:  pending → approved | rejected  (admin reviews)
```

---

## RLS Policies Required

| Policy | Detail |
|---|---|
| Community rep INSERT | Authenticated user whose email matches a `submissions.contact_email` row may insert rows scoped to that `submission_id` |
| Community rep SELECT | Same scope — rep may only read their own community’s records |
| Admin ALL | `profiles.show_role IN ('admin', 'community_rep')` — see Note below |
| Anon SELECT | `status IN ('verified', 'approved')` rows only — feeds transparency page without auth |

> **Note on role values:** The valid `show_role` values in `public.profiles` are `'viewer'`, `'community_rep'`, and `'admin'`. The value `'moderator'` was an early placeholder that was renamed to `'community_rep'` in migration `rename_moderator_to_community_rep_in_rls`. Do not use `'moderator'` in any new policy. See `docs/tutorial/08-debugging-role-naming-drift.md` for the full incident record.

---

## Portal Pages

| File | Purpose |
|---|---|
| `portal.html` | Entry point — magic link lands here; auth check before rendering |
| `assets/js/portal.js` | Auth verification, community scoping, section routing |
| `assets/css/portal.css` | Portal-specific styles |

---

## Document Storage

- Uploaded files stored in Supabase Storage bucket: `community-docs`
- Path convention: `{submission_id}/{community_financials_id}/{filename}`
- Bucket access: authenticated upload (community rep session), anon read blocked
- Admin can access all files via service role or admin-scoped signed URLs

---

## Admin Finance Verification Panel

A new section in `admin.html` (separate from existing Donation Pledges panel):

- Lists all `community_financials` rows with `status IN ('pending', 'self_reported')`
- Shows: community name, type (receipt / expense / message), amount, description, submitted date, document link
- Admin actions: **Approve / Verify** → promotes status; **Reject** → sets status to `rejected` with optional note
- All actions logged to `public.admin_actions`

---

## Build Order

1. **`public.community_financials` migration** — table + RLS + Supabase Storage bucket
2. **`portal.html` + `portal.js` + `portal.css`** — auth-gated community hub
3. **Admin Finance Verification panel** — `admin-finance.js` + `admin.html` section + `admin.css` additions
4. **`transparency.html` + `transparency.js`** — consumes verified/approved records from this table

---

## Future Extensions

- Community dashboard: view donation history, pipeline status, upcoming digest
- Digest opt-out toggle per community rep
- Direct reply from admin to community rep via portal message thread
- Community-initiated update posts displayed publicly on community card
