# Email Infrastructure

## Current Provider
Gmail SMTP via Google App Password — called from the `send-rejection-email` Supabase Edge Function using the `denomailer` Deno library (`smtp.gmail.com:465`, TLS).

Resend was the original provider but was abandoned. See **Why Not Resend** below.

## Current Configuration

| Secret | Location | Status |
|---|---|---|
| `GMAIL_USER` | Supabase Edge Function Secrets | Set ✅ |
| `GMAIL_APP_PASSWORD` | Supabase Edge Function Secrets | Set ✅ |

Secrets were added via mobile phone (horizontal orientation) on May 26, 2026. See **Mobile Access Note** below.

## Why Not Resend

Resend was the original email provider. It was abandoned after discovering that Resend does not allow free public email domains (gmail.com, yahoo.com, outlook.com, etc.) as sending addresses. This was a hard blocker since no custom domain is in use for this project.

Resend's error: *"We don't allow free public domains. Please use a domain you own instead."*

This is enforced policy, not a configuration issue. Resend remains a valid option if a custom domain is acquired in the future. See `docs/tutorial/05-admin-and-notifications.md` for the full decision tree.

## Gmail SMTP Setup

**Prerequisites:**
- Google account with 2-Step Verification enabled
- A Google App Password generated at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

**Steps:**
1. Generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — name it `Community Ledger`
2. Copy the 16-character password immediately
3. Go to Supabase → **Project Settings** → **Edge Functions** → **Secrets**
4. Add `GMAIL_USER` — your full Gmail address
5. Add `GMAIL_APP_PASSWORD` — the 16-character app password

Google allows up to 500 sent emails/day on a free account — far more than this project requires.

> **If you rotate the App Password** (e.g. after a security concern), generate a new one in Google, then update `GMAIL_APP_PASSWORD` in Supabase Secrets. No redeployment of the Edge Function is needed — secrets are read at invocation time.

## Mobile Access Note

Supabase Secrets were successfully added from a mobile phone on May 26, 2026. The Supabase dashboard is not designed for mobile use, but the Secrets panel is accessible in **horizontal (landscape) orientation**. This is worth knowing for urgent credential rotations when a desktop is not available.

Path: supabase.com/dashboard → your project → Project Settings → Edge Functions → Secrets.
