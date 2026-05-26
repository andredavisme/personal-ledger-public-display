# Section 4 — Your First File
## What a Web Page Actually Is

---

## Before You Write Anything

Before you create your first file, it is worth understanding what a web page actually is — because the answer is simpler than most people expect.

A web page is a text file. That is all. It is a plain text file written in a language called HTML that tells a browser how to display content. When you visit a website, your browser downloads that text file and reads it. The browser then draws what the file describes on your screen.

There is no magic. There is no binary. There is just a text file, a set of instructions, and a browser that knows how to follow them.

---

## HTML: A Language of Labels

HTML stands for HyperText Markup Language. The important word is *markup*. HTML does not program behavior — it labels content.

An HTML label looks like this:

```html
<p>This is a paragraph.</p>
```

The `<p>` at the start is an opening tag. The `</p>` at the end is a closing tag. Everything between them is the content. The tag tells the browser: *this content is a paragraph, treat it like one.*

That is the whole idea. Tags label content. Browsers read labels. Users see results.

---

## Creating Your First File

Open a plain text editor on your computer. Not a word processor like Microsoft Word — a plain text editor. On Windows, Notepad works. On Mac, TextEdit in plain text mode works. For this project, we recommend [Visual Studio Code](https://code.visualstudio.com) — it is free, and it is what professional developers use.

Create a new file. Type the following exactly:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My Community Ledger</title>
</head>
<body>
  <h1>Welcome</h1>
  <p>This is my community ledger.</p>
</body>
</html>
```

Save it as `index.html`.

Now open that file in a web browser. Drag it into a browser window, or right-click and choose *Open with*.

You have just created a web page.

> ### 💡 Help Your Future You — Write a Commit Message You'll Understand Later
> When you save a change to GitHub, you write a short message describing what you did. It is tempting to write something like `update` or `fix stuff`. Resist that. Write what you actually changed: `Add welcome heading to index.html` or `Fix typo in community description`. Six weeks from now, when you are trying to remember what changed and when, a clear message is the difference between finding it in seconds and searching for twenty minutes.

---

## What Each Part Means

- `<!DOCTYPE html>` — Tells the browser this is an HTML file
- `<html lang="en">` — The root of the page; `lang="en"` tells assistive technology the page is in English
- `<head>` — Information about the page that is not displayed to users (title, character set, links to stylesheets)
- `<meta charset="UTF-8" />` — Tells the browser to use the UTF-8 character set, which supports most languages
- `<title>` — The text that appears in the browser tab
- `<body>` — Everything the user actually sees
- `<h1>` — A first-level heading (the most important heading on the page)
- `<p>` — A paragraph

---

## Uploading to GitHub

Now that you have a working HTML file, let's put it in your repository.

1. Go to your `community-ledger` repository on GitHub
2. Click **Add file** → **Upload files**
3. Drag your `index.html` file into the upload area
4. At the bottom, write a short description: `Add index.html — first page`
5. Click **Commit changes**

Your file is now in GitHub. In the next section, we will connect GitHub to Netlify so this file becomes a live web page.

> ### 💡 Help Your Future You — Test Before You Push
> Before uploading any file to GitHub, open it in a browser first. A broken page that is only on your computer is easy to fix quietly. A broken page that is live on the internet — even one that only three people have visited — is a broken page your community could see. Make "open it locally first" a habit from day one.

---

## ✅ Concept Check — Section 4

*Write your responses in your own words.*

**1.** In your own words, describe what HTML is and what it does. Do not use the words "code" or "programming" — describe it as if it were a non-technical tool.

**2.** The `<head>` section contains information that is not displayed to users. Why would a page need information that users never see? What purpose does invisible information serve?

**3.** You created a file on your computer and opened it in a browser. Now it is also on GitHub. These are two different copies of the same file. What could go wrong if they get out of sync? How does GitHub help prevent that?

**4.** You wrote your first web page. Before reading ahead: what do you think needs to happen next for other people to be able to see this page? Describe the steps you imagine are required, without looking them up.
