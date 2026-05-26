# Road to Mooon — Handoff

You're picking up this project at the **planning-complete, code-not-started** mark. The current `main` is the initial sgbus build (3 commits: initial, snapshot popup wrap fix, rainbow neon title gradient). Nothing has been built for v2 yet.

## What this PR adds

- `docs/plans/road-to-mooon-v2.md` — the full implementation plan: goal, success criteria, schema, API contracts, 6 PRs broken into bite-sized tasks
- `contracts.md` — the shared invariants every contributor reads first: tech stack, folder structure, env vars, schema, API contracts, Next.js 16 traps, branch rules
- `HANDOFF.md` — this file

No code, dependencies, or migrations have been touched yet. Merging this PR only adds documentation.

## What "Road to Mooon" is

Renaming `sgbus` (current Singapore bus tracker) → **Road to Mooon** (3 O's — intentional) and growing it into a Singapore commuting copilot. Five new capabilities:

1. **OneMap public-transport routing** — Google-Maps-style from/to itineraries with bus + MRT legs
2. **Live bus markers on the map** for the selected stop (LTA returns the GPS, today's app just doesn't render it)
3. **Camera capture of a bus stop pole** — OpenAI vision OCR resolves the 5-digit code, loads arrivals
4. **Camera capture of a building** — OCR + OneMap geocode + walking distance + cross-link into the routing flow
5. **Voice input** on the routing destination field (Web Speech API)

Plus DB persistence (Supabase Postgres + anonymous device IDs upgradeable via Google sign-in) so favorites and recent journeys survive across devices once a user signs in.

## Where to start

1. Read `contracts.md` (~10 min). It's short.
2. Read `docs/plans/road-to-mooon-v2.md` (~30 min). Start with the "Wave + PR table" then read PR 0 in full.
3. Decide whether to keep the 3-wave dispatch model (1 sequential agent then 3 parallel then 2 parallel) or just work through PR 0 → 5 yourself in order. The plan is structured so a single human can execute it sequentially without losing anything.

## Prerequisites you must set up before PR 0 work begins

1. **Supabase project** — create one at supabase.com.
   - Enable Google provider in Authentication → Providers.
   - Set redirect URLs: `http://localhost:3000/api/auth/callback` and your Vercel production URL.
2. **Google OAuth credentials** in Supabase: client id + secret from Google Cloud Console.
3. **`.env.local`** in repo root (do not commit) — full list in `contracts.md` §10. Minimum to start PR 0:
   ```
   LTA_ACCOUNT_KEY=...                  # already needed before
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   DATABASE_URL=postgres://...          # disable pooling for migrations
   ```
4. **Vercel env vars** — same values, set in the Vercel dashboard so preview deploys work.
5. **OneMap developer account** at developers.onemap.sg — required before PR 2 (routing). Free, ~5 min: register, confirm email, save email + password for `ONEMAP_EMAIL` / `ONEMAP_PASSWORD`.
6. **OpenAI API key** — required before PR 4 (camera OCR). Drop into `OPENAI_API_KEY`.

## Things easy to get wrong

- **Next.js 16 broke `params` and `cookies()`** — both are now Promises. Every route handler `await`s them. See `contracts.md` §3 and `AGENTS.md`. Read `node_modules/next/dist/docs/` for the area you're touching before writing code; do not rely on training-data or pre-Next-15 examples.
- **Use `gpt-4.1-mini` for vision OCR, NOT `gpt-4o-mini`.** The latter inflates image tokens ~10× and stalls. See `~/.claude/skills/ocr-speed-optimization/SKILL.md`.
- **OneMap auth tokens expire every ~3 days.** The plan's `src/lib/onemap.ts` caches a token in serverless function memory and re-fetches on expiry.
- **Migrations are additive only.** No drops, no renames without explicit owner approval — see the plan's rollback notes.

## Repo state at handoff

- Branch: `main` is at `08764d4 feat: rainbow neon title gradient`
- Remote: `https://github.com/yueqin02/sgbus.git`
- Vercel: deploys from `main`
- LTA key: existing one in `.env.local` still works; not committed

Good luck. The plan is thorough enough that you should be able to execute every step without re-deriving any decisions.
