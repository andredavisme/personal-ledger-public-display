# Infrastructure — Deployment
**Last Updated:** May 29, 2026
**Status:** Current

> **Previous host:** Netlify was used during the initial deployment phase. The project migrated to Cloudflare Pages. See **Historical Note** at the bottom of this document.

---

## Current Setup: Cloudflare Pages

| Concern | Solution |
|---------|---------|
| Hosting | Cloudflare Pages — served from repo root |
| Build | No build step; pure HTML/CSS/JS |
| SSL | Auto-provisioned by Cloudflare |
| Domain | `personal-ledger-public-display.pages.dev` (Cloudflare subdomain) |
| Auth (admin) | Supabase Auth — email + password, role-gated via `public.profiles` |
| Auth (community rep) | Supabase Auth — magic link |
| Secrets | Supabase Edge Function Secrets (not Cloudflare env vars) |
| Deploy trigger | Push to `main` branch — Cloudflare Pages auto-deploys |
| Redirects | `_redirects` file in repo root (Cloudflare Pages format) |

---

## Deploy Pipeline

```
Local edit
  ↓ git push origin main
GitHub (andredavisme/personal-ledger-public-display)
  ↓ Cloudflare Pages webhook
Cloudflare Pages build
  ↓ (no build step — files served as-is from repo root)
https://personal-ledger-public-display.pages.dev
```

- Every push to `main` triggers a deploy automatically
- Deploy typically completes in under 60 seconds
- Previous deployments remain accessible via unique Cloudflare preview URLs
- No CI/CD configuration file needed — Cloudflare Pages handles it

---

## Environment Variables and Secrets

This project has **no Cloudflare environment variables**. All secrets live in Supabase.

| Secret | Location | Used By |
|--------|----------|---------|
| `GMAIL_USER` | Supabase Edge Function Secrets | `send-rejection-email`, `send-donation-receipt` Edge Functions |
| `GMAIL_APP_PASSWORD` | Supabase Edge Function Secrets | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function Secrets | Server-side Edge Function calls only — never in client code |

The Supabase anon key and project URL are referenced directly in client-side JS as public constants — they are not secrets. See `docs/project-reference.md` for current values.

---

## Routing

Cloudflare Pages uses a `_redirects` file in the repo root for routing rules. This replaces the `netlify.toml` `[[redirects]]` format used in the original Netlify setup.

All SPA-style routing and auth guard redirects are handled client-side in JavaScript — not at the CDN layer.

---

## Platform Lock-In Assessment

This project is built to minimize platform dependency:

- All code is in GitHub — nothing proprietary to Cloudflare Pages
- Cloudflare Pages serves static files — any static host (Netlify, Vercel, S3+CloudFront, Nginx) is a drop-in replacement
- Auth, database, and Edge Functions are entirely in Supabase — unchanged on host migration
- A host migration is a DNS + deploy-target change, not a code change

---

## Historical Note — Netlify (Deprecated)

Netlify was the original hosting provider. It was chosen for its zero-configuration static hosting and built-in Netlify Identity auth.

The project migrated to Cloudflare Pages when Supabase Auth replaced Netlify Identity. With auth no longer dependent on Netlify, there was no reason to stay on the platform. Cloudflare Pages offers equivalent static hosting with better global CDN performance and no build-minute limits on the free plan.

**What changed in the migration:**
- `netlify.toml` → `_redirects` (routing rules format)
- Netlify Identity → Supabase Auth (see `docs/infrastructure/auth.md`)
- Netlify env vars → Supabase Edge Function Secrets
- Netlify deploy webhook → Cloudflare Pages GitHub integration

**What did not change:**
- All HTML, CSS, and JS files — unchanged
- Supabase database, migrations, and Edge Functions — unchanged
- GitHub repository — unchanged

---

## Related Files
- `docs/infrastructure/auth.md` — Supabase Auth configuration and role flow
- `docs/infrastructure/email.md` — Gmail SMTP via Supabase Edge Functions
- `docs/project-reference.md` — live URLs, Supabase project ID, anon key
