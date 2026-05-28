# Architecture — Transparency Page
**Last Updated:** May 28, 2026

> This document defines the full architecture for `transparency.html` — the public-facing page that shows how donations flow from intent to applied impact across all communities.

---

## Purpose

The transparency page answers the question every potential donor has:

> *"Where does the money actually go?"*

It renders a four-stage pipeline that traces every donation from initial intent through confirmed receipt and documented application. It is fully public — no auth required — and updates in real time from the database.

---

## Four-Stage Pipeline

Each donation moves through four stages. The transparency page makes every stage visible.

| Stage | Label | Source | Description |
|---|---|---|---|
| 1 | **Request** | `public.submissions` | A community submitted a request for support — the need is documented |
| 2 | **Intention** | `public.donations` (`status = self_reported`) | A donor indicated intent to give — amount and method recorded |
| 3 | **Received** | `public.donations` (`status = verified`) + `public.community_financials` (type = receipt) | Community confirmed receipt and uploaded documentation — admin reviewed and promoted to verified |
| 4 | **Applied** | `public.community_financials` (type = expense, status = approved) | Community documented how the funds were used — admin reviewed and approved |

---

## Page Layout

### Top Section — Global Aggregation
Displays aggregate totals across **all communities**:

- Total donations intended (sum of `self_reported` + `verified` amounts)
- Total donations confirmed received (sum of `verified` amounts)
- Total applied / spent (sum of approved expense records)
- Count of communities with at least one donation
- Count of communities with zero donations (still visible — transparency includes inactivity)

### Bottom Section — Community Comparison View
Allows a visitor to filter and compare **up to 3 communities side by side**:

- Community selector (dropdown or search)
- Per-community pipeline card showing all four stages
- Zero-donation communities appear in the global section but are filterable here
- Comparison is client-side filtered — no additional DB calls after initial load

---

## Stage 3 Confirmation Path

Stage 3 ("Received") is **community-confirmed**, not automatically verified:

1. Community rep receives donation
2. Community rep logs into the **Community Finance Portal** (magic link)
3. Rep submits a receipt confirmation form with optional document upload
4. Record is created in `public.community_financials` with `status = self_reported`
5. Admin reviews submission in the **Admin Finance Verification panel**
6. Admin promotes the record to `status = verified`
7. `transparency.html` reflects the verified receipt in Stage 3

> PayPal automatic transaction verification is **out of scope** — requires transaction-level API access not worth taking on for this project phase.

---

## Stage 4 Application Path

1. Community rep submits an expense record via the **Community Finance Portal**
2. Record is created in `public.community_financials` with `type = expense`, `status = pending`
3. Admin reviews and approves in the **Admin Finance Verification panel**
4. Record promoted to `status = approved`
5. `transparency.html` reflects the applied funds in Stage 4

---

## Data Sources

| Data Needed | Source |
|---|---|
| All communities | `public.submissions` WHERE `status = approved` |
| Donation intentions | `public.donations` (all rows — staged by `status`) |
| Receipts and expenses | `public.community_financials` |
| Stage labels and amounts | Derived by joining `donations` → `submissions` and `community_financials` → `submissions` |

---

## Rendering Approach

- **Static HTML** — `transparency.html` in repo root
- **Vanilla JS** — new `assets/js/transparency.js` module
- **No auth required** — anon Supabase reads only; RLS must allow anon SELECT on relevant tables
- **Single page load** — load all data on `DOMContentLoaded`, compute aggregates client-side, render both sections
- **No live subscription** — refresh-on-load is sufficient for this use case

---

## RLS Requirements

| Table | Required Policy |
|---|---|
| `public.submissions` | Anon read — `status = approved` rows only (already exists) |
| `public.donations` | Anon read — `is_visible = true` rows only (verify before build) |
| `public.community_financials` | Anon read — `status = approved` or `status = verified` rows only (create at migration time) |

---

## Open Questions — Resolved

| Question | Resolution |
|---|---|
| Should Stage 3 use PayPal auto-verification? | No — community-confirmed via portal upload + admin review |
| Should zero-donation communities appear? | Yes in global section; filterable in comparison view |
| How many communities in comparison view? | Up to 3 simultaneously |
| Is this page auth-gated? | No — fully public |

---

## Build Order

1. `public.community_financials` table migration (prerequisite for Stages 3 and 4)
2. Community Finance Portal (enables community reps to submit receipt and expense records)
3. Admin Finance Verification panel (enables admin to review and promote records)
4. `transparency.html` + `transparency.js` (consumes all of the above)
