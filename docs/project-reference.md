# Community Ledger — Project Reference
**Last Updated:** May 25, 2026

---

## 🌐 Live URLs
| Label | URL |
|---|---|
| Public Form | https://community-finance.netlify.app |
| Admin Panel | https://community-finance.netlify.app/admin |

---

## 🐙 GitHub
| Label | Value |
|---|---|
| Username | andredavisme |
| Repository | personal-ledger-public-display |
| Repo URL | https://github.com/andredavisme/personal-ledger-public-display |
| Default Branch | main |
| Auto-Deploy | Netlify deploys on every push to main |

---

## 🗄️ Supabase
| Label | Value |
|---|---|
| Project Name | andredavisme's Project |
| Project ID | hhyhulqngdkwsxhymmcd |
| Region | us-west-2 |
| Database Host | db.hhyhulqngdkwsxhymmcd.supabase.co |
| Dashboard URL | https://supabase.com/dashboard/project/hhyhulqngdkwsxhymmcd |
| Schema | ledger |
| Schema Created | May 25, 2026 |

### Key Tables
| Table | Purpose |
|---|---|
| ledger.submissions | Core intake records |
| ledger.submission_financials | Financial statement CSV rows |
| ledger.submission_budget | Budget CSV rows |
| ledger.submission_donations | Donation method CSV rows |
| ledger.correction_reasons | Admin rejection checklist |
| ledger.admin_actions | Immutable audit log |

### Key Views
| View | Purpose |
|---|---|
| ledger.submissions_with_collision | Adds reference_collision boolean |
| ledger.admin_actions_log | Admin action history view |

---

## 🚀 Netlify
| Label | Value |
|---|---|
| Site Name | community-finance |
| Hosting URL | https://community-finance.netlify.app |
| Auth Method | Netlify Identity (invite-only) |
| Deploy Trigger | GitHub push to main |
| Config File | netlify.toml |

---

## ⚙️ Key Source Files
| File | Purpose |
|---|---|
| index.html | Public submission form |
| admin.html | Admin review page (auth-gated) |
| community.html | Public community pages (stub) |
| assets/js/intake.js | Form submission → Supabase insert |
| assets/js/admin.js | Admin page logic |
| assets/js/auth.js | Netlify Identity abstraction layer |
| assets/js/supabase.js | Shared Supabase client |
| netlify.toml | Netlify config, redirects, headers |

---

## 🔑 Credentials & Keys
> ⚠️ Rotate keys if ever exposed publicly.
> Move to Netlify environment variables before production expansion.

| Label | Location |
|---|---|
| Supabase Anon Key | Hardcoded in admin.js and intake.js (migrate out) |
| Netlify Identity | Managed via Netlify Dashboard |

---

## 📌 Open Items (as of May 25, 2026)
- [ ] Fix admin.js Supabase URL → update to project `hhyhulqngdkwsxhymmcd`
- [ ] Fix admin.js: `created_at` → `submitted_at` in `loadSubmissions()` order clause
- [ ] Fix admin.js: `s.submitter_name` → `s.full_name` in card renderer
- [ ] Fix admin.js: remove `'flagged'` from status filter (not in live enum)
- [ ] Fix admin.js: load CSV data from child tables (`submission_financials`, `submission_budget`, `submission_donations`)
- [ ] Build out `community.html` with approved submission data
- [ ] Build `send-rejection-email` Edge Function
- [ ] Migrate auth from Netlify Identity → Supabase Auth
- [ ] Move Supabase keys to Netlify environment variables
- [ ] Confirm `ledger` schema is listed in Supabase Dashboard → Settings → API → Exposed Schemas

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
| `community-finance.netlify.app` | Your Netlify site URL |
| `hhyhulqngdkwsxhymmcd` | Your Supabase project ID |
| `ledger` | Your Supabase schema name |
