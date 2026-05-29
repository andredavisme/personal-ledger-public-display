# Section 6 — Adjusting Fire
## What to Do When Your Plan Meets Reality

> **Note:** This section is a case study, not a setup instruction. It preserves the real story of a hosting decision made mid-build so that you can learn from it as a pattern. The current hosting platform for this project is **Cloudflare Pages**. You set that up in Section 2. Nothing in this section asks you to change anything.

---

## A Term Worth Knowing

**Adjusting fire** is a military term. It comes from artillery: you fire a round, observe where it lands, and correct your aim before the next shot. The goal was never to get it perfect the first time. The goal is to *observe, learn, and correct* until you hit your target.

Builders use this skill constantly — not because they planned poorly, but because reality reveals things that planning cannot.

This section is about a real decision made during the development of this very application. It is here because it happened, because it matters, and because you will face a version of it too.

---

## What Happened

This project was originally built using **Netlify** for hosting. Netlify is a well-regarded, widely used platform. It was a reasonable choice.

During a single evening of active development and testing, the site hit Netlify’s free tier bandwidth limit. The site went offline. A screen appeared that said:

> *“This site was paused as it reached its usage limits.”*

The work was not lost. The code was in GitHub. The data was in Supabase. But the live site was unreachable until the account was upgraded or the billing cycle reset.

For a community that depends on this application to collect submissions and display their financial story to potential donors, an unexpected outage is not just inconvenient — it is a break in trust.

---

## The Decision

Rather than pay for a Netlify upgrade, the project evaluated alternatives. The question was simple:

> *What hosting platform gives us the reliability we need at the price we can afford?*

The answer was **Cloudflare Pages**:
- Free tier with **no bandwidth cap**
- Same GitHub auto-deploy workflow
- Faster global performance due to Cloudflare’s network
- No risk of the site going offline due to traffic or testing

The migration required:
1. Creating a Cloudflare account
2. Connecting the same GitHub repository
3. Updating the auth system (Netlify Identity does not work outside of Netlify)
4. Updating documentation to reflect the new platform

The code did not change. The data did not change. Only the delivery address changed.

---

## A Note on Product Design — Even From Big Companies

Setting up Cloudflare Pages revealed something worth naming directly.

When you click “Start building” in the Cloudflare dashboard, it drops you into a **Create a Worker** setup flow — a serverless function builder that has nothing to do with hosting a static website. The Pages option, which is what you actually need, is a small, easy-to-miss link buried at the bottom of a screen dominated by irrelevant fields.

Cloudflare is one of the largest internet infrastructure companies in the world. They process trillions of requests per day. They have the resources to design a clear, welcoming onboarding experience for new users.

They chose not to.

This is not unusual. A company’s size and revenue have no guaranteed relationship to the quality of its user experience. Some of the most confusing, poorly labeled, and frustrating interfaces on the internet belong to the most profitable companies in the world. Assuming that a big brand means a good experience will cost you time — repeatedly.

**What this means for you as a builder:**

- When a tool’s interface is confusing, that is the tool’s failure, not yours
- Read slowly. Look for small links. Check whether you are in the right section before filling out fields
- If a setup screen asks for things that seem unnecessary (API tokens, deploy commands, wrangler configurations), stop — you are probably in the wrong flow
- Document gotchas like this for anyone who follows you. A one-sentence warning in your tutorial saves the next person twenty minutes of confusion

> ### 💡 Help Your Future You — Wrong Flow Looks Like Right Flow
> Many platforms have multiple products that share the same dashboard. “Workers” and “Pages” are both Cloudflare products, both under “Workers & Pages,” but they do completely different things. Before filling out any setup form, read the page title and the first paragraph of description. If it mentions things you don’t recognize, you may be in the wrong product. Back out and look for a tab, toggle, or secondary link that names what you actually want.

---

## Why This Is a Lesson, Not a Failure

It would be easy to frame the Netlify situation as a mistake — *we chose the wrong tool*. That framing is not useful and not accurate.

Netlify was a reasonable starting point. It is free, well-documented, and widely used. We could not have known a single evening of testing would hit the bandwidth ceiling before it happened. What mattered was what came next:

- We observed the problem clearly (site offline, billing limit reached)
- We evaluated options without panic
- We chose a better-fit tool for our specific constraints (no bandwidth cap, free tier, same workflow)
- We updated the plan and the documentation to reflect what we learned
- We kept building

That sequence — observe, evaluate, decide, update, continue — is adjusting fire. It is not a detour from the build. It *is* the build.

---

## What This Means for Your Project

At some point in your build, something will not work the way you expected. A service will have a limit you did not anticipate. A tool will behave differently in production than it did in testing. A decision that made sense in week one will need revisiting in week four.

When that happens:

1. **Name the problem clearly.** What exactly stopped working? What was the error or constraint?
2. **Separate the problem from the work.** Your code, your data, and your mission are still intact. One component needs replacement — not the whole project.
3. **Evaluate options by your actual constraints.** In this case: free, reliable, no bandwidth risk. Your constraints will be different — know them before you evaluate.
4. **Make the change and document it.** Update your reference document, your tutorial, your notes. Future you — and future collaborators — deserve to know why the decision was made.
5. **Keep building.** The adjustment is complete. Move forward.

> ### 💡 Help Your Future You — Document Why, Not Just What
> Your `docs/project-reference.md` records *what* is in your project. But decisions — especially the ones where you changed direction — deserve a *why*. When you swap a tool, add a one-sentence note: “Migrated from Netlify to Cloudflare Pages on [date] because free tier bandwidth limit was reached during development.” A year from now, that sentence will save you from second-guessing a decision you already thought through.

> ### 💡 Help Your Future You — Know Your Constraints Before You Choose Tools
> Before selecting any service, ask three questions: What happens when I hit the free tier limit? Can I afford the next tier if I need it? Is there a free alternative with better constraints for my situation? Answering these questions before you build is faster than answering them after your site goes offline.

---

## ✅ Concept Check — Section 6

*Write your responses in your own words.*

**1.** In your own words, describe what “adjusting fire” means and why it applies to building software.

**2.** When the hosting limit was reached, the code and data were unaffected. Why does the architecture of this project — three separate services for code, hosting, and data — make it easier to swap one component without losing everything?

**3.** Think about a time in your own life when a plan did not survive contact with reality. What did you observe? What did you change? What did you keep? How is that similar to what happened here?

**4.** The decision to switch hosting platforms was made quickly and without distress. What habits or practices described in this tutorial made that possible?

**5.** The Cloudflare dashboard buried the Pages option beneath a prominent Worker setup flow. You were not doing anything wrong — the interface was misleading. Can you think of another tool, service, or institution in your life where the design made you feel like *you* were the problem when the design was the problem? What would a better experience have looked like?

---

## 🏁 Milestone 6 — Anticipate Your Own Adjustment

This section does not have a technical step to complete. What it has is a thinking exercise — one that will pay off the first time something in your build does not go as planned.

The difference between a builder who panics when something breaks and one who adjusts fire is not talent. It is preparation. Preparation means having already asked the hard questions before the situation forces you to.

### Steps

**1. Open `my-notes.md`** and add a new section:

```
## Section 6 — Adjusting Fire

### My project’s constraints
[List 2–3 constraints that are non-negotiable for your version of this project.
Examples: must be free, must not require a custom domain, must work on mobile.
Write the ones that are actually true for you.]

### The component I am least confident about
[Name one service, tool, or step in this build that you are most uncertain about.
It can be anything — Supabase, the email setup, the HTML file, the deploy process.]

### What I would do if it failed
[Write 2–3 sentences describing what you would do if that component stopped working
or turned out to be the wrong choice. Do not say “ask for help” — describe the
actual steps: name the problem, separate it from the rest of the work, evaluate options.]

### One tool or service I have not evaluated yet
[Name something you have not researched yet but know you will need — for example,
how donations will actually be processed, or how your community will log in.
Write one question you would need to answer before choosing it.]
```

**2. Fill in all four fields** with answers specific to your project.

**3. Save the file.**

> ### 💡 Help Your Future You — Constraints Written Down Are Constraints You Can Use
> A constraint that only exists in your head is a constraint you can accidentally violate. When you write “must be free” in your notes, you have something to check any decision against. Before choosing any new tool, read your constraints list first. If the tool’s free tier has a hard limit you would hit, that is the answer — not a reason to investigate further.

---

## ✅ Milestone Concept Check — Section 6

*Answer these after completing the milestone steps above.*

**1.** You wrote down the component you are least confident about. Is that uncertainty about *how it works* or *whether it will work for your situation*? Those are different problems. Which one is it, and what would it take to resolve it?

**2.** You wrote a response to “what would you do if it failed.” Read it back. Does it describe specific actions, or does it describe intentions? Rewrite it with at least one action you could take in the first five minutes of discovering the failure.

**3.** The case study in this section shows that keeping code, hosting, and data in separate services made it easy to swap hosting without losing anything else. Look at your own project’s architecture as you understand it so far. Is there a single point of failure — one thing that, if it went away, would take everything with it?
