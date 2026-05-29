# Architecture — Correction Reasons
**Last Updated:** May 29, 2026
**Status:** Current

> This document defines the `correction_reasons` table and its role in the admin rejection workflow. The table lives in the `public` schema. References to `ledger.correction_reasons` in older documents are outdated — the correct schema is `public`.

---

## Overview

The `correction_reasons` table powers the rejection checklist on the admin page. Administrators can manage this list directly from the admin UI without developer intervention.

---

## Behavior

- Only `active = true` records appear as checkboxes in the rejection panel
- Deactivating a reason hides it from future rejections but preserves it on historical records
- `sort_order` controls the display sequence — lower numbers appear first
- The `description` field is what gets included in the rejection email body, not just the label

---

## Admin Capabilities

| Action | Effect |
|--------|---------|
| Add reason | New checkbox immediately available in rejection panel |
| Edit label/description | Updates future rejections and email content |
| Deactivate | Hides from checklist; historical rejections unaffected |
| Reorder | Adjusts `sort_order`; updates checklist display immediately |

---

## Table Definition

This table lives in `public.correction_reasons`. The `ledger` schema reference that appears in `page-outline.md` is a legacy artifact from an earlier schema design — the project uses the `public` schema throughout.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `label` | text | Short checkbox label shown in admin UI |
| `description` | text | Full explanation included in rejection email |
| `active` | boolean | Controls visibility in the checklist (deactivate without deleting) |
| `sort_order` | integer | Controls display order in the checklist |
| `created_at` | timestamptz | Record creation timestamp |
| `updated_at` | timestamptz | Last edit timestamp |

---

## Seed Examples

| Label | Description |
|-------|-------------|
| Missing contact information | A valid email or phone number is required so the community can reach you if needed. |
| Incomplete financial details | All income and expense fields must be filled to generate an accurate community page. |
| Missing donation preference | A preferred donation method is required to display payment options on your community page. |
| Unclear community objectives | A description of your community’s mission and values is required for page publication. |
| Unverifiable submission data | One or more submitted values could not be verified. Please review and resubmit with accurate information. |

---

## Related Files
- `docs/architecture/page-outline.md` — references this table (schema label being corrected separately)
- `docs/architecture/intake-form.md` — defines the fields that trigger correction reasons
