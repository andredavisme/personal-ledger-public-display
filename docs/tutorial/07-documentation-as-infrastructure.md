# Section 7 — Documentation as Infrastructure
## Building a Living Index of Everything You Know About Your Project

---

## The Problem This Solves

At some point in every project, someone — often you, three weeks from now — needs to find something.

Not the code. The *reason* the code exists. The decision that was made. The spec that explains what a table is for. The tutorial that shows how a feature was built.

If that information only lives in your memory or scattered across files you have to hunt through, it costs time every single time you need it. Worse, it costs *confidence* — you start to wonder if you are missing something you once knew.

This section introduces a practice called **documentation as infrastructure**: treating your project's knowledge base not as a pile of files, but as a structured, queryable database — built and maintained from the very beginning.

---

## What a Documentation Catalog Is

A documentation catalog is a database table that indexes every document in your project. Each record answers:

- **What is this document?** (`title`, `description`)
- **Where is it?** (`url`, `file_path`)
- **What kind of document is it?** (`doc_type`)
- **What does it belong to?** (`category`)
- **What topics does it cover?** (`tags`)
- **Is it still accurate?** (`status`)
- **When was it last reviewed?** (`last_reviewed`)

This makes your documentation searchable with a SQL query instead of a folder browse. It also makes it *visible* — you cannot forget a document exists if it is in a table.

---

## The Table Structure

This project uses a table called `public.documentation_catalog`. Here is what each column does:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Unique identifier |
| `title` | text | Short, clear document name |
| `description` | text | One sentence on what this doc covers |
| `url` | text | Direct link to the document (GitHub URL) |
| `file_path` | text | Relative path in the repository |
| `doc_type` | text | `tutorial`, `architecture`, `reference`, `handoff`, `template` |
| `category` | text | Grouping label: `onboarding`, `setup`, `design`, `features`, `operations`, `methodology` |
| `tags` | text[] | Array of searchable topic keywords |
| `status` | text | `current`, `needs_update`, `deprecated` |
| `last_reviewed` | date | When the content was last confirmed accurate |
| `created_at` | timestamptz | Auto-set on insert |
| `updated_at` | timestamptz | Auto-updated on every change |

---

## Creating the Table

Run this migration in your Supabase project. You can paste it directly into the Supabase SQL Editor, or use an AI assistant to run it for you.

```sql
CREATE TABLE IF NOT EXISTS public.documentation_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  url text NOT NULL,
  file_path text,
  doc_type text NOT NULL,
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'current',
  last_reviewed date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doc_type_check
    CHECK (doc_type IN ('tutorial', 'architecture', 'reference', 'handoff', 'template')),
  CONSTRAINT status_check
    CHECK (status IN ('current', 'needs_update', 'deprecated'))
);

-- Auto-update updated_at on every change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER documentation_catalog_updated_at
  BEFORE UPDATE ON public.documentation_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: anyone can read, only authenticated admins can write
ALTER TABLE public.documentation_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_docs" ON public.documentation_catalog
  FOR SELECT TO anon USING (true);

CREATE POLICY "auth_all_docs" ON public.documentation_catalog
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## Seeding Your First Record

You should add a record every time you create a new document. Here is an example insert:

```sql
INSERT INTO public.documentation_catalog
  (title, description, url, file_path, doc_type, category, tags, status, last_reviewed)
VALUES (
  'Project Reference',
  'Live URLs, GitHub repo, Supabase project info, key tables, edge functions, and open items.',
  'https://github.com/YOUR_USERNAME/YOUR_REPO/blob/main/docs/project-reference.md',
  'docs/project-reference.md',
  'reference',
  'operations',
  ARRAY['reference', 'urls', 'supabase', 'github', 'credentials'],
  'current',
  CURRENT_DATE
);
```

Replace `YOUR_USERNAME` and `YOUR_REPO` with your actual GitHub values.

> ### 💡 Help Your Future You — Seed As You Go
> The best time to add a document to the catalog is the moment you create it — not after a session ends, not "later this week". The longer you wait, the more likely you are to forget the document exists at all. Treat the catalog insert as the last step of creating any new file, the same way you treat saving before closing.

---

## Useful Queries

Once your catalog is seeded, you can query it like any other table.

**All architecture documents:**
```sql
SELECT title, url FROM public.documentation_catalog
WHERE doc_type = 'architecture'
ORDER BY title;
```

**Documents that need updating:**
```sql
SELECT title, url, last_reviewed FROM public.documentation_catalog
WHERE status = 'needs_update'
ORDER BY last_reviewed ASC;
```

**Find anything tagged with a topic:**
```sql
SELECT title, url FROM public.documentation_catalog
WHERE tags @> ARRAY['donations']
ORDER BY title;
```

**All tutorial sections in order:**
```sql
SELECT title, url FROM public.documentation_catalog
WHERE doc_type = 'tutorial'
ORDER BY file_path;
```

**Everything touched this week:**
```sql
SELECT title, status, updated_at FROM public.documentation_catalog
WHERE updated_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY updated_at DESC;
```

---

## Keeping the Catalog Accurate

The catalog is only useful if it reflects reality. Three habits keep it healthy:

1. **Add a record when you create a document.** Do not batch this up.
2. **Set `status = 'needs_update'` when you know something has changed but have not updated the doc yet.** This is better than letting stale docs silently mislead you.
3. **Update `last_reviewed` when you read a document and confirm it is still accurate.** Even if nothing changed.

At the start of any new work session, run the "documents that need updating" query above. It is a fast way to orient yourself and close gaps before they become problems.

---

## Why This Matters for Non-Technical Teams

Most of the people who will benefit from this application are not developers. If a community administrator or a volunteer needs to understand how something works, they should be able to find the answer without asking a developer.

The documentation catalog makes that possible. It is the table of contents for everything your project knows about itself.

This is not a convenience. For a community project that may be handed off, contributed to by multiple people, or revisited after months of inactivity, it is infrastructure — as essential as the database tables that store the financial data.

---

## A Lesson From This Project

The documentation catalog for this project was built *after* several documents already existed. The result was that during early sessions, documents had to be hunted down, their purposes re-explained, and gaps between what was planned and what was built were discovered by accident rather than by design.

Building the catalog from the first session would have prevented that entirely. Every time an architecture decision was made, it would have been immediately findable. Every time a tutorial section was updated, the catalog would have shown it.

You are reading this now so you can start with the catalog in place, rather than adding it as an afterthought.

---

## ✅ Concept Check — Section 7

*Write your responses in your own words.*

**1.** Imagine you take a two-week break from this project and then come back. What is the first query you would run against the documentation catalog, and why?

**2.** The catalog has a `status` column with values `current`, `needs_update`, and `deprecated`. In your own words, describe a real situation that would cause you to set each one of those values.

**3.** Why does the catalog use a database table instead of just a README file that lists all the documents?

**4.** The tutorial says "treat the catalog insert as the last step of creating any new file." What habit or reminder system would you personally use to make sure you actually do that?
