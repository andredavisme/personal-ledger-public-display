# Community Ledger — Tutorial Series

This folder contains the complete tutorial series for building your own Community Ledger web application from scratch.

---

## Who This Is For

This tutorial is written for someone who has never written a line of code. You do not need a computer science background. You do not need to be good at math. You do not need any prior experience with websites, programming, or technology beyond basic computer use.

What you do need is curiosity, patience, and a willingness to try things you have never tried before.

---

## What You Will Build

By the end of this series, you will have built a real, working web application that your community can use. It will:

- Accept financial and mission submissions from community organizations
- Display public community pages for approved organizations
- Give an administrator the ability to review, approve, or reject submissions
- Protect sensitive administration functions behind a secure login
- Store all data safely in a database
- Keep a searchable, queryable index of all project documentation in the database
- Allow donors to self-report donations and receive an automated receipt

This is not a toy or an exercise. It is a real application, and the one you build will belong to you and your community.

---

## How This Tutorial Is Structured

Each section has three parts.

**Part 1 — Concept**
A plain-language explanation of the idea behind what you are about to do. It introduces vocabulary and *why* before *how*. Read it once with curiosity, not to memorize it.

**Part 2 — Concept Check**
A set of open-ended questions at the end of the theory. There is no answer key. Write your responses in your own words. The research on learning is clear: people who explain things in their own words retain them. People who skip this step often discover later that they only recognized the material — they did not understand it. Recognition and understanding feel the same in the moment. They are not the same.

**Part 3 — Milestone**
Numbered steps to complete. Each step is specific and verifiable — you will know when you have done it correctly because something visible will have changed. Most milestones ask you to record your work in a file called `my-notes.md` in your repository. This file is yours — no one reads it but you. It is a thinking document, not a submission.

At the end of every milestone there is a **Milestone Concept Check** — three questions tied directly to what you just did, not to the theory. These questions are worth your time. Skip them at the cost of your own understanding.

> **One file you will use throughout:** `my-notes.md`. Create it in Milestone 0 and add to it in every section that follows. Keep it in your GitHub repository. It is the running record of your own thinking — a habit that will serve you long after this tutorial ends.

---

## Tutorial Sections

| # | File | Topic | Milestone |
|---|------|-------|----------|
| 0 | [00-what-this-does.md](00-what-this-does.md) | Plain-language overview — collect → store → show, the three money buckets, how the public page works | Create `my-notes.md`; write the flow in your own words |
| 1 | [01-introduction.md](01-introduction.md) | What we are building, why it matters, and what AI is and is not | Write your community into existence in `my-notes.md` |
| 2 | [02-your-tools.md](02-your-tools.md) | Setting up GitHub, Cloudflare Pages, and Supabase | Verify all 3 accounts, record keys in `project-reference.md` |
| 2b | [02b-cors-and-browser-security.md](02b-cors-and-browser-security.md) | CORS and browser security — why the browser blocks certain requests and how to handle it | Document your origins and CORS template in `my-notes.md` |
| 3 | [03-thinking-with-ai.md](03-thinking-with-ai.md) | Communicating precisely with AI; why sequencing matters | Write one vague and one precise instruction for your project |
| 4 | [04-your-first-file.md](04-your-first-file.md) | Creating your first HTML file and going live | Type `index.html` by hand, upload, verify live at `.pages.dev` |
| 5 | [05-admin-and-notifications.md](05-admin-and-notifications.md) | Protecting the admin page with Supabase Auth; sending rejection emails | Create admin user, set redirect URL, verify login wall |
| 6 | [06-adjusting-fire.md](06-adjusting-fire.md) | Changing course mid-build — the case study and the habit | Write your constraints and a failure-response plan |
| 7 | [07-documentation-as-infrastructure.md](07-documentation-as-infrastructure.md) | Building a living, queryable documentation catalog from the first session | Create the table, seed two records, verify with SELECT |
| 8 | [08-debugging-role-naming-drift.md](08-debugging-role-naming-drift.md) | How a naming inconsistency silently blocked a feature — and the diagnostic method | Decide your role names and write the CHECK constraint before any policy |

---

## A Note on `my-notes.md`

Every milestone in this tutorial asks you to write something in `my-notes.md`. This file lives in your GitHub repository and belongs entirely to you.

It is not a homework submission. It is not graded. It is a running record of your own thinking — written in your own words, in real time, as you work through the build.

The purpose is not to document the tutorial. The tutorial is already documented. The purpose is to document *your version of the project* — your community, your constraints, your decisions, your questions, your surprises. That record will be more useful to you than any tutorial section when something breaks at 10pm and you need to remember why you made a decision three weeks ago.

---

## A Note on the Documentation Catalog

One of the most important things you will set up is a `documentation_catalog` table in your Supabase database (Section 7). Every document you create — including each tutorial section as you read it — gets a record in that table. Every architecture decision, every session handoff, every reference doc — all indexed, all queryable.

The catalog insert is the last step every time you create a new file. Not after a session ends. Not this weekend. When you create the file.

This is infrastructure, not bookkeeping.

---

## A Note on Pacing

Go as slowly as you need to. Every section is written to be read once, tried once, and then read again if something did not work. Nothing here requires memorization. Everything you need is written down.

If a step produces an error, that is not a failure — it is information. The sections on debugging (especially Section 8) will help you build the habit of reading errors as clues, not verdicts.
