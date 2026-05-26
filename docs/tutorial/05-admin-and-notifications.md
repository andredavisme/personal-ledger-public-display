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

The admin page is gated using a tool called **Netlify Identity**. Think of it as a velvet rope at the door. Anyone can walk up, but only people on the guest list get in.

Here is how it works:

- The admin page checks whether the visitor is logged in when it loads
- If they are not logged in, it shows a login button — nothing else
- If they are logged in and on the approved list, the full admin interface appears
- There is no way to bypass this by typing a URL or clicking around

You manage the approved list in your Netlify dashboard. Invitations are sent by email. The invited person sets their own password. You never see or store their password.

> ### 💡 Help Your Future You — Invite, Don't Share
> Never share your admin password with a co-admin. Instead, invite them through Netlify Identity so they have their own login. This means if they ever need to be removed, you can revoke their access without changing your own password or affecting anyone else. Each person should have exactly one account, and each account should belong to exactly one person.

---

## Sending Rejection Emails

When you reject a submission, the submitter receives an email automatically. You do not need to write it, copy an address, or open a separate app. It happens the moment you click **Reject & Notify**.

Here is what the submitter receives:
- A clear subject line identifying their submission by reference ID
- A list of the specific correction reasons you selected
- Any additional notes you added
- An instruction to correct and resubmit

The email is sent through a service called **Resend**. Resend is free for the volume this project requires.

### How to Set Up Resend

1. Go to [resend.com](https://resend.com) and create a free account
2. In the Resend dashboard, create an **API key** — this is a long password that lets your application send emails on your behalf
3. Copy the key immediately — Resend will only show it to you once
4. Go to your Supabase dashboard → **Project Settings** → **Edge Functions** → **Secrets**
5. Add a secret named `RESEND_API_KEY` and paste your key as the value
6. Add a second secret named `EMAIL_FROM` with the address you want emails to come from (example: `noreply@yourcommunity.org`)

> ### 💡 Help Your Future You — Treat API Keys Like Passwords
> An API key is essentially a password that lets a service act on your behalf. If someone else gets your Resend API key, they can send emails as you. A few rules to internalize now:
> - **Never paste an API key into a chat, email, or document** that others can see
> - **Never commit an API key to GitHub** — even a private repository
> - If you accidentally share one, go to that service immediately and rotate it (delete the old key, create a new one)
> - Store keys in your password manager or directly in the service's secrets vault — nowhere else
>
> This project stores all keys in Supabase Secrets, which is the right place for them. The application reads them automatically — you never need to paste them into your code.

---

## The Developer Test Panel

This project includes a hidden test panel on the admin page. It is only visible when you add `?dev=true` to the admin URL:

```
https://your-site.netlify.app/admin.html?dev=true
```

The test panel lets you:
- Fire the rejection email at any existing submission by pasting its ID
- Load a submission's stored data to inspect it
- Verify that your Resend key and email settings are working

This means you do not have to submit a brand new test form every time you want to check whether something is working.

> ### 💡 Help Your Future You — Use the Test Panel Before Going Live
> Any time you change your email configuration, rotate a key, or update the rejection email template, use the test panel to confirm everything still works before a real rejection goes out. A submitter who receives a broken or blank email has a worse experience than one who receives a delayed email. Test first, then use in production.

> ### 💡 Help Your Future You — Keep a "Rejected" Test Submission
> After your first successful test rejection, do not delete that submission from Supabase. Keep it in the database as a permanent test record. Label it clearly — for example, set the `community_name` field to `[TEST] Do Not Approve`. Whenever you need to test the rejection flow again, you have a UUID ready to paste into the test panel without filling out the form from scratch.

---

## ✅ Concept Check — Section 5

*Write your responses in your own words.*

**1.** The admin page shows a login button to anyone who is not authenticated, and nothing else. Why is it important that the page shows *nothing else* — not even a message that says "access denied"?

**2.** Rejection emails are sent automatically when an admin clicks a button. What would be the consequence of not having this automation — if an admin had to write and send each rejection manually?

**3.** An API key is described as "a password that lets a service act on your behalf." In your own words, explain what could go wrong if a Resend API key were exposed publicly.

**4.** The test panel is hidden behind `?dev=true` in the URL. It is not locked behind a separate password — just hidden. Is that level of protection sufficient? Why or why not? What would make it more secure if this application grew?
