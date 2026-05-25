# Deployment Infrastructure

## Current Setup: Netlify (Free Plan)

| Concern | Solution |
|---------|---------|
| Hosting | Netlify static hosting — served from repo root |
| Build | No build step; pure HTML/CSS/JS |
| SSL | Auto-provisioned by Netlify via Let's Encrypt |
| Domain | Netlify subdomain initially; custom domain when ready |
| Auth (admin) | Netlify Identity — invite-only, `admin` role |
| Secrets | Netlify environment variables dashboard |
| Redirects | `netlify.toml` `[[redirects]]` rules |

## Future Migration: Self-Hosted

This project is intentionally built to minimize platform lock-in.
All migration-sensitive areas are documented in code with `MIGRATION:` comments.

### Migration Checklist

- [ ] Set up VPS (DigitalOcean, Linode, Hetzner, etc.) or S3 + CloudFront
- [ ] Install Nginx or Caddy; replicate `netlify.toml` redirects as location blocks
- [ ] Provision SSL via Certbot (Let's Encrypt) or managed cert
- [ ] Set up GitHub Actions deploy workflow to replace Netlify auto-deploy
- [ ] **Swap auth provider in `assets/js/auth.js`** — change `PROVIDER` from `netlify` to `supabase`
- [ ] Activate Supabase Auth stub in `auth.js` (commented, ready to uncomment)
- [ ] Move environment variables to server secrets manager or `.env`
- [ ] Update DNS to point domain at new host
- [ ] Remove Netlify Identity widget script from `admin.html`
- [ ] Test admin gate, rejection flow, and community page routing end-to-end
- [ ] Decommission Netlify site

### Why Migration Is Low Risk

- All code is in GitHub — nothing proprietary to Netlify
- Auth is abstracted in a single file (`auth.js`) — no provider-specific calls elsewhere
- Database and Edge Functions are already in Supabase — unchanged on migration
- Static HTML/CSS/JS runs on any host without modification
- `netlify.toml` documents every routing rule that needs to be replicated

## Environment Variables

| Variable | Used For | Where Set |
|----------|----------|-----------|
| `SUPABASE_URL` | Supabase API endpoint | Netlify env vars / host secrets |
| `SUPABASE_ANON_KEY` | Supabase public client key | Netlify env vars / host secrets |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function server-side calls | Netlify env vars / host secrets (never in client code) |

All secrets are managed outside the codebase. See `personal-ledger-private` repo for account references and vault secret names.
