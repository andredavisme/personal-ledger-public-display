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

Each section is divided into two parts.

**Part 1 — Theory**
Before you build anything, you will read a plain-language explanation of the concept behind what you are about to do. This section introduces the ideas, the vocabulary, and the *why* — so that when you follow the steps, you understand what each one is actually doing. You do not need to memorize it. You just need to read it with curiosity.

**Part 2 — Milestone**
After the theory, you will be given a set of numbered steps to complete. Each step is specific and verifiable — you will know when you have done it correctly because something visible will have changed. At the end of the milestone, a short **Concept Check** gives you questions tied directly to what you just did. These are not graded. There is no answer key. They are an invitation to put what you just experienced into your own words — which is how understanding actually forms.

> Skipping the Concept Check is like copying someone else's notes instead of taking your own. The understanding lives in the thinking, not the reading.

---

## Tutorial Sections

| # | File | Topic |
|---|------|-------|
| 0 | [00-what-this-does.md](00-what-this-does.md) | Plain-language overview — the collect → store → show flow, the three money buckets, and how the public page works |
| 1 | [01-introduction.md](01-introduction.md) | What we are building, why it matters, and what AI is (and is not) in this process |
| 2 | [02-your-tools.md](02-your-tools.md) | Setting up GitHub, Cloudflare Pages, and Supabase — the three services your application lives in |
| 2b | [02b-cors-and-browser-security.md](02b-cors-and-browser-security.md) | CORS and browser security — why your browser blocks certain requests and how to handle it |
| 3 | [03-thinking-with-ai.md](03-thinking-with-ai.md) | How to communicate precisely with an AI assistant and why sequencing decisions matter |
| 4 | [04-your-first-file.md](04-your-first-file.md) | Creating your first HTML file, understanding what a web page actually is, and going live |
| 5 | [05-admin-and-notifications.md](05-admin-and-notifications.md) | Protecting your admin page with Supabase Auth and sending automated rejection emails |
| 6 | [06-adjusting-fire.md](06-adjusting-fire.md) | A case study in changing course mid-build — and the habits that make it painless |
| 7 | [07-documentation-as-infrastructure.md](07-documentation-as-infrastructure.md) | Building a living, queryable documentation catalog in the database — from the very first session |
| 8 | [08-debugging-role-naming-drift.md](08-debugging-role-naming-drift.md) | How a naming inconsistency silently blocked a feature — and the diagnostic method that found it |

---

## A Note on the Documentation Catalog

One of the first things you will set up — alongside your GitHub repository and Supabase project — is a `documentation_catalog` table in your database. This is covered in Section 7, but you should read it early.

Every document you create gets a record in that table. Every architecture decision, every tutorial section, every session handoff — all indexed, all searchable. When you come back to this project after a break, you will not have to hunt through folders. You will run a query.

This is not a nice-to-have. It is infrastructure.

---

## A Note on Pacing

Go as slowly as you need to. Every section is written to be read once, tried once, and then read again if something did not work. Nothing in here requires you to memorize anything. Everything you need is written down.

If a step produces an error, that is not a failure — it is information. The sections on debugging (especially Section 8) will help you build the habit of reading errors as clues, not verdicts.
