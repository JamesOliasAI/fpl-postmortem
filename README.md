# FPL Post-Mortem ⚽

A free, brutally honest Fantasy Premier League season report. Enter your Team ID
→ see the points you left on your bench, what your −4 hits cost you, and whether
you played the template. The free tool is the **validation vehicle + viral
distribution engine** for a paid AI FPL assistant (see `ROADMAP.md`).

Built with Next.js (App Router) + Tailwind, deployed on Vercel. Uses the public
FPL API (no auth). Capture via Supabase + Stripe Payment Links.

---

## What it does
- `/` — landing page, Team ID input
- `/r/[teamId]` — server-rendered season post-mortem + share button + conversion block
- `/r/[teamId]/opengraph-image` — auto-generated shareable PNG card (the viral unit)
- `/api/waitlist` — captures email signups + paid-CTA click intent

## Validation we're running
The free report is the bait. The results page pitches a £5/mo (or £35/season)
AI assistant via **Stripe pre-order** (hard signal) + an **email waitlist**
(soft signal). **Pass = 25+ real paid commitments.** Only then do we build the
paid product.

---

## Deploy (one-time)

### 1. Push to GitHub
```bash
git add -A
git commit -m "feat: FPL post-mortem validation MVP"
git remote add origin https://github.com/<you>/fpl-postmortem.git
git branch -M main
git push -u origin main
```

### 2. Import to Vercel
- vercel.com → **Add New → Project → Import** your `fpl-postmortem` repo.
- Framework preset auto-detects **Next.js**. Click **Deploy**.
- It goes live at `https://<project>.vercel.app`. The free post-mortem works
  immediately — no env vars required.

### 3. (Enable money capture) Stripe Payment Links
- Stripe Dashboard → **Payment Links → Create**:
  - Link A: recurring **£5 / month** product.
  - Link B: one-off (or yearly) **£35 / season** product.
- Copy each link's URL. In Vercel → Settings → Environment Variables, add:
  - `NEXT_PUBLIC_STRIPE_MONTHLY_URL` = link A
  - `NEXT_PUBLIC_STRIPE_SEASON_URL` = link B
- Redeploy. The pre-order buttons now take real money.

### 4. (Enable email list) Supabase
- supabase.com → **New project** (free).
- SQL Editor → run:
  ```sql
  create table waitlist (
    id bigint generated always as identity primary key,
    email text,
    team_id text,
    kind text not null default 'email',
    created_at timestamptz not null default now()
  );
  ```
- Project Settings → API → copy **Project URL** + **service_role key**.
- In Vercel env vars, add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`. Redeploy.

### 5. Custom domain (optional, only after it validates)
Add a domain in Vercel → Settings → Domains, and update `NEXT_PUBLIC_SITE_URL`.

---

## Local dev
```bash
npm install
cp .env.example .env.local   # fill in if testing capture locally
npm run dev                  # http://localhost:3000
```

## Metrics to watch (pass/fail)
| Signal | Where | Pass |
|---|---|---|
| Post-mortems run | Vercel analytics / server logs | 500+ / 2 weeks |
| Paid-CTA clicks | `waitlist` table, kind=`click_*` | 8%+ of visitors |
| **Real pre-orders** | **Stripe dashboard** | **25+ (the decision metric)** |
| Email signups | `waitlist` table, kind=`email` | bonus launch list |
