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

> ### 💡 Help Your Future You — Invite, Don’t Share
> Never share your admin password with a co-admin. Instead, create them their own user in Supabase Auth so they have their own login. This means if they ever need to be removed, you can delete their account without changing your own password or affecting anyone else. Each person should have exactly one account, and each account should belong to exactly one person.

---

## Setting Up Your Admin User

### Step 1 — Configure Your Redirect URLs

Before creating any users, set Supabase’s URL configuration so that auth emails (password resets, confirmations) point to the right place.

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

> **If your Supabase project is shared with another application**, add that application’s URL to the Redirect URLs list as well. Do not remove it.

### Step 2 — Create Your Admin User

1. Go to **Authentication → Users**
2. Click **Add user** → **Create new user**
3. Enter your email address and choose a password
4. Click **Create user**

---

## Troubleshooting: When the Dashboard Doesn’t Cooperate

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

Resend’s error when attempting to add gmail.com:
> *“We don’t allow free public domains. Please use a domain you own instead.”*

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

**1.** The admin page shows a login button to anyone who is not authenticated, and nothing else. Why is it important that the page shows *nothing else* — not even a message that says “access denied”?

**2.** Rejection emails are sent automatically when an admin clicks a button. What would be the consequence of not having this automation — if an admin had to write and send each rejection manually?

**3.** A Google App Password grants email access to your Gmail account. In your own words, explain what could go wrong if it were exposed publicly.

**4.** The test panel is hidden behind `?dev=true` in the URL but not locked behind a separate password. Is that sufficient protection? Why or why not?

**5.** Three options existed for resetting a stuck admin password: email reset, dashboard UI, and direct SQL. We chose SQL. Explain why it was the most reliable in that moment.

**6.** Resend blocks free public email domains. In your own words, explain *why* an email service would enforce this restriction — what problem are they preventing?

**7.** Gmail SMTP was chosen over Resend because it requires no custom domain. What trade-offs does that introduce, and under what circumstances would switching to a custom domain + Resend be worth it?

---

## 🏁 Milestone 5 — Create Your Admin User and Confirm the Login Wall

The concept of authentication — checking who someone is before letting them in — is easy to understand in theory. This milestone makes it tangible. You will create a real admin user in Supabase, configure where auth emails go, and verify that your admin page actually requires a login.

### Steps

**1. Set your Redirect URL in Supabase**
- Go to your [Supabase dashboard](https://supabase.com/dashboard)
- Open your `community-ledger` project
- Navigate to **Authentication → URL Configuration**
- In the **Site URL** field, enter your Cloudflare Pages URL:
  ```
  https://your-site.pages.dev
  ```
  (Replace `your-site` with your actual project name)
- Under **Redirect URLs**, click **Add URL** and enter:
  ```
  https://your-site.pages.dev/**
  ```
- Click **Save**

> If you see an existing URL in the Site URL field from a previous setup, update it rather than adding a second one.

**2. Create your admin user**
- Go to **Authentication → Users**
- Click **Add user** → **Create new user**
- Enter the email address you want to use for admin access
- Choose a strong password and write it down in a secure location (a password manager, not a sticky note)
- Click **Create user**
- You should see the user appear in the Users list with a Confirmed status

**3. Verify the login wall is working**
- Open your application’s `admin.html` page in a browser (use your `.pages.dev` URL followed by `/admin.html`)
- You should see **only** a login prompt — no data, no controls, nothing else
- Enter the email and password you just created
- You should now see the admin interface

> If you see the admin interface without logging in, the auth layer is not wired correctly. Do not proceed — note the issue in `my-notes.md` and review Section 5 before moving on.

**4. Log out and verify the wall reappears**
- Find the logout button or link in the admin interface
- Click it
- Confirm you are back to the login prompt with nothing visible behind it

**5. Record the milestone in `my-notes.md`**
- Open `my-notes.md` and add:

```
## Section 5 — Admin and Notifications

### Admin user email
[Write the email address you used — not the password.]

### Redirect URL I configured
[Paste the URL you set as Site URL in Supabase.]

### What I saw before logging in
[Describe what the admin page looked like before authentication.]

### What I saw after logging in
[Describe what the admin interface showed.]

### One thing that surprised me or needed troubleshooting
[Write one sentence. If everything went perfectly, write why you think it did.]
```

> ### 💡 Help Your Future You — Test the Wall, Not Just the Door
> It is easy to test that logging in works. It is equally important to test that *not* logging in keeps you out. The second check — verifying the wall holds after logout — is the one developers skip. Make it a habit: any time you change auth configuration, test the locked state, not just the unlocked one.

---

## ✅ Milestone Concept Check — Section 5

*Answer these after completing the milestone steps above.*

**1.** You set a Redirect URL in Supabase before creating any users. Why does Supabase need to know where to send auth emails before a user exists? What would happen if you skipped that step and created the user first?

**2.** You verified that the admin page shows only a login prompt to unauthenticated visitors. What is the difference between a page that *hides* its content and a page that *does not load* its content unless you are authenticated? Why does that distinction matter for security?

**3.** You logged out and confirmed the login wall reappeared. This is a test step that many people skip. What habit does this reinforce, and where else in this build — or in your own life — does the habit of testing the *locked* state matter as much as testing the *unlocked* one?
