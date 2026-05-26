# Section 2 — Your Tools
## Setting Up GitHub, Cloudflare Pages, and Supabase

---

## What You Are Setting Up and Why

Before you can build anything, you need three things:

1. **A place to store your code** — This is GitHub. Think of it as a filing cabinet for your project, but one that remembers every version of every file you have ever saved, and lets you go back to any of them.

2. **A place to publish your application** — This is Cloudflare Pages. Think of it as the address where people can visit your application on the internet. Every time you save a change to your code, Cloudflare automatically updates the live version.

3. **A place to store your data** — This is Supabase. Think of it as a structured, searchable, and secure notebook where all the information submitted through your application gets stored and organized.

All three are free to use at the level this project requires. All three are professional tools used by real companies. You are not learning on training wheels — you are learning on the same tools that developers use.

> **Why Cloudflare Pages instead of Netlify?**
> This tutorial originally used Netlify for hosting. During development, the free tier bandwidth limit was reached — and the site went offline. Cloudflare Pages has no bandwidth cap on its free tier, making it a more reliable choice for communities that cannot afford unexpected hosting bills. See Section 6 for the full story and the lesson behind it.

---

## Step 1 — Create a GitHub Account

GitHub is where your code lives. It is also how Cloudflare Pages knows when to update your live site — every time you save a change to GitHub, Cloudflare sees it and redeploys automatically.

1. Go to [github.com](https://github.com)
2. Click **Sign up**
3. Choose a username. This will be visible publicly — keep it professional.
4. Use a real email address you check regularly.
5. Complete the verification and confirm your email.

### Create Your First Repository

A **repository** (often called a "repo") is a folder for your project on GitHub. Everything in your application will live in one repository.

1. Once logged in, click the **+** icon in the top right → **New repository**
2. Name it: `community-ledger`
3. Set it to **Public** (this is required for free Cloudflare Pages deployment)
4. Check **Add a README file**
5. Click **Create repository**

You now have a place to store your code.

> ### 💡 Help Your Future You — Naming Your Repository
> The name `community-ledger` is just a suggestion. Whatever you choose, pick something you will still recognize six months from now. Avoid names like `project1` or `test-app` — when you have multiple projects, those names tell you nothing. A good name describes what the project *does*, not when you made it.

---

## Step 2 — Create a Cloudflare Pages Account

Cloudflare Pages is where your application will live on the internet. It watches your GitHub repository and automatically publishes the latest version of your site every time you make a change. Unlike some other hosting services, Cloudflare Pages has **no bandwidth limit** on its free tier — meaning your site will not go offline if it gets traffic.

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Click **Sign up** and create a free Cloudflare account
3. Once logged in, go to **Workers & Pages** → **Create** → **Pages**
4. Click **Connect to Git** and authorize Cloudflare to access your GitHub account
5. Select your `community-ledger` repository
6. Leave the build settings as defaults (no build command needed for a static site)
7. Click **Save and Deploy**

Cloudflare will assign your site a URL like `community-ledger.pages.dev`. Write this down.

> ### 💡 Help Your Future You — Note Your Site URL
> When Cloudflare creates your site, it will give it a URL ending in `.pages.dev`. Write this URL down in your project reference document immediately. You can add a custom domain later from the Cloudflare dashboard if you want a more professional address.

---

## Step 3 — Create a Supabase Account

Supabase is where your application's data will be stored. When someone fills out the intake form, that information will be saved to Supabase. When the admin approves a submission, Supabase records that too.

1. Go to [supabase.com](https://supabase.com)
2. Click **Start your project**
3. Sign in with GitHub (recommended — keeps your accounts connected)
4. Once logged in, click **New project**
5. Name it: `community-ledger`
6. Choose the free plan
7. Select a region close to where your community is located
8. Click **Create new project** — it takes a minute or two to initialize

You do not need to do anything inside Supabase yet. We will return to it when we build the database section.

> ### 💡 Help Your Future You — Save Your Project ID
> After your Supabase project initializes, find your **Project ID** in Settings → General. It looks like a random string of letters and numbers. Copy it into your project reference document now. You will need it repeatedly throughout this build, and hunting for it later is an unnecessary interruption.

---

## What You Now Have

| Account | What It Does | Status |
|---------|-------------|--------|
| GitHub | Stores your code | ✅ Created |
| Cloudflare Pages | Publishes your site | ✅ Created |
| Supabase | Stores your data | ✅ Created |

These three accounts form the complete infrastructure for your application. Everything you build will live in or flow through one of these three services.

---

## A Note on Passwords and Security

You now have three accounts that will eventually hold real community data. A few habits that matter from the start:

- **Use a password manager** if you have one. If you do not, consider [Bitwarden](https://bitwarden.com) — it is free and open source.
- **Use a different password for each account.** If one account is compromised, the others stay safe.
- **Enable two-factor authentication** on GitHub at minimum. GitHub holds your code — it is the most important account to protect.

Security is not a feature you add later. It is a habit you build from the beginning.

> ### 💡 Help Your Future You — Keep a Project Reference Document
> As you build, you will collect URLs, IDs, and account names across multiple services. Start a simple document right now — even a notes app works — and paste each one in as you go. This tutorial includes a template called `docs/project-reference.md` in the repository. Copy it and fill it in as you complete each step. Your future self will thank you the first time you need to find something at 10pm.

---

## ✅ Concept Check — Section 2

*Write your responses in your own words.*

**1.** In your own words, describe what each of the three tools does. Imagine you are explaining them to a neighbor who uses a computer but has never built a website.

**2.** GitHub saves every version of every file you have ever changed. Why might that be useful? Can you think of a situation where being able to go back to an older version of something would matter?

**3.** Cloudflare Pages automatically updates your live site every time you save a change to GitHub. What does that tell you about the relationship between GitHub and Cloudflare Pages?

**4.** You now have accounts with three different services. Each one holds something valuable — your code, your live application, and your community's data. If you had to rank them by how important it is to protect them, what order would you choose and why?
