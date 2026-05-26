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

> **If your Supabase project is shared with another application** (for example, if you used the same Supabase project for a previous project), add that application's URL to the Redirect URLs list as well. Do not remove it. Both entries can coexist and each app's auth emails will continue to work. Changing the Site URL affects which app receives default auth emails — point it at whichever app is primary.

### Step 2 — Create Your Admin User

1. Go to **Authentication → Users**
2. Click **Add user** → **Create new user**
3. Enter your email address and choose a password
4. Click **Create user**

You can now log into the admin page with those credentials.

---

## Troubleshooting: When the Dashboard Doesn't Cooperate

Supabase's Auth UI in the dashboard is functional but not always intuitive. During the development of this project, we encountered a situation that is worth documenting directly.

### What Happened

After creating an admin user, the password was set incorrectly and login failed. The options available in the Supabase dashboard were:

**Option A — Send a password reset email**
The dashboard can send a reset link to the user's email. This sounds straightforward, but it depends on the **Site URL** and **Redirect URLs** being correctly configured first. If they are not, the reset link points to the wrong application — in our case, a previous project hosted at a different URL entirely. The link also has a short expiration window, so if you click it even slightly late, it returns an `otp_expired` error.

**Option B — Edit the user directly in the dashboard**
The dashboard user list has a three-dot menu per user that *should* allow direct password updates. In practice, this option was not clearly visible or accessible during setup.

**Option C — Reset the password via SQL (chosen)**
Supabase stores user credentials in the `auth.users` table. Because we have direct database access through the SQL editor, we can update a user's password directly — no email flow, no expiration window, no redirect URL dependency.

This was the fastest and most reliable path. We chose it.

### The SQL Password Reset

If you ever need to reset an admin password directly, run this in the Supabase **SQL Editor**:

```sql
UPDATE auth.users
SET encrypted_password = crypt('your-new-password', gen_salt('bf'))
WHERE email = 'your-admin-email@example.com';
```

Replace `your-new-password` and `your-admin-email@example.com` with your actual values. The `crypt()` function hashes the password using bcrypt — the same method Supabase uses internally. The plain text password is never stored.

> ### 💡 Help Your Future You — SQL Access Is a Superpower With Responsibility
> The ability to run SQL directly against your database is one of the most powerful tools available to you. It bypasses every UI limitation and lets you fix things that the dashboard cannot. It also means you can break things that the dashboard would have protected you from. A few rules:
> - Always read a SQL statement fully before running it
> - `UPDATE` without a `WHERE` clause affects every row in the table — always include `WHERE`
> - When in doubt, run a `SELECT` with the same `WHERE` clause first to confirm you are targeting the right record before running the `UPDATE`
> - The SQL editor in Supabase does not ask for confirmation. There is no undo.

---

## Sending Rejection Emails

When you reject a submission, the submitter receives an email automatically. You do not need to write it, copy an address, or open a separate app. It happens the moment you click **Reject & Notify**.

Here is what the submitter receives:
- A clear subject line identifying their submission by reference ID
- A list of the specific correction reasons you selected
- Any additional notes you added
- An instruction to correct and resubmit

---

## ⚠️ Known Blocker — Free Email Domains Cannot Be Used as Sending Addresses

This was discovered during development and is documented here so you do not repeat the same path.

Rejection emails are sent through **Resend**, which requires that the *sending* address (the `From:` field) belong to a domain you own and have verified with DNS records. Free public email domains — **gmail.com, yahoo.com, outlook.com, icloud.com, and all similar providers** — are explicitly blocked by Resend. You will see this error:

> *"We don't allow free public domains. Please use a domain you own instead."*

This is not a configuration problem. It is a hard policy enforced by Resend to prevent spam abuse. There is no workaround within Resend.

**What this means practically:** If you do not own a custom domain (e.g. `yourcommunity.org`), you cannot use a Resend-verified sending address in production.

---

## Email Provider Options

Three paths are available depending on your situation:

### Option A — Own a Custom Domain (Recommended for Production)

If you own a domain — even a cheap one ($10–15/year from Namecheap, Google Domains, or Cloudflare Registrar) — this is the cleanest path:

1. Go to [resend.com/domains](https://resend.com/domains) → **Add Domain**
2. Enter your domain (e.g. `yourdomain.org`)
3. Resend will provide DNS records (SPF, DKIM, MX) to add at your domain registrar
4. Add those records and click **Verify** in Resend — propagation takes a few minutes
5. Set `EMAIL_FROM` in Supabase Secrets to `noreply@yourdomain.org`

Once verified, emails land reliably and look professional.

### Option B — Gmail SMTP via Google App Password (No Custom Domain Required)

If you use Gmail and do not want to purchase a domain, you can send directly from your Gmail address using **Google App Passwords** and Gmail's SMTP server. This requires rewriting the Edge Function to use SMTP instead of the Resend API, but it is fully supported and free.

**Prerequisites:**
- Google account with 2-Step Verification enabled
- A Google App Password generated at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

**Supabase Secrets needed:**
- `GMAIL_USER` — your full Gmail address (e.g. `you@gmail.com`)
- `GMAIL_APP_PASSWORD` — the 16-character app password from Google

The Edge Function sends via `smtp.gmail.com:465` (SSL). Google allows up to 500 emails/day on a free account — far more than this project requires.

> This option trades Resend's simplicity for not needing a custom domain. The email arrives from your actual Gmail address, which is recognizable to recipients.

### Option C — Resend Test Address (Development Only)

Resend provides a shared sending address `onboarding@resend.dev` that works without domain verification. It can only deliver to **your own verified email address** in Resend — not to arbitrary recipients. Use this only to confirm the pipeline works end to end during development.

Set `EMAIL_FROM` to `onboarding@resend.dev` in Supabase Secrets for testing, then switch to Option A or B before going live.

---

## How to Set Up Resend (Option A)

1. Go to [resend.com](https://resend.com) and create a free account
2. In the Resend dashboard, create an **API key** — copy it immediately, it is shown only once
3. Go to your Supabase dashboard → **Project Settings** → **Edge Functions** → **Secrets**
4. Add a secret named `RESEND_API_KEY` and paste your key
5. Add a secret named `EMAIL_FROM` with your verified sending address (e.g. `noreply@yourcommunity.org`)
6. Verify your domain at [resend.com/domains](https://resend.com/domains) following the DNS steps above

> ### 💡 Help Your Future You — Treat API Keys Like Passwords
> An API key is essentially a password that lets a service act on your behalf. If someone else gets your Resend API key, they can send emails as you. Rules:
> - **Never paste an API key into a chat, email, or document** that others can see
> - **Never commit an API key to GitHub** — even a private repository
> - If you accidentally share one, rotate it immediately (delete the old key, create a new one)
> - Store keys in Supabase Secrets only — never in code

---

## The Developer Test Panel

This project includes a hidden test panel on the admin page. It is only visible when you add `?dev=true` to the admin URL:

```
https://your-site.pages.dev/admin.html?dev=true
```

The test panel lets you:
- Edit test fixture data (financials, budget, donations, core submission fields) and insert it as a test record with a reserved UUID
- Fire the rejection email at any existing submission by pasting its UUID
- Load a submission's stored data to inspect it
- Verify that your email configuration is working

This means you do not have to submit a brand new test form every time you want to check whether something is working.

> ### 💡 Help Your Future You — Use the Test Panel Before Going Live
> Any time you change your email configuration, rotate a key, or update the rejection email template, use the test panel to confirm everything still works before a real rejection goes out. A submitter who receives a broken or blank email has a worse experience than one who receives a delayed email. Test first, then use in production.

---

## ✅ Concept Check — Section 5

*Write your responses in your own words.*

**1.** The admin page shows a login button to anyone who is not authenticated, and nothing else. Why is it important that the page shows *nothing else* — not even a message that says "access denied"?

**2.** Rejection emails are sent automatically when an admin clicks a button. What would be the consequence of not having this automation — if an admin had to write and send each rejection manually?

**3.** An API key is described as "a password that lets a service act on your behalf." In your own words, explain what could go wrong if a Resend API key were exposed publicly.

**4.** The test panel is hidden behind `?dev=true` in the URL. It is not locked behind a separate password — just hidden. Is that level of protection sufficient? Why or why not? What would make it more secure if this application grew?

**5.** Three options were available to reset a stuck admin password: email reset, dashboard UI, and direct SQL. We chose SQL. In your own words, explain why direct database access was the most reliable option in that moment — and what conditions would need to be true for the email reset to have been equally reliable.

**6.** Resend blocks free public email domains (gmail.com, yahoo.com, etc.) as sending addresses. In your own words, explain *why* an email service would enforce this restriction — what problem are they preventing?
