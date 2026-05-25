# Section 3 — Thinking With AI
## How to Communicate With a Tool That Translates Your Intent

---

## What Actually Happens When You Use AI

When you type a message to an AI assistant, something specific happens that is easy to overlook:

Your message is a description of what you want. The AI translates that description into a plan. That plan is executed through a series of actions. Those actions produce an artifact — a file, a piece of code, a document, a database record.

That artifact is not your idea. It is the result of your idea passing through several translation layers. Each layer introduces the possibility of drift — small differences between what you meant and what was produced.

This is not a flaw. It is the nature of any tool that operates on language. A carpenter who describes a cabinet to a builder will get a cabinet that reflects the builder's interpretation of the description, not a perfect copy of the mental image. The quality of the outcome depends heavily on the quality of the communication.

---

## The Translation Chain

Here is what happens between your intent and the artifact you receive:

```
Your intent
    ↓
Your message (natural language)
    ↓
AI interpretation (what it understood)
    ↓
AI plan (what it decided to do)
    ↓
Actions taken (code written, files created, database changed)
    ↓
Artifact produced (the actual result)
```

At every arrow in that chain, something can shift. The most common place drift happens is between **your intent** and **your message**. Most people communicate less precisely than they think they do, especially when describing something they only partially understand yet.

This is not a criticism. It is an invitation. The more clearly you can articulate what you want — including the *why* behind it — the less drift accumulates through the chain.

---

## What a Good Instruction Looks Like

There is a difference between these two instructions:

> *"Connect the form to the database."*

and

> *"Connect the intake form so that when a user submits it, the data from the form fields and the three uploaded CSV files is saved to the database. The CSV files should be parsed and stored as individual rows, not as raw files. The form should show a success message when it works and an error message when it does not."*

Both ask for the same thing. But the second one leaves far less room for interpretation. It describes the inputs, the expected behavior, the data structure preference, and the feedback states. An AI working from the second instruction will produce something much closer to what you actually wanted.

Notice that the second instruction does not require technical knowledge. It requires clarity about what the system should do from the perspective of someone using it.

**You do not need to know how to code to communicate well with an AI. You need to know what you want the system to do.**

---

## Sequencing: Why Order Matters

One of the most important decisions in building a system is the order in which you build it.

This is not a technical decision. It is a logical one, and it applies to almost everything in life.

Consider what happened in this project. We had two things to connect to the database:

1. The intake form — where the public submits community information
2. The administration page — where an admin reviews and acts on submissions

We connected the intake form first. Why?

Because the administration page works with data. If there is no data, there is nothing for the administration page to do. Connecting the administration page first would have meant building and testing a system whose only function is to act on things that do not exist yet.

This is a pattern worth remembering:

> **You cannot do anything useful with data that doesn't exist. Verify you can collect data and understand what it looks like before you build the system that acts on it.**

This principle applies far beyond software. Before you train volunteers to sort donations, make sure donations are actually arriving. Before you design a reporting system for your community ledger, make sure the ledger is being filled in.

---

## The Artifact Is Not the Goal

When you ask an AI to create something and it does, the artifact it produces — the file, the page, the database table — is not the goal. It is evidence that an action was taken. The goal is what that artifact enables.

This distinction matters because it changes how you evaluate what you receive.

If you evaluate an artifact by asking *"did the AI do what I asked?"* you will often answer yes and move on. But if you evaluate it by asking *"does this do what I actually need it to do, in the context of the whole system?"* you will catch problems earlier and understand the work more deeply.

The difference between a student who builds a web application and a student who understands the web application they built is this question.

---

## A Habit to Develop

After every significant AI-assisted action in this tutorial, pause and ask:

1. **What did I ask for?**
2. **What was produced?**
3. **Is what was produced what I actually needed — in context?**
4. **What would break if this step had been done in a different order?**

These four questions will do more for your understanding of how systems are built than any amount of reading about code.

---

## ✅ Concept Check — Section 3

*Write your responses in your own words.*

**1.** Draw or describe the translation chain in your own words. Where do you think the most drift is most likely to happen, and why?

**2.** Rewrite this instruction to make it more precise: *"Make the admin page show the submissions."* Do not add technical details — add clarity about what the system should do and when.

**3.** In this project, we connected the intake form before the administration page. Describe a situation from your own life — outside of software — where sequencing tasks in the wrong order caused a problem. What was the cost of doing things out of order?

**4.** The section says: *"The artifact is not the goal."* What does that mean to you? Can you think of a time when completing a task felt satisfying even though the purpose behind the task was not actually served?
