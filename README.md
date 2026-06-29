# Avozea Agency Manager

A private internal control panel for running the Avozea website agency. It tracks clients, projects, outreach, retainers, pricing, processes, case studies, documents and settings.

The app is built as a React + Vite single-page application and connects directly to Supabase. It is designed for deployment on Vercel.

## What is included

- Password-gated login using `VITE_APP_PASSWORD`
- Fixed left sidebar and clean white SaaS-style UI
- Dashboard with live MRR, pipeline value, capital deployed, profit metrics, project warnings and pipeline stages
- Clients CRM with filters, detail pages, tabs, notes and linked projects/outreach/documents
- Projects tracker with deliverables checklist, completion %, timeline notes, documents and convert-to-retainer flow
- Outreach tracker with weekly 100-message target, monthly reply/call/conversion metrics and best-performing channel stats
- Retainers table with MRR summary, monthly update logging and stale retainer warnings
- Editable pricing package cards, pricing progression table and profit margin calculator
- SOP/process library with editable steps and default agency processes
- Case study tracker with before/after uploads, testimonials and publication checks
- Documents library with Supabase Storage uploads and Loom/external URL support
- Settings page for targets, agency details, pricing stage and Supabase status
- Local demo mode using browser localStorage when Supabase env variables are not set

## Local setup

```bash
npm install
npm run dev
```

The local default password is:

```text
avenzo
```

Set `VITE_APP_PASSWORD` to change this.

## Environment variables

Create a `.env.local` file locally, or add these in Vercel:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_APP_PASSWORD=your-private-password
```

Do not commit `.env` or `.env.local` to GitHub.

## Supabase setup

1. Create a new Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Confirm the `documents` storage bucket exists.
5. Copy your project URL and anon key into Vercel environment variables.

## Vercel deployment

Use these settings:

- Framework preset: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: project root

## GitHub notes

Commit source files only. Do not commit:

- `node_modules/`
- `dist/`
- `.env`
- `.env.local`

## Security note

This version follows the requested single-user password gate. The Supabase policies allow the frontend anon key to read/write the private app tables. That is fine for a private MVP, but a stricter future version should use Supabase Auth and user-based row-level security.
## Vercel install fix

This project includes `vercel.json`, `.npmrc` and a Node 20 engine pin so Vercel uses a stable install path. If Vercel ever shows `npm error Exit handler never called`, go to Project Settings → Build & Development Settings and set:

- Install Command: `npm ci --no-audit --no-fund`
- Build Command: `npm run build`
- Output Directory: `dist`

Then redeploy.

