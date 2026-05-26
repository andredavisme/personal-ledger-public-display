# Section 5 — Admin, Secrets, and Notifications
## Protecting Your Admin Page and Sending Rejection Emails

---

## What This Section Covers

Once your application is live, two things become important very quickly:

1. **Only you should be able to approve or reject submissions.** Anyone who stumbles onto your admin page should hit a login wall, not a list of private community data.
2. **When you reject a submission, the person who submitted it should know why** — clearly, kindly, and automatically.

This section explains how both of those work in plain language.

---

## Protecting Your Admin Page

The admin page is gated using **Supabase Auth**. Think of it as a velvet rope at the door. Anyone can walk up, but only people on the guest list get in.

Here is how it works:

- The admin page checks whether the visitor is logged in when it loads
- If they are not logged in, it shows a login button — nothing else
- If they are logged in and on the approved list, the full admin interface appears
- There is no way to bypass this by typing a URL or clicking around

You manage the approved list in your Supabase dashboard under **Authentication → Users**. You create users directly — no public registration is available on this application.

> ### 💡 Help Your Future You — Invite, Don't Share
> Never share your admin password with a co-admin. Instead, create them their own user in Supabase Auth so they have their own login. This means if they ever need to be removed, you can delete their account without changing your own password or affecting anyone else. Each person should have exactly one account, and each account should belong to exactly one person.

---

## Setting Up Your Admin User

### Step 1 — Configure Your Redirect URLs

Before creating any users, set Supabase's URL configuration so that auth emails (password resets, confirmations) point to the right place.

1. Go to your Supabase dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL** to your Cloudflare Pages URL:
   ```
   https://your-site.pages.dev
   ```
3. Under **Redirect URLs**, add:
   ```
   https://your-site.pages.dev/**
   ```
4. Click **Save**

> **If your Supabase project is shared with another application**, add that application's URL to the Redirect URLs list as well. Do not remove it.

### Step 2 — Create Your Admin User

1. Go to **Authentication → Users**
2. Click **Add user** → **Create new user**
3. Enter your email address and choose a password
4. Click **Create user**

---

## Troubleshooting: When the Dashboard Doesn't Cooperate

### The SQL Password Reset

If you ever need to reset an admin password directly, run this in the Supabase **SQL Editor**:

```sql
UPDATE auth.users
SET encrypted_password = crypt('your-new-password', gen_salt('bf'))
WHERE email = 'your-admin-email@example.com';
```

> ### 💡 Help Your Future You — SQL Access Is a Superpower With Responsibility
> - Always read a SQL statement fully before running it
> - `UPDATE` without a `WHERE` clause affects every row — always include `WHERE`
> - Run a `SELECT` with the same `WHERE` first to confirm you are targeting the right record
> - The SQL editor does not ask for confirmation. There is no undo.

---

## Sending Rejection Emails

When you reject a submission, the submitter receives an email automatically. The email includes:
- A subject line identifying their submission by reference ID
- The specific correction reasons you selected
- Any additional notes you added
- An instruction to correct and resubmit

Emails are sent from your Gmail account via **Gmail SMTP** using a Google App Password. This requires no custom domain and is free up to 500 emails/day.

---

## ⚠️ Why Not Resend

Resend was the original email provider. It was abandoned after discovering that Resend blocks free public email domains (gmail.com, yahoo.com, etc.) as sending addresses — a hard blocker since this project does not use a custom domain.

Resend's error when attempting to add gmail.com:
> *"We don't allow free public domains. Please use a domain you own instead."*

This is enforced policy, not a configuration issue. See `docs/infrastructure/email.md` for the full option comparison.

---

## How to Set Up Gmail SMTP

1. Enable 2-Step Verification on your Google account if not already on
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create an App Password — name it `Community Ledger` — and copy the 16-character code
4. Go to Supabase → **Project Settings** → **Edge Functions** → **Secrets**
5. Add `GMAIL_USER` — your full Gmail address
6. Add `GMAIL_APP_PASSWORD` — the 16-character code

No redeployment needed. The Edge Function reads secrets at invocation time.

> ### 💡 Help Your Future You — Adding Secrets From a Mobile Device
> The Supabase dashboard is not designed for mobile, but the Secrets panel is usable in **landscape (horizontal) orientation**. This was confirmed in practice on May 26, 2026. If you ever need to rotate a credential urgently and only have your phone, rotate to landscape and navigate to Project Settings → Edge Functions → Secrets. It is tolerable.

> ### 💡 Help Your Future You — Treat App Passwords Like Passwords
> A Google App Password grants email-sending access to your Gmail account. If one is ever exposed:
> - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) and revoke it immediately
> - Generate a new one and update `GMAIL_APP_PASSWORD` in Supabase Secrets
> - Never paste it into a chat, email, or document

---

## The Developer Test Panel

The test panel is only visible at `admin.html?dev=true`. It lets you:
- Edit test fixture data and insert it as a test record with a reserved UUID
- Fire the rejection email against any submission UUID
- Load and inspect stored submission data

Use this any time you change email configuration before a real rejection goes out.

---

## ✅ Concept Check — Section 5

*Write your responses in your own words.*

**1.** The admin page shows a login button to anyone who is not authenticated, and nothing else. Why is it important that the page shows *nothing else* — not even a message that says "access denied"?

**2.** Rejection emails are sent automatically when an admin clicks a button. What would be the consequence of not having this automation — if an admin had to write and send each rejection manually?

**3.** A Google App Password grants email access to your Gmail account. In your own words, explain what could go wrong if it were exposed publicly.

**4.** The test panel is hidden behind `?dev=true` in the URL but not locked behind a separate password. Is that sufficient protection? Why or why not?

**5.** Three options existed for resetting a stuck admin password: email reset, dashboard UI, and direct SQL. We chose SQL. Explain why it was the most reliable in that moment.

**6.** Resend blocks free public email domains. In your own words, explain *why* an email service would enforce this restriction — what problem are they preventing?

**7.** Gmail SMTP was chosen over Resend because it requires no custom domain. What trade-offs does that introduce, and under what circumstances would switching to a custom domain + Resend be worth it?
