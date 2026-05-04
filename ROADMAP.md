# GuitIQ Roadmap

> **Living document** — tracks post-MVP features, growth, and monetisation work.
> MVP is complete as of 2026-04-20. See `PLAN.md` for the full MVP build history.

---

## Guiding principles

- **Stay free to run** until there's revenue to justify costs
- **Don't break existing users** — anonymous localStorage-based flow always works
- **Auth is additive** — login enhances the experience, it's never a wall for core features
- **Ship phases in order** — each phase is independently valuable and shippable

---

## Phase 1 — Tip Jar 🪙
*Effort: ~1 hour | Cost: free | Risk: none*

Get a donation mechanism live before any other monetisation work. Validates that users value the app enough to pay voluntarily.

- [ ] Create a Ko-fi account at ko-fi.com (free, 0% fee on tips)
- [ ] Add a subtle "Support GuitIQ ☕" link to:
  - [ ] Landing page footer
  - [ ] Session Complete screen
- [ ] Style as a ghost/outline link — not a CTA competing with "Start Training"
- [ ] No code complexity — just a styled `<a>` tag

---

## Phase 2 — Vercel Analytics 📊
*Effort: ~30 min | Cost: free (built into Vercel Hobby) | Risk: none*

Understand how many people actually use the app before making any product decisions.

- [ ] Install `@vercel/analytics`
- [ ] Add `<Analytics />` to `src/app/layout.tsx`
- [ ] Gives: page views, unique visitors, top pages, referrers
- [ ] No cookies, GDPR compliant, no consent banner needed

**Stack:** Vercel Analytics (free tier)

---

## Phase 3 — Auth with Clerk 🔐
*Effort: ~half day | Cost: free up to 10k MAU | Risk: low*

Introduce optional sign-in. The app stays fully usable without an account — auth is the on-ramp to cloud sync (Phase 4), not a gate.

### Setup
- [ ] Create Clerk app at clerk.com, configure OAuth providers (Google, GitHub, Apple)
- [ ] Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` to `.env.local` and Vercel env vars
- [ ] Install `@clerk/nextjs`
- [ ] Wrap `src/app/layout.tsx` in `<ClerkProvider>`
- [ ] Add `src/middleware.ts` — all routes public by default, no forced login

### UI integration
- [ ] Add a subtle "Sign in to save progress across devices" nudge on:
  - [ ] Session Complete screen (after first session)
  - [ ] Progress page header
- [ ] User avatar / sign-out in session header when logged in
- [ ] No changes to anonymous flow — localStorage still works as today

**Stack:** Clerk (free ≤ 10k MAU, $25/mo after)

---

## Phase 4 — Cloud Progress Sync with Supabase ☁️
*Effort: ~1–2 days | Cost: free up to 500 MB | Risk: medium*

The payoff for auth — progress and streaks follow the user across devices.

### Schema
```sql
create table user_progress (
  clerk_user_id text primary key,
  note_stats    jsonb    default '{}',
  streak        integer  default 0,
  best_streak   integer  default 0,
  total_sessions integer default 0,
  updated_at    timestamptz default now()
);
```

### API routes
- [ ] `GET /api/progress` — return progress for authenticated user
- [ ] `POST /api/progress` — upsert progress for authenticated user
- [ ] Both routes validate Clerk session via `auth()` — unauthenticated requests return 401

### Store changes
- [ ] On login: pull from Supabase, merge with localStorage (take the higher streak/best_streak)
- [ ] On session complete: if logged in, push to Supabase in background (fire-and-forget)
- [ ] Logged-out users: unchanged — pure localStorage as today

**Stack:** Supabase (free: 500 MB DB, 2 GB egress/mo, unlimited API calls)

---

## Phase 5 — Internal Metrics Dashboard 📈
*Effort: ~half day | Cost: free | Risk: none*

Visibility into real gameplay data to inform product decisions.

- [ ] Add `/dev/metrics` page — gated to your Clerk user ID only (middleware check)
- [ ] Metrics to show:
  - [ ] Total registered users (Clerk dashboard API)
  - [ ] DAU / WAU (Supabase query on `updated_at`)
  - [ ] Average streak across all users
  - [ ] Most-missed notes (aggregate `note_stats` JSON)
  - [ ] Sessions completed total
- [ ] Vercel Analytics handles traffic metrics; Supabase handles gameplay metrics

---

## Phase 6 — Monetisation (Future) 💰
*When: after real user data shows demand | Cost: none until Stripe processes a payment*

Options in priority order:

### Option A: One-time unlock (~$9.99)
- Free: Easy + Medium difficulty across all challenge types
- Paid: Hard difficulty (accidentals, high frets, 7th/extended chords)
- Grandfathered: users who signed up before the cutoff get Hard free forever
- Implementation: Stripe Checkout, store `is_pro` flag on Supabase `user_progress`

### Option B: Subscription (~$3.99/mo or ~$29.99/yr)
- Same gating as Option A
- Better for recurring revenue; slightly more friction to convert

### Option C: Tip jar only (current path)
- No gating — everything stays free
- Revenue purely from voluntary support

> **Decision point:** revisit after Phase 5 metrics show real DAU. Don't gate anything until you have evidence users want to pay.

---

## Deferred / Nice-to-have

- **Melodic phrase challenges** — hear a short riff, find the notes in order
- **Speed mode** — timed challenges to build reaction speed
- **Custom session builder** — user picks challenge type mix and difficulty
- **Shareable progress cards** — image export of streak/stats for social sharing
- **PWA / offline mode** — service worker to cache audio samples
- **Native app** — Capacitor wrapper for App Store / Play Store

---

## Free-tier ceiling summary

| Service | Free limit | Likely ceiling |
|---|---|---|
| Vercel Hobby | 100 GB bandwidth/mo | ~100k MAU |
| Clerk | 10,000 MAU | Need ~$25/mo after |
| Supabase | 500 MB DB, 2 GB egress | Thousands of users |
| Ko-fi | Unlimited tips, 0% fee | Never |
| Stripe | No monthly fee, 2.9%+30¢/txn | Never (pay per transaction) |

> **Note:** Vercel Hobby prohibits commercial use. Upgrade to Pro (~$20/mo) before enabling paid features.
