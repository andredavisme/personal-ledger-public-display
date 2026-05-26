# Community Ledger — Tutorial Series

This folder contains the complete tutorial series for building your own Community Ledger web application from scratch.

## Who This Is For

This tutorial is written for someone who has never written a line of code. You do not need a computer science background. You do not need to be good at math. You do not need any prior experience with websites, programming, or technology beyond basic computer use.

What you do need is curiosity, patience, and a willingness to try things you have never tried before.

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

## Tutorial Sections

| # | File | Topic |
|---|------|-------|
| 0 | [00-what-this-does.md](00-what-this-does.md) | Plain-language overview of the full project — the collect → store → show flow, the three money buckets, and how the public page works |
| 1 | [01-introduction.md](01-introduction.md) | What we are building, why it matters, and what AI is (and is not) in this process |
| 2 | [02-your-tools.md](02-your-tools.md) | Setting up GitHub, Cloudflare Pages, and Supabase accounts |
| 3 | [03-thinking-with-ai.md](03-thinking-with-ai.md) | How to use Perplexity AI as a development partner throughout the project |
| 4 | [04-your-first-file.md](04-your-first-file.md) | Creating your first HTML file and understanding what a web page actually is |
| 5 | [05-admin-and-notifications.md](05-admin-and-notifications.md) | Building the admin panel, rejection emails, Supabase Auth setup, and Edge Functions |
| 6 | [06-adjusting-fire.md](06-adjusting-fire.md) | Lessons from migrating hosting from Netlify to Cloudflare Pages mid-development |
| 7 | [07-documentation-as-infrastructure.md](07-documentation-as-infrastructure.md) | Building a living, queryable documentation catalog in the database — from the very first session |

## How to Use This Tutorial

Each section ends with a **Concept Check** — a short set of open-ended questions. There are no multiple choice answers. There is no answer key. The goal is to make you think about what you just did, in your own words, before moving on.

Those questions matter. Skipping them is like copying someone else's notes instead of taking your own. The understanding lives in the thinking, not the reading.

## A Note on the Documentation Catalog

One of the first things you will set up — alongside your GitHub repository and Supabase project — is a `documentation_catalog` table in your database. This is covered in Section 7, but you should read it early.

Every document you create gets a record in that table. Every architecture decision, every tutorial section, every session handoff — all indexed, all searchable. When you come back to this project after a break, you will not have to hunt through folders. You will run a query.

This is not a nice-to-have. It is infrastructure.

## A Note on Pacing

Go as slowly as you need to. Every section is written to be read once, tried once, and then read again if something did not work. Nothing in here requires you to memorize anything. Everything you need is written down.
