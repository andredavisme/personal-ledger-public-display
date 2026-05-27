# Donation Capture — Architecture Spec
**Created:** May 26, 2026
**Last Updated:** May 27, 2026
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
| 1 | Self-reported donation form + DB capture + receipt email | **Complete** |
| 2 | Recognition wall display on Community Page | **Build next** |
| 3 | PayPal / Stripe webhook verification | Future — requires processor integration |

---

## Phase 1 — Self-Reported Donation Capture

### User Flow

1. Visitor views an approved Community Page
2. Visitor clicks **"I Intend to Donate"** button on a donation method card
3. A modal opens with a short self-report form
4. Visitor submits the form
5. Record is written to `public.donations`
6. Edge Function fires → receipt email sent to donor (if email provided)
7. Modal closes with confirmation message and payment button

---

### Donation Form Fields

| Field | Type | Status | Notes |
|-------|------|--------|-------|
| Donor Name | text | **Optional** | Displayed on recognition wall if donor consents; defaults to "Anonymous" |
| Donor Email | email | **Optional** | Required only to receive a receipt; never displayed publicly |
| Amount | number | **Required** | Stated donation amount in USD; soft minimum of $15.00 suggested in UI |
| Method | select | **Required** | Pre-populated from the community's `submission_donations` methods |
| Transaction Reference | text | **Optional** | PayPal transaction ID, check number, or other reference the donor has |
| Display on Recognition Wall | checkbox | **Optional** | Defaults to true if name is provided; false if anonymous |
| Amount Visible on Wall | checkbox | **Optional** | Opt-in — donor chooses whether their stated amount appears publicly |
| Message to Community | textarea | **Optional** | Short public message displayed on recognition wall if visible |

**Disclaimer displayed below the form:**
> "This is a self-reported record of your donation. It is not a tax receipt. Please retain your payment confirmation from your payment provider for tax purposes."

---

### Database — `public.donations` (updated schema)

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
| `amount_visible_on_wall` | boolean | NO | false | Donor opt-in to show amount publicly |
| `wall_message` | text | YES | NULL | Optional public message |
| `receipt_sent_at` | timestamptz | YES | NULL | NULL if no email provided or not yet sent |
| `contributor_id` | uuid | YES | NULL | Reserved for future auth-linked donors |
| `tier` | text | YES | NULL | Reserved for future tiered giving |
| `paypal_txn_id` | text | YES | NULL | Legacy column — superseded by transaction_reference; retained for compatibility |
| `created_at` | timestamptz | NO | now() | — |

---

### Database — `public.recognition_wall` (updated schema)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `donation_id` | uuid | NO | — | FK → `public.donations.id` |
| `submission_id` | uuid | NO | — | FK → `public.submissions.id` (denormalized for query performance) |
| `display_name` | text | NO | — | "Anonymous" or donor-provided name |
| `wall_message` | text | YES | NULL | Donor's optional public message |
| `amount_visible` | boolean | NO | false | Mirrors `donations.amount_visible_on_wall` — controls public display |
| `tier` | text | YES | NULL | Reserved for future tiered giving |
| `is_visible` | boolean | NO | true | Admin can suppress without deleting |
| `featured` | boolean | NO | false | Admin can feature a donor |
| `sort_order` | integer | NO | 0 | Admin-controlled display order |
| `contributor_id` | uuid | YES | NULL | Reserved for future auth-linked donors |
| `created_at` | timestamptz | NO | now() | — |

---

### Edge Function — `send-donation-receipt`

| Property | Value |
|----------|-------|
| Trigger | Called by client after successful `donations` insert, only if `donor_email` is provided |
| Auth | JWT required (anon key is sufficient) |
| Input | `{ donation_id: uuid }` |
| Behavior | Loads donation + submission data, sends receipt email via Gmail SMTP |
| Secrets needed | `GMAIL_USER`, `GMAIL_APP_PASSWORD` (already in Vault) |
| Current version | v3 — deployed and live-tested May 26, 2026 |

---

## Phase 2 — Recognition Wall Display

After Phase 1 is live and at least one donation record exists, the Community Page gains a **Recognition Wall** section.

### Decisions (resolved May 27, 2026)

| Question | Decision |
|----------|----------|
| Donation amounts on wall? | **Opt-in by donor** — `amount_visible_on_wall` checkbox on donation form; hidden by default |
| Community notifications? | **Bi-monthly digest** — email sent to community contact on the 1st and 15th of each month |
| Minimum donation amount? | **Soft minimum of $15.00** — suggested in UI, not enforced at DB level |
| Wall scope & ordering? | **Single global wall** — all communities, ordered by activity ascending (lowest activity surfaces first) |

---

### Display Rules

- Only show donors where `display_on_wall = true` and `is_visible = true`
- Show `display_name`, `wall_message` (if present), and formatted donation date
- Show `amount` only if `amount_visible_on_wall = true` (donor opt-in)
- Show a running **donor count** per community
- Global wall ordered by **community donation activity ascending** — least active communities appear at the top
- Admin can toggle `is_visible` and `featured` per donor in the admin panel

### Soft Minimum UI Behavior

- Amount field displays helper text: *"Suggested minimum: $15.00"*
- No form-level validation block — donor may submit any amount
- Admin can see all submissions regardless of amount

### Bi-Monthly Digest — Community Notification

- Triggered on the **1st and 15th of each month**
- Sent to the community contact email on file in their `submissions` record
- Content: donor count since last digest, total stated amount received, new wall messages
- Implementation: scheduled Edge Function or cron job (to be scoped in Phase 2 build)

### Admin Actions (Phase 2 additions)

| Action | Where |
|--------|-------|
| View all donations per community | Admin panel — new "Donations" section per submission card |
| Toggle `is_visible` on recognition wall entries | Admin panel |
| Mark a donor as `featured` | Admin panel |
| View receipt sent status | Admin panel — `receipt_sent_at` column |
| Manually re-trigger receipt for NULL `receipt_sent_at` | Admin panel — retry UI (open item) |

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

*All Phase 2 questions resolved May 27, 2026. No open questions remaining.*
