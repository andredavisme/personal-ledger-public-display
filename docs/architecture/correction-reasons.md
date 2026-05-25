# Correction Reasons — Managed Checklist

## Overview

The `correction_reasons` table powers the rejection checklist on the admin page. Administrators can manage this list directly from the admin UI without developer intervention.

## Behavior

- Only `active = true` records appear as checkboxes in the rejection panel
- Deactivating a reason hides it from future rejections but preserves it on historical records
- `sort_order` controls the display sequence — lower numbers appear first
- The `description` field is what gets included in the rejection email body, not just the label

## Admin Capabilities

| Action | Effect |
|--------|---------|
| Add reason | New checkbox immediately available in rejection panel |
| Edit label/description | Updates future rejections and email content |
| Deactivate | Hides from checklist; historical rejections unaffected |
| Reorder | Adjusts `sort_order`; updates checklist display immediately |

## Seed Examples

| Label | Description |
|-------|-------------|
| Missing contact information | A valid email or phone number is required so the community can reach you if needed. |
| Incomplete financial details | All income and expense fields must be filled to generate an accurate community page. |
| Missing donation preference | A preferred donation method is required to display payment options on your community page. |
| Unclear community objectives | A description of your community’s mission and values is required for page publication. |
| Unverifiable submission data | One or more submitted values could not be verified. Please review and resubmit with accurate information. |
