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

Your file is now in GitHub. In the next section, Cloudflare Pages will detect the change and automatically publish the latest version of your site. Once it finishes deploying — usually within a minute — your page will be live at your `.pages.dev` URL.

> ### 💡 Help Your Future You — Test Before You Push
> Before uploading any file to GitHub, open it in a browser first. A broken page that is only on your computer is easy to fix quietly. A broken page that is live on the internet — even one that only three people have visited — is a broken page your community could see. Make "open it locally first" a habit from day one.

---

## ✅ Concept Check — Section 4

*Write your responses in your own words.*

**1.** In your own words, describe what HTML is and what it does. Do not use the words "code" or "programming" — describe it as if it were a non-technical tool.

**2.** The `<head>` section contains information that is not displayed to users. Why would a page need information that users never see? What purpose does invisible information serve?

**3.** You created a file on your computer and opened it in a browser. Now it is also on GitHub. These are two different copies of the same file. What could go wrong if they get out of sync? How does GitHub help prevent that?

**4.** You wrote your first web page. Before reading ahead: what do you think needs to happen next for other people to be able to see this page? Describe the steps you imagine are required, without looking them up.

---

## 🏁 Milestone 4 — Create, Open, Upload, and Verify

This milestone turns the theory into something real and visible. By the end of it, you will have a web page on the public internet that you made yourself.

Do each step in order. Do not skip ahead.

### Steps

**1. Create `index.html` on your computer**
- Open your text editor (Visual Studio Code, Notepad, or TextEdit in plain text mode)
- Type the HTML from the section above *by hand* — do not copy and paste it
- Typing it yourself forces you to read each line as you write it
- Save the file as `index.html` on your Desktop or in a folder you can find easily

**2. Open it in a browser**
- Find the file on your computer
- Drag it into an open browser window, or right-click it and choose **Open with → [your browser]**
- You should see a page with a large heading that says **Welcome** and a line below it
- If you see the raw HTML text instead of a formatted page, your file may have been saved with the wrong extension (`.txt` instead of `.html`) — rename it and try again

**3. Make one small change**
- Go back to your text editor
- Change the `<h1>` text from `Welcome` to the name of your community from `my-notes.md`
- Change the `<p>` text to one sentence describing what your community does
- Save the file
- Refresh the browser tab — you should see your changes immediately

> ### 💡 Help Your Future You — Refresh Is Your Best Friend
> While you are working on a file locally (on your computer, not yet uploaded to GitHub), every change is immediately visible when you refresh the browser. This is your fastest feedback loop. Use it constantly. If you change something and the page does not look right, refresh first before assuming something is broken.

**4. Upload `index.html` to GitHub**
- Go to your `community-ledger` repository on GitHub
- Click **Add file** → **Upload files**
- Drag your `index.html` file into the upload area
- In the commit message field, write: `Add index.html — community name and description`
- Click **Commit changes**

**5. Confirm Cloudflare Pages deployed it**
- Go to your Cloudflare dashboard → **Workers & Pages** → your project
- You should see a new deployment in progress or recently completed
- Once the status shows **Success**, click **Visit site** or open your `.pages.dev` URL
- You should see the same page you saw in your browser — but now it is live on the internet

**6. Record the milestone in `my-notes.md`**
- Open `my-notes.md` and add:

```
## Section 4 — My First File

### What I saw when I opened index.html locally
[Write one sentence describing what the page looked like.]

### What I changed
[Write what you put in the h1 and p tags.]

### My live URL
[Paste your .pages.dev URL here.]

### What surprised me
[Write one thing that was different from what you expected.]
```

---

## ✅ Milestone Concept Check — Section 4

*Answer these after completing the milestone steps above.*

**1.** You typed the HTML by hand instead of copying it. Did you notice anything while typing that you would have missed if you had pasted it? Was there anything you did not understand while typing?

**2.** You made a change to the file and refreshed the browser. The change appeared immediately. No upload. No deploy. Why do you think that is? What does it tell you about the difference between a file on your computer and a file on the internet?

**3.** Your page is now live at a public URL. Anyone in the world can visit it. What does that tell you about the responsibility you are taking on as you build out this application with real community data?
