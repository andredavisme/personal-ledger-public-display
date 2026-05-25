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
4. **Rejection** requires the administrator to document:
   - Which fields were missing or insufficient
   - Why each missing item matters to the submission
   - An automated email is then sent to the User with that explanation and a resubmit invitation

---

## Rejection Email Spec

| Field | Content |
|-------|---------|
| To | User's submitted email address |
| Subject | `Your submission needs a few updates` |
| Body | List of missing/incomplete fields with explanation of why each matters |
| CTA | Link back to `/submit` with resubmit invitation |

---

## Design Constraints

- The intake form must capture **all** data needed for page production — no partial submissions
- The intake form must capture the User's **email address** for rejection notification
- Community Pages are **data-driven** — no manual content authoring by administrators
- The admin page must be **access-controlled** (authentication + role check)
- Rejection notes are **required** before a rejection can be submitted — no blank rejections
- Each Community Page is **individually addressable** by a unique ID or slug derived from the submission

---

## Status Values

| Status | Description |
|--------|-------------|
| `pending` | Submitted, awaiting admin review |
| `approved` | Verified and published as a Community Page |
| `rejected` | Reviewed and declined — rejection email sent to User |
