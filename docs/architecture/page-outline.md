# Front-Facing Page Architecture Outline

## Pages

| Page | Route | Audience | Trigger |
|------|-------|----------|---------|
| Intake | `/submit` | Public User | Always available |
| Administration | `/admin` | Authorized Admin only | Manual navigation |
| Community Page | `/community/:id` | Public | Created on admin approval |

---

## Data Flow

1. **User** fills out and submits the intake form → entry written to `ledger` schema with status `pending`; email address captured
2. **Administrator** reviews pending entries on the admin page → approves or rejects
3. **Approval** triggers automatic Community Page generation at a unique route
4. **Rejection** requires the administrator to:
   - Select at least one correction reason from the managed checklist (checkboxes)
   - Optionally add free-text notes
   - An automated email is then sent to the User with the selected reasons, notes, and a resubmit invitation

---

## Admin Page Sections

| Section | Purpose |
|---------|---------|
| Pending Submissions | Review and action incoming submissions |
| Rejection Reasons Panel | Checkboxes populated from `correction_reasons` table; at least one required to reject |
| Free-Text Notes | Optional additional context from the administrator |
| Correction Reasons Manager | Add, edit, or deactivate checklist items — changes reflect immediately in the rejection panel |

---

## Correction Reasons Table (`ledger.correction_reasons`)

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

## Rejection Email Spec

| Field | Content |
|-------|---------|
| To | User's submitted email address |
| Subject | `Your submission needs a few updates` |
| Body | Selected correction reasons (label + description) + optional admin notes |
| CTA | Link back to `/submit` with resubmit invitation |

---

## Design Constraints

- The intake form must capture **all** data needed for page production — no partial submissions
- The intake form must capture the User's **email address** for rejection notification
- Community Pages are **data-driven** — no manual content authoring by administrators
- The admin page must be **access-controlled** (authentication + role check)
- **At least one correction reason must be selected** before a rejection can be submitted
- Correction reasons can be **deactivated** (not deleted) to preserve historical audit integrity
- Each Community Page is **individually addressable** by a unique ID or slug derived from the submission

---

## Status Values

| Status | Description |
|--------|-------------|
| `pending` | Submitted, awaiting admin review |
| `approved` | Verified and published as a Community Page |
| `rejected` | Reviewed and declined — rejection email sent to User |
