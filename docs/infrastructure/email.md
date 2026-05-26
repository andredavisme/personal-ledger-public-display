# Email Infrastructure

## Current Provider
Resend (`resend.com`) — called from the `send-rejection-email` Supabase Edge Function.

## Known Constraint — Free Public Domains Blocked

Resend does not allow free public email domains (gmail.com, yahoo.com, outlook.com, etc.) as sending addresses. This was discovered during development when attempting to use `andre.davis.me@gmail.com` as the `EMAIL_FROM` address.

Resend's error: *"We don't allow free public domains. Please use a domain you own instead."*

This is a hard policy — not a configuration issue. See `docs/tutorial/05-admin-and-notifications.md` for the full decision tree.

## Current Configuration

| Secret | Location | Value |
|---|---|---|
| `RESEND_API_KEY` | Supabase Edge Function Secrets | Set ✅ |
| `EMAIL_FROM` | Supabase Edge Function Secrets | Must be a verified Resend domain address |

## Options

### Option A — Custom Domain (Production)
Verify a domain at [resend.com/domains](https://resend.com/domains). Requires DNS access to the domain registrar. Set `EMAIL_FROM` to `noreply@yourdomain.com`.

### Option B — Gmail SMTP (No Custom Domain)
Send directly from a Gmail address using a Google App Password. Requires rewriting the Edge Function to use SMTP (`smtp.gmail.com:465`). No custom domain needed. Free up to 500 emails/day.

Secrets required:
- `GMAIL_USER` — full Gmail address
- `GMAIL_APP_PASSWORD` — 16-character app password from [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

### Option C — Resend Test Address (Dev Only)
Set `EMAIL_FROM` to `onboarding@resend.dev`. Delivers only to your own verified Resend email. Not suitable for production.

## Decision Pending
A custom domain or Gmail SMTP approach must be selected before the rejection email feature can be used in production.
