# Community Ledger — Project Reference
**Last Updated:** May 26, 2026

> ⚠️ **Hosting Note:** This project migrated from Netlify to Cloudflare Pages on May 25, 2026 after Netlify's free tier bandwidth limit was reached during development. See `docs/tutorial/06-adjusting-fire.md` for the full reasoning and lesson.

---

## 🌐 Live URLs
| Label | URL |
|---|---|
| Public Form | https://personal-ledger-public-display.pages.dev |
| Admin Panel | https://personal-ledger-public-display.pages.dev/admin.html |
| Community Pages | https://personal-ledger-public-display.pages.dev/community.html |

---

## 🐙 GitHub
| Label | Value |
|---|---|
| Username | andredavisme |
| Repository | personal-ledger-public-display |
| Repo URL | https://github.com/andredavisme/personal-ledger-public-display |
| Default Branch | main |
| Auto-Deploy | Cloudflare Pages deploys on every push to main |

---

## 🗄️ Supabase
| Label | Value |
|---|---|
| Project Name | andredavisme's Project |
| Project ID | hhyhulqngdkwsxhymmcd |
| Region | us-west-2 |
| Database Host | db.hhyhulqngdkwsxhymmcd.supabase.co |
| Dashboard URL | https://supabase.com/dashboard/project/hhyhulqngdkwsxhymmcd |
| Schema | public |

### Key Tables
| Table | Purpose |
|---|---|
| public.submissions | Core intake records |
| public.submission_financials | Financial statement CSV rows |
| public.submission_budget | Budget CSV rows |
| public.submission_donations | Donation method CSV rows |
| public.correction_reasons | Admin rejection checklist |
| public.admin_actions | Immutable audit log |
| public.donations | Donor-reported donation events and receipts |
| public.recognition_wall | Public donor display — visibility-controlled |
| public.documentation_catalog | Searchable index of all project documentation |

### Key Views
| View | Purpose |
|---|---|
| public.submissions_with_collision | Adds reference_collision boolean |

### Edge Functions
| Function | Purpose |
|---|---|
| send-rejection-email | Sends formatted rejection email via Gmail SMTP |
| send-donation-receipt | Sends donor receipt email after self-reported donation |

---

## ☁️ Cloudflare Pages
| Label | Value |
|---|---|
| Platform | Cloudflare Pages (free tier) |
| Hosting URL | https://personal-ledger-public-display.pages.dev |
| Auth Method | Supabase Auth |
| Deploy Trigger | GitHub push to main |
| Bandwidth Cap | None (unlimited on free tier) |
| Previous Host | Netlify (retired May 25, 2026 — bandwidth limit reached) |

---

## ⚙️ Key Source Files
| File | Purpose |
|---|---|
| index.html | Public submission form |
| admin.html | Admin review page (auth-gated) |
| community.html | Public community pages |
| assets/js/intake.js | Form submission → Supabase insert |
| assets/js/admin.js | Admin page logic |
| assets/js/admin-test-panel.js | Dev test panel (?dev=true) |
| assets/js/auth.js | Auth abstraction layer |
| assets/js/supabase.js | Shared Supabase client |
| assets/js/community.js | Public community page renderer |

---

## 🔑 Credentials & Keys
> ⚠️ Rotate keys if ever exposed publicly.
> Store all keys in Supabase Vault or Cloudflare Pages environment variables — never in code.

| Label | Location |
|---|---|
| Supabase Anon Key | assets/js/supabase.js (publishable — intentionally client-side) |
| Gmail SMTP User | Supabase Edge Function Secrets (GMAIL_USER) |
| Gmail App Password | Supabase Edge Function Secrets (GMAIL_APP_PASSWORD) |

---

## 📖 Documentation Catalog
All project documentation is indexed in `public.documentation_catalog` in Supabase.
Query it directly for filtered views by `doc_type`, `category`, `tags`, or `status`.

```sql
-- Example: all architecture docs
SELECT title, url, tags FROM public.documentation_catalog
WHERE doc_type = 'architecture' ORDER BY title;

-- Example: docs needing update
SELECT title, url FROM public.documentation_catalog
WHERE status = 'needs_update';
```

---

## 📌 Open Items (as of May 26, 2026)
- [x] Create Cloudflare Pages account and connect GitHub repo
- [x] Update live URLs in this document after Cloudflare deploy
- [x] Migrate auth from Netlify Identity → Supabase Auth
- [x] Seed correction_reasons table with 4 default records
- [x] Deploy send-donation-receipt Edge Function
- [x] Run donation capture Phase 1 DB migration
- [x] Create documentation_catalog table and seed all docs
- [ ] Move Supabase anon key to Cloudflare Pages environment variables (deferred — publishable key, not a security risk)
- [ ] Link community.css in community.html
- [ ] Add admin_actions audit log view to Supabase
- [ ] Build "I Donated" modal on community card (Phase 1 frontend)
- [ ] Test send-donation-receipt Edge Function with live data
- [ ] Answer Phase 2 open questions in donation-capture.md before building recognition wall

---

## 📋 Template Instructions
> Copy this document into your Perplexity Space for your own project.
> Replace all values with your own project identifiers.
> Keep this updated as your project evolves.

### Fields to Replace
| Placeholder | Replace With |
|---|---|
| `andredavisme` | Your GitHub username |
| `personal-ledger-public-display` | Your repository name |
| `hhyhulqngdkwsxhymmcd` | Your Supabase project ID |
| `public` | Your Supabase schema name |
| `personal-ledger-public-display.pages.dev` | Your Cloudflare Pages site URL |
