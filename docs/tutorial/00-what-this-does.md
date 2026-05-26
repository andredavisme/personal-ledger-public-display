# Section 0 — What This Project Does

## A Plain-Language Overview Before You Write Any Code

---

## The One-Sentence Version

This application gives a community a **public checkbook** — a place where anyone can see where money comes from, where it goes, what it will be spent on, and how to contribute.

---

## The Three Things It Does

Before diving into how to build it, it helps to understand what it actually does. The application does three things, in order:

1. **Collects** information from a community (called a *submission*)
2. **Stores** that information in organized buckets
3. **Shows** a public page so donors can see the community's story and numbers

That's the whole loop: collect → store → show.

---

## The Submission: One Form, One Community

Every community starts by filling out a single form. That form becomes a **submission** — the community's profile card inside the application.

A submission captures everything the app needs to build a public page. Nothing has to be gathered twice. The form collects:

**Who is asking**
- Contact name and email address

**Who they are**
- Community name and location

**Why they exist**
- Mission statement
- Core values

**What they hope to do**
- Local vision (what they want to change nearby)
- Universal vision (what they want to contribute to the wider world)

**How they will stay honest about money**
- A plain-language description of how donations will be tracked and reported publicly

**How they prefer to receive donations**
- PayPal, Stripe, mailing address, in-person, cash, cryptocurrency — or any combination

Once submitted, an administrator reviews it and marks it as one of three statuses:

| Status | Meaning |
|--------|---------|
| **Pending** | Just came in — not yet reviewed |
| **Approved** | Ready to appear on the public page |
| **Rejected** | Incomplete or needs corrections — a notification email is sent |

---

## The Three Money Buckets

To make the public view useful and honest, financial information is broken into three simple lists.

### Bucket 1 — Financial History (Past Income and Expenses)

This answers: *“What money has the community already received or spent?”*

Each line is a simple record, such as:
- `Income — grant from XYZ Foundation — $5,000`
- `Expense — monthly rent — $800/month`

These lines come from uploaded financial statements, but the app displays them as a readable list. Donors can see how money has moved in and out over time.

### Bucket 2 — Budget Needs (What the Money Will Be Spent On)

This answers: *“What exactly will my donation help pay for?”*

Each item is tagged with one of four categories:

| Tag | Meaning |
|-----|---------|
| **Purchased** | Already bought |
| **Expected** | Planned purchase coming soon |
| **Desired** | Wish-list item — would be wonderful to have |
| **Contingency** | Safety buffer for surprises and emergencies |

Examples:
- `Chromebooks for students — Expected — $2,400`
- `Emergency repair fund — Contingency — $1,000`

The public page groups these items so donors can see a clear breakdown before giving.

### Bucket 3 — Donation Methods (How to Give)

This answers: *“How do I actually send money?”*

Each method is one record — a link, an address, or a set of instructions. Supported methods include:

- PayPal link
- Stripe checkout link
- Postal mailing address
- Point-of-sale / in-person instructions
- Manual / cash instructions
- Cryptocurrency address

The public page renders each method as a button or a clear instruction block.

---

## Admin Tools: Keeping It Honest

Behind the scenes, two tools help administrators stay organized and accountable.

**Correction reasons list**
A managed checklist of reasons a submission might need changes before approval — for example:
- “Missing financial statements”
- “Budget totals don’t add up”
- “Donation method details incomplete”

Administrators pick from this list when rejecting a submission, so the feedback is specific and consistent.

**Action log**
Every admin decision is recorded:
- Who reviewed it
- Whether they approved or rejected it
- Which correction reasons they selected
- When the decision was made

This log means the application can always explain why a community is — or is not — visible on the public page.

---

## What the Public Page Shows

The public ledger page only shows **approved** communities. For each one, a donor sees:

1. **The story** — mission, values, local vision, universal vision, and transparency statement
2. **Financial history** — a simple income vs. expenses breakdown
3. **Budget needs** — items grouped by Purchased / Expected / Desired / Contingency
4. **Donation methods** — buttons or instructions for every accepted payment type
5. **Recognition wall** — donors who have self-reported their contribution (with their consent)

A donor moving through the page is answering five questions in order:

> *“Who is this?”*
> *“What do they believe in?”*
> *“What have they done with money before, and what will they do with mine?”*
> *“How do I send it?”*
> *“Who else has contributed?”*

---

## The Fourth Thing: Documentation as Infrastructure

There is a fourth thing this project does that most applications do not: it **documents itself** in the same database that runs it.

Every architecture decision, every tutorial section, every session summary is stored as a record in a `documentation_catalog` table. You can query it the same way you query financial data.

This is not an optional feature. It is how the project stays understandable as it grows, and how a new contributor — or a returning one who has been away for a month — can orient themselves in minutes instead of hours.

Section 7 covers how to build this catalog and how to use it.

---

## The Full Flow, in One Picture

```
Community fills out form
        ↓
Submission stored as "Pending"
        ↓
Administrator reviews submission
        ↓
   ┌────┴────┐
Approve    Reject
   ↓           ↓
Public      Email sent with
page        correction reasons
goes live   + invite to resubmit
   ↓
Donor views community page
        ↓
Donor clicks "I Donated"
        ↓
Donation recorded + receipt emailed
```

---

## Before You Move On

You don’t need to memorize any of this. The sections that follow will build each piece one at a time — form, database, admin page, public page — and you’ll understand each one in context as you go.

This overview exists so that when you’re deep in the details of a single file or a single database table, you can always ask: *“Where does this fit in the collect → store → show loop?”* The answer will be there.

---

## ✅ Concept Check — Section 0

*Write your responses in your own words. A sentence or two is enough.*

**1.** Describe the collect → store → show flow to someone who has never heard of this project. What happens at each step?

**2.** Why do you think financial information is broken into three separate buckets (history, budget, and donation methods) instead of one big list?

**3.** Think about the action log that records every admin decision. Why might that matter to the communities using this application — not just the administrator?

**4.** Pick one of the donation methods (PayPal, Stripe, postal mail, in-person, cash, cryptocurrency). Who in your community might prefer that method, and why?

**5.** The project stores its documentation in the same database as its data. What advantage does that give you compared to keeping documentation only in files?
