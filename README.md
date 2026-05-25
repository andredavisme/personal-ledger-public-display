# Personal Ledger — Public Display

Public-facing community financial ledger — transparent income, expenses, budget, and donation tracking.

---

## Application Architecture

This application is built around three front-facing surfaces:

---

### 1. Intake Page (`/submit`)
Accepts information submissions from the public User.

**Purpose:** Collect all data required to produce a Community Page upon approval.

**Responsibilities:**
- Present a structured intake form to the User
- Collect all fields necessary to generate a complete Community Page (no follow-up data collection needed)
- Collect the User's **email address** for notification purposes
- Submit the entry to the database with a `pending` status
- Confirm receipt to the User upon submission

**Key Principle:** A submission must be self-contained — every field needed to produce a published Community Page is captured at intake.

---

### 2. Administration Page (`/admin`)
Internal page for reviewing and actioning pending submissions.

**Purpose:** Allow an authorized administrator to verify submitted information and approve or reject it for publication.

**Responsibilities:**
- Display all submissions in `pending` status
- Allow the administrator to review full submission details
- Approve a submission → triggers Community Page creation
- Reject a submission → archives the entry and triggers a rejection email to the User
- When rejecting, the administrator:
  - Selects applicable **correction reasons** from a managed checklist
  - May add a free-text note for additional context
  - Must select at least one checkbox before rejection can be submitted
- Includes a **Correction Reasons Manager** section to add, edit, or deactivate checklist items
- Access is restricted to authorized administrators only

**Key Principle:** Approval is the sole trigger for Community Page production. Rejection is the sole trigger for a rejection notification email.

---

### 3. Community Page (`/community/:id`)
A dedicated public page generated per approved submission.

**Purpose:** Display the verified, approved information from a single submission as a formatted public-facing page.

**Responsibilities:**
- Render all data fields from the approved submission
- Each approved submission produces exactly one unique Community Page
- Pages are publicly accessible and individually addressable by ID or slug
- Content is drawn entirely from the submission — no manual page authoring required

**Key Principle:** The Community Page is a direct output of an approved submission — data in equals page out.

---

## Rejection Email

When an administrator rejects a submission, an automated email is sent to the User's submitted email address.

**Email must include:**
- The selected correction reasons (from the managed checklist)
- Any additional free-text notes from the administrator
- Why each item matters to the submission and community page
- An invitation to resubmit with the corrected information

**Purpose:** Ensure the User understands exactly what is needed, reducing incomplete resubmissions and maintaining submission quality.

---

## Page Flow

```
User → Intake Page (/submit)
         ↓ [submission stored as pending, email captured]
Administrator → Admin Page (/admin)
         ↓ [approve or reject]
         ↓ [if reject: select correction reasons (checkboxes) + optional notes]
Approved → Community Page (/community/:id) [published]
Rejected → Archived + Rejection Email → User
             (selected reasons + notes + resubmit invite)

Administrator → Admin Page → Correction Reasons Manager
         ↓ [add / edit / deactivate checklist items]
```

---

## Repository Structure

> _To be expanded as development progresses._

---

## Related
- Private repo: `personal-ledger-private` (sensitive docs, credentials, vault references)
- Supabase schema: `ledger`
