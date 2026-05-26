# Donation Capture — Architecture Spec
**Created:** May 26, 2026
**Status:** Approved for implementation

---

## Overview

This document specifies the design for capturing donation events and issuing receipts when a visitor donates to an approved community on the public Community Page.

The original platform scope ended at **display** — showing a community's accepted donation methods so visitors could transact externally. This spec extends that scope to **capture** — logging the donation event in the database, issuing a receipt to the donor, and surfacing aggregated donation data on the Community Page.

---

## Guiding Principles

- Donations are **self-reported** at launch — the donor declares what they gave and how. No payment processor integration at this stage.
- The system **does not process money** — it records and acknowledges the donor's stated transaction.
- Receipts are **informational**, not tax documents. A separate disclaimer must be displayed to the donor.
- Donor identity is **optional** — anonymous donations are supported.
- All captured data is visible to admins and optionally visible on the Community Page per community settings.

---

## Phases

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Self-reported donation form + DB capture + receipt email | **Build next** |
| 2 | Recognition wall display on Community Page | Follows Phase 1 |
| 3 | PayPal / Stripe webhook verification | Future — requires processor integration |

---

## Phase 1 — Self-Reported Donation Capture

### User Flow

1. Visitor views an approved Community Page
2. Visitor clicks **"I Donated"** button on a donation method card
3. A modal opens with a short self-report form
4. Visitor submits the form
5. Record is written to `public.donations`
6. Edge Function fires → receipt email sent to donor (if email provided)
7. Modal closes with confirmation message

---

### Donation Form Fields

| Field | Type | Status | Notes |
|-------|------|--------|-------|
| Donor Name | text | **Optional** | Displayed on recognition wall if donor consents; defaults to "Anonymous" |
| Donor Email | email | **Optional** | Required only to receive a receipt; never displayed publicly |
| Amount | number | **Required** | Stated donation amount in USD |
| Method | select | **Required** | Pre-populated from the community's `submission_donations` methods |
| Transaction Reference | text | **Optional** | PayPal transaction ID, check number, or other reference the donor has |
| Display on Recognition Wall | checkbox | **Optional** | Defaults to true if name is provided; false if anonymous |
| Message to Community | textarea | **Optional** | Short public message displayed on recognition wall if visible |

**Disclaimer displayed below the form:**
> "This is a self-reported record of your donation. It is not a tax receipt. Please retain your payment confirmation from your payment provider for tax purposes."

---

### Database — `public.donations` (updated schema)

The existing table must be migrated to add missing columns.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `submission_id` | uuid | NO | — | FK → `public.submissions.id` |
| `donor_name` | text | YES | NULL | NULL = anonymous |
| `donor_email` | text | YES | NULL | Never displayed publicly |
| `amount` | numeric(10,2) | NO | — | Stated amount in USD |
| `method` | text | NO | — | PayPal / Stripe / Postal / etc. |
| `transaction_reference` | text | YES | NULL | Donor-provided reference (PayPal txn ID, check #, etc.) |
| `status` | text | NO | 'self_reported' | self_reported / verified / refunded |
| `display_on_wall` | boolean | NO | true | Donor consent for recognition wall |
| `wall_message` | text | YES | NULL | Optional public message |
| `receipt_sent_at` | timestamptz | YES | NULL | NULL if no email provided or not yet sent |
| `contributor_id` | uuid | YES | NULL | Reserved for future auth-linked donors |
| `tier` | text | YES | NULL | Reserved for future tiered giving |
| `paypal_txn_id` | text | YES | NULL | Legacy column — superseded by transaction_reference; retained for compatibility |
| `created_at` | timestamptz | NO | now() | — |

**Migration required:** Add `submission_id`, `donor_name`, `donor_email`, `method`, `transaction_reference`, `status`, `display_on_wall`, `wall_message`, `receipt_sent_at` columns.

---

### Database — `public.recognition_wall` (updated schema)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `donation_id` | uuid | NO | — | FK → `public.donations.id` |
| `submission_id` | uuid | NO | — | FK → `public.submissions.id` (denormalized for query performance) |
| `display_name` | text | NO | — | "Anonymous" or donor-provided name |
| `wall_message` | text | YES | NULL | Donor's optional public message |
| `tier` | text | YES | NULL | Reserved for future tiered giving |
| `is_visible` | boolean | NO | true | Admin can suppress without deleting |
| `featured` | boolean | NO | false | Admin can feature a donor |
| `sort_order` | integer | NO | 0 | Admin-controlled display order |
| `contributor_id` | uuid | YES | NULL | Reserved for future auth-linked donors |
| `created_at` | timestamptz | NO | now() | — |

**Migration required:** Add `donation_id` FK, `submission_id`, rename/add `wall_message`.

---

### Edge Function — `send-donation-receipt`

Follows the same pattern as `send-rejection-email`.

| Property | Value |
|----------|-------|
| Trigger | Called by client after successful `donations` insert, only if `donor_email` is provided |
| Auth | JWT required (anon key is sufficient — same as intake form pattern) |
| Input | `{ donation_id: uuid }` |
| Behavior | Loads donation + submission data, sends receipt email via Resend |
| Secrets needed | `RESEND_API_KEY`, `EMAIL_FROM` (already in Vault from rejection email) |

**Receipt email spec:**

| Field | Content |
|-------|---------|
| To | `donor_email` |
| Subject | `Thank you for supporting [Community Name]` |
| Body | Donor name, amount, method, transaction reference (if provided), community name, date |
| Disclaimer | "This is not a tax receipt. Retain your payment provider confirmation for tax purposes." |
| Footer | Link to community page |

---

## Phase 2 — Recognition Wall Display

After Phase 1 is live and at least one donation record exists, the Community Page card gains a **Recognition Wall** section.

### Display Rules

- Only show donors where `display_on_wall = true` and `is_visible = true`
- Show `display_name`, `wall_message` (if present), and formatted donation date
- **Do not show `amount`** on the public wall — amounts are private by default at launch
- Show a running **donor count** (not total amount) publicly
- Admin can toggle `is_visible` and `featured` per donor in the admin panel

### Admin Actions (Phase 2 additions)

| Action | Where |
|--------|-------|
| View all donations per community | Admin panel — new "Donations" section per submission card |
| Toggle `is_visible` on recognition wall entries | Admin panel |
| Mark a donor as `featured` | Admin panel |
| View receipt sent status | Admin panel — `receipt_sent_at` column |

---

## Phase 3 — Processor Verification (Future)

Not scoped for current build. When implemented:

- PayPal IPN or Stripe webhook writes directly to `public.donations` with `status = 'verified'`
- `transaction_reference` and `paypal_txn_id` columns are used for deduplication
- Self-reported records with matching references can be auto-promoted to `verified`
- Requires Supabase Edge Function as webhook receiver

---

## RLS Considerations

| Table | Anon Read | Anon Insert | Auth Read | Auth Update |
|-------|-----------|-------------|-----------|-------------|
| `public.donations` | NO | YES (own insert only) | YES | NO (admin only via service role) |
| `public.recognition_wall` | YES (is_visible = true only) | NO | YES | NO (admin only via service role) |

`recognition_wall` rows are created server-side by the Edge Function after a successful donation insert — not directly by the client.

---

## Open Questions

- [ ] Should donation amounts ever be visible on the public recognition wall (opt-in by donor)?
- [ ] Should communities be notified when they receive a donation? ("New donation received" email to community contact)
- [ ] Should there be a minimum donation amount to prevent spam entries?
- [ ] Should the recognition wall be per-community or a single global wall across all communities?
