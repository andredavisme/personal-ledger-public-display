# Intake Form — Field Specification

## Page Messaging Strategy

The intake page uses three tiers of messaging to guide the User:

| Tier | Label | Purpose |
|------|-------|---------|
| 1 | **Required** | Submission cannot be processed without this |
| 2 | **Recommended** | Not required, but directly improves the quality and completeness of your Community Page |
| 3 | **Optional** | Adds value and depth; include what you can |

Each section on the intake page includes:
- A **section header** explaining what the section is for
- A **why it matters** blurb explaining how the data is used on the Community Page
- Inline **field-level labels** marking Required / Recommended / Optional
- A **section tip** for CSV uploads explaining what good data looks like

---

## Section 1 — Identity & Contact

**Page messaging:**
> "Tell us who you are and how to reach you. This information identifies your Community Page and is how we contact you if your submission needs updates."

| Field | Type | Status | Messaging |
|-------|------|--------|-----------|
| Full Name | text | **Required** | Used to identify the submission internally |
| Email Address | email | **Required** | Used for submission confirmation and rejection notifications |
| Community / Organization Name | text | **Required** | Displayed as the title of your Community Page |
| Location | text | **Required** | City, State or region — displayed on your Community Page |

---

## Section 2 — Community Objectives

**Page messaging:**
> "Help the community understand who you are and what you stand for. These statements form the heart of your Community Page — the more thoughtful and complete, the stronger your page will be."

| Field | Type | Status | Messaging |
|-------|------|--------|-----------|
| Mission Statement | textarea | **Required** | Describe what your community does and who it serves |
| Core Values | textarea | **Required** | What principles guide your community's existence? |
| Local Vision | textarea | **Required** | What do you aim to achieve in your local area? |
| Universal Vision | textarea | **Recommended** | What broader or global impact does your community aspire to? A strong universal vision adds credibility and inspires wider support. |

---

## Section 3 — Financial Statements

**Page messaging:**
> "Financial transparency is central to this platform. Upload your financial statements using our CSV template so your Community Page can display a clear picture of your income and expenses. Complete and accurate financials build trust with your community."

**Why it matters blurb:**
> "Incomplete financials are one of the most common reasons submissions are not approved. Even estimates are acceptable — clarity and honesty matter more than perfection."

| Upload | Status | Messaging |
|--------|--------|-----------|
| Financial Statements CSV | **Required** | Must include at least one income row and one expense row |

**Section tip:**
> "Download the template below. Use the `section` column to mark each row as `income` or `expense`. The `notes` column is optional but recommended for context."

### Template: `financial-statements-template.csv`
```
section,name,amount,notes
income,Grant - Local Arts Council,1500.00,Annual grant
income,Community Fundraiser,320.00,Spring 2026
expense,Venue Rental,200.00,Monthly
expense,Supplies,85.50,
```

---

## Section 4 — Budget

**Page messaging:**
> "Your budget shows your community how resources are being planned and managed. Purchased items show accountability. Expected items show planning. Desired items show ambition and invite support."

**Why it matters blurb:**
> "Including desired items is optional, but communities that share their wish list often attract more targeted donations and in-kind contributions."

| Upload | Status | Messaging |
|--------|--------|-----------|
| Budget CSV | **Required** | Must include at least one purchased or expected item and a contingency row |

**Section tip:**
> "Use `purchased`, `expected`, `desired`, or `contingency` in the `status` column. Actual cost is only needed for purchased items — leave it blank for others."

### Template: `budget-template.csv`
```
status,item,estimated_cost,actual_cost,notes
purchased,Folding Tables x6,180.00,175.00,
expected,Sound System Rental,250.00,,Q3 event
desired,Projector,400.00,,Nice to have
contingency,Unexpected Reserve,300.00,,
```

---

## Section 5 — Donation & Payment

**Page messaging:**
> "Let your community know how to support you financially. This information is displayed publicly on your Community Page. Include every method you actively accept — more options means more accessibility for your supporters."

**Why it matters blurb:**
> "Submissions without at least one active donation method cannot be approved — there must be a way for your community to contribute. Including a transparency statement about how donations are used significantly increases donor confidence."

| Upload | Status | Messaging |
|--------|--------|-----------|
| Donation & Payment CSV | **Required** | Must include at least one active donation method and its handle or address |

**Section tip:**
> "Use one row per method. Accepted methods: `PayPal`, `Stripe`, `Postal`, `POS`, `Manual`, `Cryptocurrency`. The `notes` column is optional but useful for donor instructions."

### Template: `donation-payment-template.csv`
```
method,handle_or_address,notes
PayPal,community@example.com,
Stripe,https://donate.stripe.com/xyz,
Postal,207 Main St Portland ME 04101,Checks payable to Community Name
```

| Field | Type | Status | Messaging |
|-------|------|--------|-----------|
| Donation Transparency Statement | textarea | **Required** | How will donations be publicly reported? |
| Application Transparency Statement | textarea | **Recommended** | How will the use of donated funds be tracked and reported? Strong transparency statements build long-term donor trust. |

---

## Validation Rules (on upload)

| Rule | Behavior |
|------|----------|
| Required column headers must be present | Upload rejected with inline error message listing missing columns |
| At least one valid data row required | Upload rejected if file contains headers only |
| `amount` / `estimated_cost` / `actual_cost` must be numeric | Row flagged with inline warning; submission still allowed |
| Unknown `section` or `status` values | Row flagged with inline warning; submission still allowed |
| File must be `.csv` | Non-CSV files rejected at upload |

---

## Page-Level Messaging Summary

Displayed at the top of the intake page before any fields:

> **Before you begin:**
> Fields marked **Required** must be completed for your submission to be reviewed.
> Fields marked **Recommended** are not required but directly strengthen your Community Page and improve your chances of approval.
> Fields marked **Optional** add depth and value — include what you can.
>
> All submitted information that is approved will be displayed publicly on your Community Page. Please ensure accuracy.
