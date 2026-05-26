# Road to Mooon — Project Contracts

Every agent working on this repo reads this file before writing code. These are the **invariants** — break one and you break a sibling PR.

For the detailed task list, see `docs/plans/road-to-mooon-v2.md`. This file is the short summary the plan derives from. If they disagree, **the plan is authoritative** — file an issue and update both.

---

## 1. Product

- **Name:** Road to Mooon (3 O's — intentional brand stylization, do not autocorrect)
- **Package name:** `road-to-mooon`
- **Repo, GitHub remote, Vercel project:** stay `sgbus` — only the brand changes
- **Scope:** Singapore commuting copilot — stop tracking + public transport routing + camera OCR + voice
- **Logo:** Lucide `Rocket` icon as placeholder until a custom asset is supplied

## 2. Tech stack (do not introduce alternatives without approval)

- Next.js 16 (App Router), React 19, TypeScript 5, Tailwind v4
- MapLibre GL via `react-map-gl/maplibre`
- Supabase (Postgres + Auth) — `@supabase/ssr`, `@supabase/supabase-js`
- Drizzle ORM (`drizzle-orm`, `drizzle-kit`), `postgres` driver
- OpenAI SDK (`openai`) for vision OCR, model **`gpt-4.1-mini`** (never `gpt-4o-mini` for vision — see `~/.claude/skills/ocr-speed-optimization/SKILL.md`)
- Web Speech API for voice input (browser native, no Whisper fallback in v2)
- OneMap (Singapore Land Authority) for public-transport routing + geocoding
- Validation: `zod`
- Icons: `lucide-react` only (no Heroicons or others)
- PWA service worker at `public/sw.js`

## 3. Next.js 16 trap (training-data wrong, fix every time)

```ts
// Route handler params is now a PROMISE
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;  // MUST await
}

// cookies() is now ASYNC
import { cookies } from "next/headers";
const store = await cookies();   // MUST await
```

Same applies to `headers()` and to `searchParams` in pages. Any route handler that does not `await params` will compile and crash at runtime. **Read `node_modules/next/dist/docs/01-app/...` for the area you're touching before writing code.**

## 4. Folder structure

```
src/
  app/
    api/
      arrivals/[code]/route.ts    # existing LTA proxy — do not touch
      auth/callback/route.ts      # PR 0
      device/bootstrap/route.ts   # PR 0
      favorites/route.ts          # PR 0
      journeys/route.ts           # PR 2
      migrate/route.ts            # PR 0
      route/route.ts              # PR 2  (OneMap routing)
      search/route.ts             # PR 2  (OneMap search)
      vision/route.ts             # PR 0 skeleton, PR 4 + 5 wire OCR
    favorites/                    # existing
    map/                          # existing — PR 1 extends MapView
    migrate-local/                # PR 0 — host the <Migrate /> client component
    nearby/                       # existing
    plan/                         # PR 2
    scan/                         # PR 4 + 5
    stop/[code]/                  # existing — PR 4 adds scanned banner
  components/
    BrandHeader.tsx               # PR 0
    VoiceMic.tsx                  # PR 3
    (existing components — preserve API)
  lib/
    db/
      schema.ts                   # PR 0 — schema is LOCKED below
      client.ts                   # PR 0 — server-only
    supabase/
      client.ts                   # PR 0 — browser
      server.ts                   # PR 0 — server-only
      middleware.ts               # PR 0
    onemap.ts                     # PR 2 — server-only
    openai-vision.ts              # PR 4 — server-only
    image-prep.ts                 # PR 4 — client-only
    bus-markers.ts                # PR 1
    speech.ts                     # PR 3 — client-only
    device.ts                     # PR 0 — client
    device-server.ts              # PR 0 — server-only
    rate-limit.ts                 # PR 0 — server-only
    favorites.ts                  # existing — PR 0 rewires to API
    types.ts                      # existing — PR 2 appends Itinerary types
    lta.ts                        # existing — do not modify
    stops.ts                      # existing
    distance.ts                   # existing — PR 5 reuses
    cn.ts                         # existing
    load.ts                       # existing
middleware.ts                     # PR 0 — repo root, NOT under src/
drizzle/                          # PR 0 — generated migrations
drizzle.config.ts                 # PR 0
```

`"use client"` and `import "server-only"` are MANDATORY discipline. Anything under `src/lib/{db,supabase/server,onemap,openai-vision,rate-limit,device-server}.ts` MUST start with `import "server-only";`. Anything browser-only (`device.ts`, `image-prep.ts`, `speech.ts`) starts with `"use client";`.

## 5. Database schema (locked — do not change without updating the plan)

Six tables. All FKs cascade on delete. Schema definition lives in `src/lib/db/schema.ts`; full Drizzle source in plan §"Drizzle schema (locked here)".

| Table | PK | Notes |
|---|---|---|
| `devices` | `id uuid` | `user_id uuid` nullable until Google sign-in |
| `favorites` | (`device_id`, `stop_code`) | migrated from localStorage on first run |
| `recent_searches` | `id uuid` | migrated from localStorage on first run |
| `recent_journeys` | `id uuid` | nullable `name` ⇒ anonymous; set ⇒ named preset |
| `scanned_history` | `id uuid` | `kind: "stop" \| "building"` |
| `device_vision_usage` | (`device_id`, `hour_bucket`) | rate-limit counter |

**Additive migrations only.** Renaming/dropping requires explicit user approval.

## 6. API contracts (locked)

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/api/arrivals/[code]` | – | `ArrivalsResponse` (existing) |
| POST | `/api/auth/callback` | OAuth `?code=` | 302 redirect |
| POST | `/api/device/bootstrap` | `{ device_id: uuid }` | `{ ok: true }` + sets `rtm.device.id` cookie |
| POST | `/api/migrate` | `{ device_id, favorites: string[], recents: string[] }` | `{ ok: true }` |
| GET  | `/api/favorites` | – | `{ codes: string[] }` |
| POST | `/api/favorites` | `{ stop_code, op: "add" \| "remove" }` | `{ ok: true }` |
| POST | `/api/route` | `{ from: GeoPoint \| string, to: GeoPoint \| string }` | `{ from, to, itineraries: Itinerary[] }` (top 3) |
| GET  | `/api/search` | `?q=...` | `{ results: { name, lat, lng }[] }` (top 5) |
| GET  | `/api/journeys` | – | `{ journeys: RecentJourney[] }` (last 10) |
| POST | `/api/journeys` | `{ name?: string, from, to, preview }` | `{ id }` |
| POST | `/api/vision` | `{ kind: "stop" \| "building", image_b64 }` | `kind=stop`: `{ stop_code, confidence }`. `kind=building`: `{ name, confidence, results: { name, lat, lng }[] }`. **429** `{ retry_after_seconds }` with `Retry-After` header on rate-limit. |

`GeoPoint`, `Itinerary`, `ItineraryLeg`, `LegMode` defined in `src/lib/types.ts` per plan §PR 2 Task 2.1.

## 7. Auth model

- **Anonymous-by-default.** First load: client generates UUID, stores in `localStorage["rtm.device.id"]`, posts to `/api/device/bootstrap` which inserts the `devices` row and mirrors the id into the `rtm.device.id` cookie (so server routes can read it without a header).
- **Optional Google sign-in.** When the user signs in, `auth.users.id` from Supabase is written to `devices.user_id`, linking the device to the user. Sibling devices can then `UPDATE devices SET user_id = ?` to merge into the same account.
- Server routes read the device id from the cookie via `readDeviceIdCookie()`. **Never trust a `device_id` from the request body** except in `/api/device/bootstrap` and `/api/migrate` (the only routes that exist to establish the cookie).

## 8. Rate limiting

- `/api/vision` is the only rate-limited route in v2.
- Limit: **50 successful calls per device per rolling hour bucket** (bucket truncated to the hour).
- On overage: HTTP 429 + `Retry-After` header = seconds until next bucket.
- **Increment only on success** (after the OpenAI call returns). The reservation pattern is documented in `src/lib/rate-limit.ts` via `checkVisionAllowed` (read-only) + `recordVisionUse` (write).

## 9. Image preprocessing

Client-side, before sending to `/api/vision`:
- Resize to 1280px longest edge
- JPEG quality 0.82
- EXIF stripped via canvas re-encode
- Helper: `blobToProcessedBase64` in `src/lib/image-prep.ts` (copied verbatim from the `ocr-speed-optimization` skill)

## 10. Environment variables

```
# Existing
LTA_ACCOUNT_KEY                # LTA DataMall

# PR 0
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # server-only, never imported into client bundles
DATABASE_URL                   # for Drizzle + server queries

# PR 2
ONEMAP_EMAIL
ONEMAP_PASSWORD

# PR 4
OPENAI_API_KEY
```

`.env.example` is updated with placeholders each PR. `.env.local` is the user's responsibility — never commit it.

## 11. Branching & PRs

- **Branch names:** `feat/<short-name>` per the plan. Wave 1: `feat/foundation-and-rebrand`. Wave 2: `feat/live-bus-markers`, `feat/onemap-routing`, `feat/stop-ocr`. Wave 3: `feat/voice-input`, `feat/building-ocr`.
- **Commits:** small atomic, conventional (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`).
- **PRs:** target `main`. Always open as ready (not draft) once the agent's verification gate passes. **Never auto-merge.**
- **Pre-merge gate (each PR's responsibility):**
  - `npm run lint` clean
  - `npx tsc --noEmit` clean
  - `npm run build` clean
  - Multi-agent review per auto-mode (code-reviewer + Explore + general-purpose UI/QA)
  - Security skill on PR 0, PR 4, PR 5 (auth, file upload, AI vision boundaries)
  - Performance skill on PR 1 (polling + rAF)

## 12. UI vocabulary (preserve)

- Background: `bg-zinc-950`, text: `text-zinc-100`
- Accent: `emerald-{300,400,500,600,700}`
- Cards: `border-zinc-900 bg-zinc-900/30` with hover `bg-zinc-900/60`
- Inputs follow existing `SearchInput.tsx` styling
- Icons: lucide-react only; new icons used in v2 = `Rocket`, `Mic`, `Camera`, `Route`, `Footprints`, `Bus`, `TramFront`, `MapPin`, `Navigation`
- Loaders: `Loader2` from lucide-react with `animate-spin`
- Existing components MUST keep their public API: `ArrivalCard`, `StopCard`, `BottomNav`, `StarButton`, `SearchInput`, `EmptyState`, `Countdown`, `FavoriteStop`, `RegisterSW`

## 13. Cross-PR collision rules

- **PR 1 and PR 5 both touch `src/app/map/MapView.tsx`.** PR 1 ships first (Wave 2 alongside PR 2 + 4); PR 5 rebases on top of PR 1 once it merges. The areas they touch are disjoint (PR 1: bus markers + popup; PR 5: external pin from searchParams), so the rebase is mechanical, not semantic.
- **PR 3 and PR 5 both depend on PR 2.** Both are Wave 3. They do not touch each other's files.
- **PR 4 and PR 5 both modify `src/app/api/vision/route.ts`.** PR 4 lands first (Wave 2); PR 5 rebases on top in Wave 3 and adds the `kind === "building"` branch.

## 14. Out-of-scope for v2 (do not build)

- Push notifications
- City-wide live bus map (polling all 5,072 stops)
- "Arrive by" routing, multi-stop journeys, taxi/Grab integration
- Fare card top-up
- Server-side image storage for OCR audit
- Analytics / tracking
- Sign-in-required mode (must always work anonymously)
