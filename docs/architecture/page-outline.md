# Front-Facing Page Architecture Outline

## Pages

| Page | Route | Audience | Trigger |
|------|-------|----------|---------|
| Intake | `/submit` | Public User | Always available |
| Administration | `/admin` | Authorized Admin only | Manual navigation |
| Community Page | `/community/:id` | Public | Created on admin approval |

---

## Data Flow

1. **User** fills out and submits the intake form → entry written to `ledger` schema with status `pending`
2. **Administrator** reviews pending entries on the admin page → approves or rejects
3. **Approval** triggers automatic Community Page generation at a unique route
4. **Rejection** archives the submission — no page produced

---

## Design Constraints

- The intake form must capture **all** data needed for page production — no partial submissions
- Community Pages are **data-driven** — no manual content authoring by administrators
- The admin page must be **access-controlled** (authentication + role check)
- Each Community Page is **individually addressable** by a unique ID or slug derived from the submission

---

## Status Values

| Status | Description |
|--------|-------------|
| `pending` | Submitted, awaiting admin review |
| `approved` | Verified and published as a Community Page |
| `rejected` | Reviewed and declined, archived |
