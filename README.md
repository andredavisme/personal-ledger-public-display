# Personal Ledger — Public Display
**Last Updated:** May 29, 2026

A public-facing community financial ledger — transparent income, expenses, budget, and donation tracking. Communities submit their financial information, donors contribute and are recognized publicly, and every dollar is traced from intent to applied impact.

---

## Live
- **Public site:** https://personal-ledger-public-display.pages.dev
- **Admin panel:** https://personal-ledger-public-display.pages.dev/admin.html
- **Full project reference:** `docs/project-reference.md`

---

## Application Architecture

This application is built around five surfaces:

---

### 1. Intake Page (`/submit`)
Accepts information submissions from the public.

**Purpose:** Collect all data required to produce a Community Page upon approval.

**Responsibilities:**
- Present a structured intake form
- Collect identity, community objectives, financial statements, budget, and donation methods via CSV upload
- Collect the submitter’s **email address** for notification
- Submit the entry to `public.submissions` with status `pending`
- Confirm receipt on submission

**Key Principle:** A submission must be self-contained — every field needed to produce a published Community Page is captured at intake.

---

### 2. Administration Page (`/admin`)
Internal page for reviewing and actioning pending submissions.

**Purpose:** Allow an authorized administrator to verify submitted information and approve or reject it for publication.

**Responsibilities:**
- Display all `pending` submissions
- Approve → triggers Community Page creation and assigns a `community_rep` role to the contact email
- Reject → selects correction reasons from managed checklist + optional notes → sends rejection email to submitter
- Includes **Correction Reasons Manager** to add, edit, or deactivate checklist items
- Includes **Donations panel** — view self-reported donations per community, recognition wall controls
- Includes **Finance Verification panel** — review and approve/reject community receipt and expense submissions
- Access restricted to users with `profiles.show_role = 'admin'`

**Key Principle:** Approval is the sole trigger for Community Page production. Rejection is the sole trigger for a rejection notification email.

---

### 3. Community Page (`/community/:id`)
A dedicated public page generated per approved submission.

**Purpose:** Display verified, approved information from a single submission as a formatted public-facing page.

**Responsibilities:**
- Render all approved submission data (identity, objectives, financials, budget, donation methods)
- Display **Recognition Wall** — donors who consented to public display
- Display **Donation Intent button** — opens self-report donation form for visitors
- Each approved submission produces exactly one unique, publicly addressable Community Page

**Key Principle:** The Community Page is a direct output of an approved submission — data in equals page out.

---

### 4. Community Finance Portal (`/portal`)
Magic-link-gated hub for community representatives.

**Purpose:** Give community reps an ongoing interface to document their financial activity after approval.

**Responsibilities:**
- Confirm receipt of donations (links to `public.donations` records)
- Submit expense records documenting how funds were applied
- Post messages to supporters
- All submissions feed `public.community_financials` and surface on the Transparency Page after admin review
- Access scoped to authenticated rep’s `submission_id` via `profiles.show_role = 'community_rep'`

**Key Principle:** The portal is not a one-time form — it is the community’s ongoing accountability interface.

---

### 5. Transparency Page (`/transparency`)
Fully public, no-auth pipeline view across all communities.

**Purpose:** Answer the question every donor has: *“Where does the money actually go?”*

**Responsibilities:**
- Display a four-stage pipeline: **Request → Intention → Received → Applied**
- Aggregate totals across all communities (global section)
- Allow side-by-side comparison of up to 3 communities (comparison section)
- All data drawn from `public.submissions`, `public.donations`, and `public.community_financials`
- No authentication required — anon read only

**Key Principle:** Every stage of the donation lifecycle is visible to anyone, without login.

---

## Full Platform Flow

```
User → Intake Page (/submit)
         ↓ [submission stored as pending]
Admin → Admin Page (/admin)
         ↓ [approve or reject]
         ↓ [reject: correction reasons + notes → rejection email to submitter]
         ↓ [approve: community_rep role assigned, magic link sent]

Approved → Community Page (/community/:id) [published]
         ↓ [visitor clicks “I Intend to Donate”]
Donor → Donation Form (modal)
         ↓ [self-reported donation → public.donations]
         ↓ [if email provided: receipt sent via send-donation-receipt Edge Function]
         → Recognition Wall (if donor consented)

Community Rep → Portal (/portal) [magic link]
         ↓ [submit receipt confirmation or expense record → public.community_financials]
Admin → Finance Verification Panel
         ↓ [approve/verify → status promoted]

Transparency Page (/transparency) [public]
         ← reads submissions + donations + community_financials
         ← displays 4-stage pipeline per community
```

---

## Repository Structure

```
personal-ledger-public-display/
├── index.html                  # Intake form (/submit)
├── admin.html                  # Admin panel (/admin)
├── community.html              # Community page (/community/:id)
├── portal.html                 # Community Finance Portal (/portal)
├── transparency.html           # Transparency pipeline page (/transparency)
├── _redirects                  # Cloudflare Pages routing rules
├── assets/
│   ├── js/
│   │   ├── supabase.js             # Shared Supabase client
│   │   ├── auth.js                 # Auth abstraction layer (Supabase Auth)
│   │   ├── intake.js               # Intake form → Supabase insert
│   │   ├── admin.js                # Admin page logic
│   │   ├── admin-donations.js      # Admin donation pledges panel
│   │   ├── admin-wall.js           # Admin recognition wall controls
│   │   ├── admin-digest.js         # Admin community digest panel
│   │   ├── admin-test-panel.js     # Dev test panel (?dev=true)
│   │   ├── community.js            # Community page renderer
│   │   ├── portal.js               # Community Finance Portal logic
│   │   └── transparency.js         # Transparency page data loader and renderer
│   └── css/
│       ├── portal.css              # Community Finance Portal styles
│       └── [other stylesheets]
├── supabase/
│   └── functions/
│       ├── send-rejection-email/   # Rejection notification Edge Function
│       └── send-donation-receipt/  # Donor receipt Edge Function
└── docs/
    ├── project-reference.md       # Live URLs, Supabase IDs, key tables, open items
    ├── session-handoff.md         # Session-to-session continuity log
    ├── architecture/              # Feature-level architecture specs
    ├── infrastructure/            # Auth, deployment, email infrastructure docs
    └── tutorial/                  # Developer learning path (00–08)
```

---

## Stack

| Layer | Technology |
|---|---|
| Hosting | Cloudflare Pages (free tier) |
| Database | Supabase (PostgreSQL) — project `hhyhulqngdkwsxhymmcd`, schema `public` |
| Auth | Supabase Auth — admin: email+password; community rep: magic link |
| Edge Functions | Supabase Edge Functions (Deno) |
| Email | Gmail SMTP via `denomailer` (Deno library) |
| Frontend | Vanilla HTML / CSS / JavaScript — no framework, no build step |

---

## Related
- **Private repo:** `personal-ledger-private` (sensitive docs, credentials, vault references)
- **Full project reference:** `docs/project-reference.md`
- **Session continuity:** `docs/session-handoff.md`
