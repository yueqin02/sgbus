# Road to Mooon — v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `sgbus` → **Road to Mooon** and turn the app from a "stop tracker" into a Singapore commuting copilot. Ship in 6 staged PRs across 3 dependency waves: live bus markers, OneMap public-transport routing, camera OCR for stops + buildings, and voice destination input.

**Architecture:** Next.js 16 App Router + React 19 PWA, Tailwind v4, MapLibre GL. New persistence layer: **Supabase Postgres + Drizzle ORM** with anonymous-by-default device IDs and optional Google sign-in. Three new server routes proxy OneMap and OpenAI. Image preprocessing happens client-side.

**Tech Stack:** Next.js 16.2.6, React 19.2.4, Tailwind v4, MapLibre GL 5.24, `@supabase/supabase-js`, `@supabase/ssr`, `drizzle-orm`, `drizzle-kit`, `postgres` (driver), `openai` (SDK), `lucide-react`, Web Speech API.

---

## Confirmed brand + scope

- **App name:** "Road to Mooon" (3 O's — intentional brand stylization, do not autocorrect)
- **Package name:** `road-to-mooon`
- **Repo, GitHub remote, Vercel project name:** stay `sgbus` (renaming the repo is friction with no value; the brand and the manifest change)
- **Logo:** Lucide `Rocket` placeholder until user supplies a custom asset. PWA icons regenerate when real asset lands.

## Success criteria

- [ ] Header reads "Road to Mooon" with a Rocket icon; every visible `sgbus` reference replaced
- [ ] Supabase auth round-trip works (anonymous bootstrap + Google upgrade)
- [ ] localStorage favorites and recent searches migrate into DB on first run, then read from DB on subsequent loads
- [ ] `/api/vision` returns 429 with `Retry-After` when a device exceeds 50 calls in a rolling hour
- [ ] `/map` shows animated bus markers for a selected stop; tapping a marker shows service + load
- [ ] `/plan` accepts a from/to (GPS or typed), returns top 3 itineraries with stacked-leg preview
- [ ] Voice mic in `/plan` destination input fills the field via Web Speech API
- [ ] Camera capture of a bus stop pole resolves to a stop code and loads its arrivals
- [ ] Camera capture of a building resolves via OneMap and renders a pin with walking distance + "Plan a trip here" link
- [ ] `npm run lint`, `npx tsc --noEmit`, and `npm run build` are clean before any PR is opened

## Non-goals (v2)

- Push notifications, city-wide live bus map, "arrive-by" routing, MRT-only or taxi modes, fare card integration, multi-stop journeys, image storage for OCR audit, analytics.

---

## Critical environment facts (read once, apply throughout)

### Next.js 16 route handler signature

`src/app/api/arrivals/[code]/route.ts` already uses the Next 16 form. **Every new route handler in this plan must match it.** Wrong patterns from training data will compile but fail at runtime.

**Correct (Next 16):**
```ts
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;   // ← await is mandatory in 16
  // ...
}
```

`params` is now a Promise. Synchronous access breaks at runtime. Same applies to `searchParams` in pages.

**Before writing any route handler**, read `node_modules/next/dist/docs/01-app/03-api-reference/01-functions/route-handlers.mdx` (or the closest available filename — list the dir first). Do NOT write from training data.

### Existing patterns to preserve

- `src/lib/lta.ts` is the LTA proxy. Lat/lng come back as `string`; `lta.ts` already coerces to `number` via `parseFloat`. Zero values mean "no GPS yet" — filter them out before rendering.
- `src/lib/types.ts` defines `NextBus`, `ArrivingService`, `ArrivalsResponse`, `BusStop`. Reuse, do not duplicate.
- `src/lib/favorites.ts` uses `useSyncExternalStore` against localStorage key `sgbus.favorites.v1`. PR 0 must read this key during migration.
- `src/components/ArrivalCard.tsx`, `StopCard.tsx`, `BottomNav.tsx`, `StarButton.tsx` are the layout vocabulary. New screens reuse these.
- Map uses CARTO Dark Matter raster tiles, emerald accent palette (`emerald-300/400/500/600/700`). Keep palette consistent.
- Service worker `public/sw.js` registered via `<RegisterSW />`. Cache version bump on rename.

### Env vars after this build

```bash
# Existing
LTA_ACCOUNT_KEY=...

# PR 0 adds
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # server-only, never imported into client
DATABASE_URL=postgres://...       # for Drizzle migrations + server queries

# PR 2 adds
ONEMAP_EMAIL=...
ONEMAP_PASSWORD=...

# PR 4 adds
OPENAI_API_KEY=...
```

`.env.example` is updated each PR; the actual `.env.local` is the user's responsibility.

---

## Wave + PR table

| Wave | Parallel? | PRs | Branches | Wall-clock |
|---|---|---|---|---|
| 1 | No (1 agent) | PR 0 | `feat/foundation-and-rebrand` | ~1.5d |
| 2 | Yes (3 agents) | PR 1, PR 2, PR 4 | `feat/live-bus-markers`, `feat/onemap-routing`, `feat/stop-ocr` | ~2d (longest = PR 2) |
| 3 | Yes (2 agents) | PR 3, PR 5 | `feat/voice-input`, `feat/building-ocr` | ~1d |

PR 3 cannot start until PR 2 merges (voice goes into `/plan` destination input).
PR 5 cannot start until PR 2 merges ("Plan a trip here" cross-link goes into `/plan`).

---

## Per-PR file inventory

### PR 0 — Foundation
**Creates:** `drizzle.config.ts`, `drizzle/0000_init.sql`, `src/lib/db/schema.ts`, `src/lib/db/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`, `src/lib/device.ts`, `src/lib/rate-limit.ts`, `src/app/api/vision/route.ts` (skeleton), `src/components/BrandHeader.tsx`, `middleware.ts` (Next 16 root), `src/app/api/auth/callback/route.ts`, `src/app/migrate-local/Migrate.tsx`.
**Modifies:** `package.json`, `src/app/layout.tsx`, `src/lib/favorites.ts`, `src/components/SearchInput.tsx` (recent searches now reads/writes DB via API), `public/manifest.webmanifest`, `next.config.ts`, `.env.example`.

### PR 1 — Live bus markers
**Modifies:** `src/app/map/MapView.tsx` only.
**Creates:** `src/lib/bus-markers.ts` (interpolation helper).

### PR 2 — OneMap routing
**Creates:** `src/app/plan/page.tsx`, `src/app/plan/PlanForm.tsx`, `src/app/plan/ResultCard.tsx`, `src/app/plan/RecentJourneys.tsx`, `src/lib/onemap.ts`, `src/app/api/route/route.ts`, `src/app/api/search/route.ts`, `src/app/api/journeys/route.ts`.

### PR 3 — Voice input
**Creates:** `src/lib/speech.ts`, `src/components/VoiceMic.tsx`.
**Modifies:** `src/app/plan/PlanForm.tsx` (mounts `VoiceMic` inside destination input).

### PR 4 — Stop OCR
**Creates:** `src/lib/openai-vision.ts`, `src/lib/image-prep.ts`, `src/app/scan/page.tsx`, `src/app/scan/StopScanner.tsx`.
**Modifies:** `src/app/page.tsx` (adds the `+` scan button), `src/app/api/vision/route.ts` (adds `kind: 'stop'` handling).
**Note:** there is no `/api/scan` route — all OCR goes through `/api/vision`.

### PR 5 — Building OCR
**Creates:** `src/app/scan/BuildingScanner.tsx`, `src/app/scan/results/page.tsx`.
**Modifies:** `src/app/scan/page.tsx` (adds "Scan a building" mode toggle), `src/app/api/vision/route.ts` (adds `kind: 'building'` handling), `src/app/map/MapView.tsx` (reads `?pin_lat=…&pin_lng=…` searchParam for external pin).

---

## Drizzle schema (locked here, do not invent fields per-PR)

```ts
// src/lib/db/schema.ts
import { pgTable, uuid, text, timestamp, integer, jsonb, primaryKey, index } from "drizzle-orm/pg-core";

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey(),                              // client-generated UUID v4
  userId: uuid("user_id"),                                  // null until Google sign-in
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const favorites = pgTable(
  "favorites",
  {
    deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
    stopCode: text("stop_code").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.deviceId, t.stopCode] }) }),
);

export const recentSearches = pgTable(
  "recent_searches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ byDevice: index("recent_searches_device_idx").on(t.deviceId, t.createdAt) }),
);

export const recentJourneys = pgTable(
  "recent_journeys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
    name: text("name"),                                     // null = anonymous auto-save, set = named preset
    fromLabel: text("from_label").notNull(),
    fromLat: text("from_lat").notNull(),                    // text to preserve OneMap precision
    fromLng: text("from_lng").notNull(),
    toLabel: text("to_label").notNull(),
    toLat: text("to_lat").notNull(),
    toLng: text("to_lng").notNull(),
    preview: jsonb("preview"),                              // cached top-1 itinerary stacked legs
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ byDevice: index("recent_journeys_device_idx").on(t.deviceId, t.createdAt) }),
);

export const scannedHistory = pgTable(
  "scanned_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["stop", "building"] }).notNull(),
    detectedValue: text("detected_value").notNull(),       // e.g. "83139" or "Plaza Singapura"
    resolvedStopCode: text("resolved_stop_code"),          // populated for kind=stop
    resolvedLat: text("resolved_lat"),                     // populated for kind=building
    resolvedLng: text("resolved_lng"),
    confidence: integer("confidence"),                     // 0–100
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ byDevice: index("scanned_history_device_idx").on(t.deviceId, t.createdAt) }),
);

export const deviceVisionUsage = pgTable(
  "device_vision_usage",
  {
    deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
    hourBucket: timestamp("hour_bucket", { withTimezone: true }).notNull(), // truncated to the hour
    count: integer("count").notNull().default(0),
  },
  (t) => ({ pk: primaryKey({ columns: [t.deviceId, t.hourBucket] }) }),
);
```

All migrations are **additive only**. Renaming or dropping requires explicit user approval (auto-mode rule).

---

## API contracts (locked)

### Existing (unchanged)
- `GET /api/arrivals/[code]` → `ArrivalsResponse`

### PR 0
- `POST /api/auth/callback` — Supabase OAuth callback (Google) → 302 redirect to `?next=` or `/`
- `POST /api/device/bootstrap` — body `{ device_id: uuid }` → `{ ok: true }`. Side effect: inserts the `devices` row and sets cookie `rtm.device.id`. Only route that trusts a body-supplied device_id (this is how the cookie gets established in the first place).
- `POST /api/migrate` — body `{ device_id: uuid, favorites: string[], recents: string[] }` → `{ ok: true }`. Bulk-imports a device's localStorage payload exactly once. Idempotent via the `favorites` PK + a client-side `rtm.migrate.v1.done` flag.
- `GET  /api/favorites` → `{ codes: string[] }` (this device's favorited stop codes)
- `POST /api/favorites` — body `{ stop_code: string, op: "add" | "remove" }` → `{ ok: true }`
- `POST /api/vision` — **rate-limit only in PR 0**. Returns 501 "not implemented" for any `kind` until PR 4 wires it up. **Increment is success-only** (see Task 0.11): the route calls `checkVisionAllowed(deviceId)` first; if not allowed, returns 429 with `Retry-After`; otherwise returns 501 *without* recording the call. PR 4 will add `recordVisionUse(deviceId)` only after a successful OpenAI response.

### PR 2
- `POST /api/route` — body `{ from: GeoPoint | string, to: GeoPoint | string }` → `{ from: GeoPoint, to: GeoPoint, itineraries: Itinerary[] }` (top 3, by total time)
- `GET  /api/search?q=...` — OneMap address search → `{ results: { name, lat, lng }[] }` (top 5)
- `GET  /api/journeys` — returns this device's last 10 `recent_journeys`
- `POST /api/journeys` — body `{ name?: string, from: GeoPoint, to: GeoPoint, preview: Itinerary }` → `{ id }`

### PR 4 / PR 5
- `POST /api/vision` — body `{ kind: "stop" | "building", image_b64: string }` → for `stop`: `{ stop_code: string | null, confidence: number }`; for `building`: `{ name: string | null, confidence: number, results: { name, lat, lng }[] }`. Body ≤ 4 MB (Vercel hard cap; preprocessing must keep payload well under this).

`Itinerary`, `ItineraryLeg`, `LegMode`, and `GeoPoint` shapes pinned in `src/lib/types.ts` (defined in PR 2 Task 2.1).

---

# PR 0 — Foundation & rebrand

**Branch:** `feat/foundation-and-rebrand`
**Reads first:**
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/index.mdx`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.mdx`
- `node_modules/next/dist/docs/01-app/02-guides/authentication.mdx` (if present)
- Supabase docs are vendor docs — use the `context7` plugin if uncertain about `@supabase/ssr` API; do not rely on training-data syntax.

### Task 0.1: Install dependencies

**Files modified:** `package.json`, `package-lock.json`

- [ ] **Step 1:** Run
```bash
cd ~/GitHub/sgbus
npm install @supabase/supabase-js @supabase/ssr drizzle-orm postgres openai zod
npm install -D drizzle-kit @types/pg
```

- [ ] **Step 2:** Verify lockfile updated and no peer warnings beyond pre-existing.

- [ ] **Step 3:** Commit
```bash
git add package.json package-lock.json
git commit -m "chore(deps): add supabase, drizzle, openai, zod for v2"
```

### Task 0.2: Drizzle config + schema file

**Files created:** `drizzle.config.ts`, `src/lib/db/schema.ts`

- [ ] **Step 1:** Create `drizzle.config.ts`:
```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
```

- [ ] **Step 2:** Create `src/lib/db/schema.ts` — paste the schema from the "Drizzle schema (locked here)" section above. Verbatim.

- [ ] **Step 3:** Generate migration
```bash
npx drizzle-kit generate --name=init
```
Expected: a `drizzle/0000_init.sql` is created.

- [ ] **Step 4:** Commit
```bash
git add drizzle.config.ts src/lib/db/schema.ts drizzle/
git commit -m "feat(db): drizzle schema + init migration (5 tables)"
```

### Task 0.3: Apply migration to Supabase

**No code changes. Verification only.**

- [ ] **Step 1:** Confirm `DATABASE_URL` is set in `.env.local` (Supabase → Project Settings → Database → Connection string, "Use connection pooling" disabled for migrations).
- [ ] **Step 2:** Run
```bash
npx drizzle-kit push
```
Expected: tables created, no errors.

- [ ] **Step 3:** In Supabase SQL editor verify all 6 tables present (`devices`, `favorites`, `recent_searches`, `recent_journeys`, `scanned_history`, `device_vision_usage`).

### Task 0.4: DB client (server-only)

**Files created:** `src/lib/db/client.ts`

- [ ] **Step 1:** Create:
```ts
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const client = postgres(url, { prepare: false });
export const db = drizzle(client, { schema });
```

- [ ] **Step 2:** Commit
```bash
git add src/lib/db/client.ts
git commit -m "feat(db): server-only drizzle client"
```

### Task 0.5: Supabase server/client/middleware helpers

**Files created:** `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`

> **Note for agent:** the exact `@supabase/ssr` cookie-handling API is version-specific. Before writing this file, run `npm view @supabase/ssr version` and consult `node_modules/@supabase/ssr/README.md` or use `context7` to fetch the current pattern. Do not paste from training data.

- [ ] **Step 1:** Create `src/lib/supabase/server.ts` following the current `@supabase/ssr` server-helper recipe (uses `createServerClient` with Next 16 `cookies()` from `next/headers`, which **is async in Next 16** — `await cookies()`).
- [ ] **Step 2:** Create `src/lib/supabase/client.ts` using `createBrowserClient` from `@supabase/ssr`.
- [ ] **Step 3:** Create `src/lib/supabase/middleware.ts` that exports an `updateSession(request)` helper for the root `middleware.ts`.
- [ ] **Step 4:** Run `npx tsc --noEmit`. Fix anything red.
- [ ] **Step 5:** Commit
```bash
git add src/lib/supabase/
git commit -m "feat(auth): supabase ssr helpers (server/client/middleware)"
```

### Task 0.6: Root middleware to refresh session cookies

**Files created:** `middleware.ts` (repo root, NOT under `src/`)

- [ ] **Step 1:** Create:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(req: NextRequest) {
  return (await updateSession(req)) ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|sw.js).*)"],
};
```

- [ ] **Step 2:** Commit
```bash
git add middleware.ts
git commit -m "feat(auth): root middleware for supabase session refresh"
```

### Task 0.7: OAuth callback route

**Files created:** `src/app/api/auth/callback/route.ts`

- [ ] **Step 1:** Create the route following Next 16 handler signature (params Promise — but no params here, just `searchParams` on the URL):
```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
```

- [ ] **Step 2:** In Supabase dashboard → Authentication → Providers, enable Google. Add the local + Vercel redirect URLs (`http://localhost:3000/api/auth/callback` and `https://<vercel-domain>/api/auth/callback`).

- [ ] **Step 3:** Commit
```bash
git add src/app/api/auth/callback/route.ts
git commit -m "feat(auth): google oauth callback route"
```

### Task 0.8: Device ID bootstrap

**Files created:** `src/lib/device.ts`

- [ ] **Step 1:** Create:
```ts
"use client";

const KEY = "rtm.device.id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
```

- [ ] **Step 2:** Server-side helper in `src/lib/device-server.ts`:
```ts
import "server-only";
import { cookies } from "next/headers";

export async function readDeviceIdCookie(): Promise<string | null> {
  const store = await cookies();      // Next 16: cookies() is async
  return store.get("rtm.device.id")?.value ?? null;
}
```

- [ ] **Step 3:** Update `src/lib/supabase/middleware.ts.updateSession` so it ALSO mirrors the localStorage device id into a same-named cookie on first request (the client writes localStorage; the middleware copies cookie → request context for API routes that need it). Implementation detail: the client posts the device id via a one-shot `/api/device/bootstrap` route after first generating it.

- [ ] **Step 4:** Create `src/app/api/device/bootstrap/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { devices } from "@/lib/db/schema";

const Body = z.object({ device_id: z.string().uuid() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad device id" }, { status: 400 });
  const { device_id } = parsed.data;

  await db.insert(devices).values({ id: device_id }).onConflictDoNothing();

  const res = NextResponse.json({ ok: true });
  res.cookies.set("rtm.device.id", device_id, {
    httpOnly: false,            // client also reads it
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 5,
  });
  return res;
}
```

- [ ] **Step 5:** Commit
```bash
git add src/lib/device.ts src/lib/device-server.ts src/lib/supabase/middleware.ts src/app/api/device/bootstrap/route.ts
git commit -m "feat(device): anonymous device id bootstrap + cookie sync"
```

### Task 0.9: localStorage → DB migration on first run

**Files created:** `src/app/migrate-local/Migrate.tsx`

- [ ] **Step 1:** Create the migration component:
```tsx
"use client";

import { useEffect } from "react";
import { getOrCreateDeviceId } from "@/lib/device";

const FAV_KEY = "sgbus.favorites.v1";
const RECENT_KEY = "sgbus.recent.v1";
const DONE_KEY = "rtm.migrate.v1.done";

export function Migrate() {
  useEffect(() => {
    if (window.localStorage.getItem(DONE_KEY)) return;

    const deviceId = getOrCreateDeviceId();
    if (!deviceId) return;

    // Bootstrap device row + cookie first
    fetch("/api/device/bootstrap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ device_id: deviceId }),
    })
      .then(async () => {
        const favRaw = window.localStorage.getItem(FAV_KEY);
        const recentRaw = window.localStorage.getItem(RECENT_KEY);

        const favorites = favRaw
          ? Object.keys(JSON.parse(favRaw) as Record<string, { addedAt: number }>)
          : [];
        const recents = recentRaw
          ? (JSON.parse(recentRaw) as string[])
          : [];

        if (favorites.length === 0 && recents.length === 0) {
          window.localStorage.setItem(DONE_KEY, "1");
          return;
        }

        await fetch("/api/migrate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ device_id: deviceId, favorites, recents }),
        });
        window.localStorage.setItem(DONE_KEY, "1");
      })
      .catch(() => { /* will retry on next mount */ });
  }, []);

  return null;
}
```

- [ ] **Step 2:** Server route `src/app/api/migrate/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { favorites, recentSearches } from "@/lib/db/schema";

const Body = z.object({
  device_id: z.string().uuid(),
  favorites: z.array(z.string()).max(500),
  recents: z.array(z.string()).max(500),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const { device_id, favorites: favCodes, recents } = parsed.data;

  if (favCodes.length) {
    await db
      .insert(favorites)
      .values(favCodes.map((c) => ({ deviceId: device_id, stopCode: c })))
      .onConflictDoNothing();
  }
  if (recents.length) {
    await db.insert(recentSearches).values(
      recents.map((q) => ({ deviceId: device_id, query: q })),
    );
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3:** Mount `<Migrate />` in `src/app/layout.tsx` body, after `<header>`. Wrap in `<Suspense fallback={null}>` is NOT needed (the component renders nothing).

- [ ] **Step 4:** Commit
```bash
git add src/app/migrate-local/ src/app/api/migrate/ src/app/layout.tsx
git commit -m "feat(migrate): import localStorage favorites + recents into DB on first run"
```

### Task 0.10: Rewire `useFavorites` to DB-backed

**Files modified:** `src/lib/favorites.ts`

- [ ] **Step 1:** Add server route `src/app/api/favorites/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { favorites } from "@/lib/db/schema";
import { readDeviceIdCookie } from "@/lib/device-server";

export async function GET() {
  const deviceId = await readDeviceIdCookie();
  if (!deviceId) return NextResponse.json({ codes: [] });
  const rows = await db.select().from(favorites).where(eq(favorites.deviceId, deviceId));
  return NextResponse.json({ codes: rows.map((r) => r.stopCode) });
}

const ToggleBody = z.object({ stop_code: z.string(), op: z.enum(["add", "remove"]) });

export async function POST(req: Request) {
  const deviceId = await readDeviceIdCookie();
  if (!deviceId) return NextResponse.json({ error: "no device" }, { status: 400 });
  const parsed = ToggleBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const { stop_code, op } = parsed.data;
  if (op === "add") {
    await db.insert(favorites).values({ deviceId, stopCode: stop_code }).onConflictDoNothing();
  } else {
    await db.delete(favorites).where(and(eq(favorites.deviceId, deviceId), eq(favorites.stopCode, stop_code)));
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2:** Rewrite `src/lib/favorites.ts` to be DB-backed while preserving the `useFavorites()` API. Strategy: SWR-style hook that hits `/api/favorites` GET on mount, caches in memory, optimistic updates on toggle, sends POST. localStorage is only the source of truth for the device id now, no longer for favorites. The exported API (`useFavorites`, `useFavoriteCodes`) keeps the same signature.

- [ ] **Step 3:** Run `npx tsc --noEmit` and `npm run build`. Both clean.

- [ ] **Step 4:** Commit
```bash
git add src/app/api/favorites/ src/lib/favorites.ts
git commit -m "feat(favorites): DB-backed favorites via /api/favorites"
```

### Task 0.11: Rate-limit helper + `/api/vision` skeleton

**Files created:** `src/lib/rate-limit.ts`, `src/app/api/vision/route.ts`

**Design note:** the rate-limit helper is split into a **read-only check** and a **success-only write**. The route handler calls `checkVisionAllowed()` first; if not allowed, it returns 429 and never records the attempt. Only after the OCR call succeeds (PR 4/5) does the handler call `recordVisionUse()`. This way OpenAI outages and bad-input rejections don't consume the user's hourly budget.

- [ ] **Step 1:** Create `src/lib/rate-limit.ts`:
```ts
import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { deviceVisionUsage } from "@/lib/db/schema";

export const VISION_HOURLY_LIMIT = 50;

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

function currentHourBucket(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d;
}

function secondsUntilNextHour(): number {
  const now = Date.now();
  const next = new Date(currentHourBucket().getTime() + 60 * 60 * 1000).getTime();
  return Math.max(1, Math.ceil((next - now) / 1000));
}

/** Read-only: does this device have budget left this hour? Never writes. */
export async function checkVisionAllowed(deviceId: string): Promise<RateLimitResult> {
  const bucket = currentHourBucket();
  const rows = await db
    .select({ count: deviceVisionUsage.count })
    .from(deviceVisionUsage)
    .where(
      and(
        eq(deviceVisionUsage.deviceId, deviceId),
        eq(deviceVisionUsage.hourBucket, bucket),
      ),
    );
  const count = rows[0]?.count ?? 0;
  if (count >= VISION_HOURLY_LIMIT) {
    return { ok: false, retryAfterSeconds: secondsUntilNextHour() };
  }
  return { ok: true, remaining: VISION_HOURLY_LIMIT - count };
}

/** Success-only: atomically increment after a successful vision call. */
export async function recordVisionUse(deviceId: string): Promise<void> {
  const bucket = currentHourBucket();
  await db
    .insert(deviceVisionUsage)
    .values({ deviceId, hourBucket: bucket, count: 1 })
    .onConflictDoUpdate({
      target: [deviceVisionUsage.deviceId, deviceVisionUsage.hourBucket],
      set: { count: sql`${deviceVisionUsage.count} + 1` },
    });
}
```

- [ ] **Step 2:** Create `src/app/api/vision/route.ts` skeleton:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { readDeviceIdCookie } from "@/lib/device-server";
import { checkVisionAllowed } from "@/lib/rate-limit";

const Body = z.object({
  kind: z.enum(["stop", "building"]),
  image_b64: z.string().min(100),
});

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const deviceId = await readDeviceIdCookie();
  if (!deviceId) return NextResponse.json({ error: "no device" }, { status: 400 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });

  const rl = await checkVisionAllowed(deviceId);
  if (!rl.ok) {
    // The JSON body uses snake_case; the type field is retryAfterSeconds (camelCase) internally.
    return NextResponse.json(
      { error: "rate_limited", retry_after_seconds: rl.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  // PR 4/5 will implement the OCR branches. They MUST call recordVisionUse(deviceId)
  // only after a successful OpenAI response — never on rate-limit, validation error,
  // or upstream failure. See contracts.md §8.
  return NextResponse.json({ error: "not_implemented_yet" }, { status: 501 });
}
```

- [ ] **Step 3:** Commit
```bash
git add src/lib/rate-limit.ts src/app/api/vision/
git commit -m "feat(vision): rate-limit (check + record split) + /api/vision skeleton"
```

### Task 0.12: Rebrand pass

**Files modified:** `package.json`, `src/app/layout.tsx`, `public/manifest.webmanifest`, `src/components/BrandHeader.tsx` (new), `public/sw.js` (cache name bump), README references

- [ ] **Step 1:** Update `package.json` `name` → `"road-to-mooon"`.

- [ ] **Step 2:** Create `src/components/BrandHeader.tsx`:
```tsx
import Link from "next/link";
import { Rocket } from "lucide-react";

export function BrandHeader() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Road to Mooon — home">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
        <Rocket className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-base font-semibold tracking-tight">
        Road to Mooon
      </span>
    </Link>
  );
}
```

- [ ] **Step 3:** Edit `src/app/layout.tsx`:
  - Replace the inline brand block with `<BrandHeader />`
  - Update `metadata.title` → `"Road to Mooon — Singapore commuting copilot"`
  - Update `metadata.description` → `"Bus arrivals, public transport routing, and live tracking for Singapore."`
  - Update `metadata.appleWebApp.title` → `"Road to Mooon"`

- [ ] **Step 4:** Edit `public/manifest.webmanifest`:
```json
{
  "name": "Road to Mooon",
  "short_name": "Road to Mooon",
  "description": "Singapore commuting copilot — buses, MRT, live tracking.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#09090b",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.svg", "sizes": "192x192", "type": "image/svg+xml", "purpose": "any" },
    { "src": "/icon-512.svg", "sizes": "512x512", "type": "image/svg+xml", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 5:** In `public/sw.js`, bump any cache version constant (e.g. `CACHE_NAME = "rtm-v1"`).

- [ ] **Step 6:** Search for remaining `sgbus` references in source and replace where user-visible. Keep the localStorage key `sgbus.favorites.v1` UNCHANGED — that's what we read during migration. Internal directory names and the repo name stay too.
```bash
grep -rn "sgbus" src/ public/ --include="*.ts" --include="*.tsx" --include="*.json" --include="*.webmanifest"
```
Review each hit; flip user-visible strings only.

- [ ] **Step 7:** Commit
```bash
git add package.json src/app/layout.tsx src/components/BrandHeader.tsx public/manifest.webmanifest public/sw.js src/
git commit -m "feat(brand): rebrand sgbus → Road to Mooon (Rocket placeholder logo)"
```

### Task 0.13: Verification + PR

- [ ] **Step 1:** Run in parallel:
```bash
npm run lint
npx tsc --noEmit
npm run build
```
All clean.

- [ ] **Step 2:** Smoke test locally with `tmux-run 'npm run dev'`:
  - Home page renders "Road to Mooon" header with Rocket icon
  - DevTools → Application → IndexedDB / LocalStorage shows `rtm.device.id` UUID
  - Network tab shows `POST /api/device/bootstrap` 200 OK on first load
  - Existing localStorage favorites (if any) appear in Supabase `favorites` table
  - Test `POST /api/vision` from DevTools with `{kind:"stop", image_b64:"x".repeat(200)}` → 501. Spamming it does **not** rate-limit in PR 0 — the route is success-only and PR 0 has no successes. To verify the rate-limit gate fires, manually seed `device_vision_usage` with `count = 50` for the current device + hour bucket in the Supabase SQL editor, then send the request again → 429 with `Retry-After` header. Delete the seed row when done.

- [ ] **Step 3:** Run the auto-mode verification gate:
  - **superpowers:code-reviewer** — diff vs this plan and the project conventions
  - **superpowers:security-and-hardening** — auth boundary, RLS, secret handling
  - **Explore** subagent — find any `sgbus` references the rebrand grep missed, any callers reading `sgbus.favorites.v1` directly

- [ ] **Step 4:** Open PR:
```bash
gh pr create --title "feat: PR 0 — foundation & rebrand to Road to Mooon" --body "$(cat <<'EOF'
## Summary
- Adds Supabase + Drizzle: 6 tables (devices, favorites, recent_searches, recent_journeys, scanned_history, device_vision_usage)
- Anonymous device-id bootstrap; Google sign-in scaffolded (UI in later PR)
- localStorage → DB migration on first load (favorites + recents)
- /api/vision skeleton with 50/hour per-device rate limit
- Full rebrand: sgbus → Road to Mooon (Lucide Rocket placeholder logo)

## Test plan
- [ ] First load on a fresh browser writes a device row + cookie
- [ ] Existing localStorage favorites get inserted into DB exactly once
- [ ] /api/vision returns 501 today; spam 51× returns 429 with Retry-After
- [ ] lint, tsc --noEmit, build all clean
- [ ] No sgbus references visible in UI

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Stop. Human merges.** PR 1, 2, 4 dispatch only after `main` contains PR 0.

---

# PR 1 — Live bus markers

**Branch:** `feat/live-bus-markers`
**Reads first:** the existing `src/app/map/MapView.tsx` end to end. The bus GeoJSON layer is already wired (it just doesn't poll). This PR adds polling, interpolation, and popups.

### Task 1.1: Interpolation helper

**Files created:** `src/lib/bus-markers.ts`

- [ ] **Step 1:** Create:
```ts
import type { NextBus } from "./types";

export type BusMarker = {
  id: string;                     // `${serviceNo}#${nextIndex}`
  serviceNo: string;
  load: NextBus["load"];
  type: NextBus["type"];
  current: { lat: number; lng: number };
  target: { lat: number; lng: number };
  startedAt: number;
};

export function buildMarkers(
  prev: Map<string, BusMarker>,
  arrivals: { services: { serviceNo: string; next: NextBus | null }[] } | null,
  now: number,
): Map<string, BusMarker> {
  if (!arrivals) return new Map();
  const next = new Map<string, BusMarker>();
  for (const svc of arrivals.services) {
    const bus = svc.next;
    if (!bus) continue;
    if (
      !Number.isFinite(bus.latitude) ||
      !Number.isFinite(bus.longitude) ||
      bus.latitude === 0 ||
      bus.longitude === 0
    )
      continue;
    const id = `${svc.serviceNo}#1`;
    const existing = prev.get(id);
    next.set(id, {
      id,
      serviceNo: svc.serviceNo,
      load: bus.load,
      type: bus.type,
      current: existing?.target ?? { lat: bus.latitude, lng: bus.longitude },
      target: { lat: bus.latitude, lng: bus.longitude },
      startedAt: now,
    });
  }
  return next;
}

// Linear tween, t in [0,1]
export function tween(m: BusMarker, t: number): { lat: number; lng: number } {
  const k = Math.min(1, Math.max(0, t));
  return {
    lat: m.current.lat + (m.target.lat - m.current.lat) * k,
    lng: m.current.lng + (m.target.lng - m.current.lng) * k,
  };
}

export function loadLabel(load: NextBus["load"]): string {
  switch (load) {
    case "SEA": return "seats";
    case "SDA": return "standing";
    case "LSD": return "packed";
    default: return "—";
  }
}

export function loadColor(load: NextBus["load"]): string {
  switch (load) {
    case "SEA": return "#34d399"; // emerald-400
    case "SDA": return "#fbbf24"; // amber-400
    case "LSD": return "#f87171"; // red-400
    default: return "#a1a1aa";    // zinc-400
  }
}
```

- [ ] **Step 2:** Commit
```bash
git add src/lib/bus-markers.ts
git commit -m "feat(map): bus marker interpolation helper"
```

### Task 1.2: Polling + animation in MapView

**Files modified:** `src/app/map/MapView.tsx`

- [ ] **Step 1:** Add three new state slices: a `markers: Map<string, BusMarker>` ref, a `tick` state that increments on each animation frame, and a `lastPollAt` ref.

- [ ] **Step 2:** Add a `useEffect` that, when `selected` changes, sets up a 15-second `setInterval` polling `/api/arrivals/[code]` and updates the marker map via `buildMarkers(prev, arrivals, Date.now())`. Cleanup on `selected = null` or unmount.

- [ ] **Step 3:** Add a `requestAnimationFrame` loop that runs only while `selected !== null`, updates `tick` every ~16 ms (target 60 FPS), and uses `(Date.now() - marker.startedAt) / 15000` as `t` for `tween`. Cap at 1.

- [ ] **Step 4:** Replace the existing `busesGeoJSON` `useMemo` with one driven by `markers` + `tick`. Properties on each Feature: `{ id, serviceNo, load, type, color }` where `color = loadColor(load)`.

- [ ] **Step 5:** Change the `busPointsLayer` to drive `circle-color` from `["get", "color"]`. Add an `id`-based interactive layer so clicks resolve a marker. On click, show a small `Popup` (MapLibre) anchored at the marker with `Bus {serviceNo} · {loadLabel(load)}`. Reuse the existing `react-map-gl/maplibre` `Popup` import.

- [ ] **Step 6:** Run `npx tsc --noEmit` and `npm run build`. Clean.

- [ ] **Step 7:** Smoke test with `tmux-run 'npm run dev'`:
  - Open `/map`, click a stop with active services
  - See bus markers in emerald/amber/red by load
  - Markers smoothly glide between polls (no teleport)
  - Tap a marker → popup with service + load
  - Close the stop popup → bus markers disappear, polling stops (verify with Network tab)

- [ ] **Step 8:** Commit
```bash
git add src/app/map/MapView.tsx
git commit -m "feat(map): live bus markers with 15s polling + interpolation + load popup"
```

### Task 1.3: Verification + PR

- [ ] **Step 1:** Lint / typecheck / build clean.
- [ ] **Step 2:** Auto-mode verification gate:
  - **superpowers:code-reviewer** — focus on cleanup of intervals and rAF on unmount and stop-deselect
  - **superpowers:performance-optimization** — rAF cost on low-end Android, marker count caps (typical SG stop returns ≤ 10 services)
  - **general-purpose** UI/QA — walk `/map` in a browser, confirm marker behavior matches plan
- [ ] **Step 3:** PR title: `feat: PR 1 — live bus markers on /map for selected stop`
- [ ] **Step 4:** Stop. Human merges.

---

# PR 2 — OneMap public-transport routing

**Branch:** `feat/onemap-routing`
**Reads first:**
- `node_modules/next/dist/docs/01-app/03-api-reference/01-functions/route-handlers.mdx`
- OneMap docs: token endpoint, routing endpoint, search endpoint (use `context7` if uncertain)

### Task 2.1: Add `Itinerary` types

**Files modified:** `src/lib/types.ts`

- [ ] **Step 1:** Append:
```ts
export type LegMode = "WALK" | "BUS" | "SUBWAY";

export type ItineraryLeg = {
  mode: LegMode;
  durationMinutes: number;
  route?: string;              // "174" for BUS, "NEL" for SUBWAY
  fromName?: string;
  toName?: string;
  distanceMeters?: number;
};

export type Itinerary = {
  totalMinutes: number;
  walkingMinutes: number;
  fareCents?: number;          // present if OneMap returns it
  legs: ItineraryLeg[];
};

export type GeoPoint = { lat: number; lng: number; label?: string };
```

- [ ] **Step 2:** Commit
```bash
git add src/lib/types.ts
git commit -m "feat(types): itinerary + geo-point types for routing"
```

### Task 2.2: OneMap client lib

**Files created:** `src/lib/onemap.ts`

- [ ] **Step 1:** Implement with:
  - `let cachedToken: { token: string; expires: number } | null = null;`
  - `getToken()` posts `{ email, password }` to `https://www.onemap.gov.sg/api/auth/post/getToken`, caches token until `expires - 5 min`
  - `routePT({ from, to, date, time, mode: "TRANSIT" })` calls `https://www.onemap.gov.sg/api/public/routingsvc/route?...` with `routeType=pt`, parses the OneMap PT itinerary shape into our `Itinerary[]` (return top 3 by `duration`)
  - `searchAddress(q: string)` calls `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=...&returnGeom=Y&getAddrDetails=N&pageNum=1`, returns top 5 normalised as `{ name, lat, lng }[]`
- [ ] **Step 2:** Add `"server-only";` at the top so this is never bundled to the client.
- [ ] **Step 3:** Commit
```bash
git add src/lib/onemap.ts
git commit -m "feat(onemap): server-side client with token cache, routePT, searchAddress"
```

### Task 2.3: `/api/route` and `/api/search`

**Files created:** `src/app/api/route/route.ts`, `src/app/api/search/route.ts`

- [ ] **Step 1:** Create `/api/route/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { routePT, searchAddress } from "@/lib/onemap";

// Matches the GeoPoint exported from src/lib/types.ts (PR 2 Task 2.1).
const GeoPointZ = z.union([
  z.object({ lat: z.number(), lng: z.number(), label: z.string().optional() }),
  z.string().min(2),
]);
const Body = z.object({ from: GeoPointZ, to: GeoPointZ });

async function resolve(p: z.infer<typeof GeoPointZ>) {
  if (typeof p === "string") {
    const hits = await searchAddress(p);
    if (!hits.length) throw new Error(`no match for "${p}"`);
    return { lat: hits[0].lat, lng: hits[0].lng, label: hits[0].name };
  }
  return { ...p, label: p.label ?? `${p.lat.toFixed(4)},${p.lng.toFixed(4)}` };
}

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad body" }, { status: 400 });
  try {
    const from = await resolve(parsed.data.from);
    const to = await resolve(parsed.data.to);
    const itineraries = await routePT({ from, to });
    return NextResponse.json({ from, to, itineraries });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
```

- [ ] **Step 2:** Create `/api/search/route.ts`:
```ts
import { NextResponse } from "next/server";
import { searchAddress } from "@/lib/onemap";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });
  try {
    const results = await searchAddress(q);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ results: [], error: e instanceof Error ? e.message : "search failed" }, { status: 502 });
  }
}
```

- [ ] **Step 3:** Commit
```bash
git add src/app/api/route/ src/app/api/search/
git commit -m "feat(api): /api/route + /api/search via OneMap"
```

### Task 2.4: `/api/journeys` (read + write recent_journeys)

**Files created:** `src/app/api/journeys/route.ts`

- [ ] **Step 1:** Implement GET (last 10 by `device_id` cookie, ordered by createdAt desc) and POST (insert with optional `name`).
- [ ] **Step 2:** Commit
```bash
git add src/app/api/journeys/
git commit -m "feat(api): /api/journeys read + write"
```

### Task 2.5: `/plan` page + form + result cards + recent list

**Files created:** `src/app/plan/page.tsx`, `src/app/plan/PlanForm.tsx`, `src/app/plan/ResultCard.tsx`, `src/app/plan/RecentJourneys.tsx`

- [ ] **Step 1:** `page.tsx` is a Server Component shell that renders `<RecentJourneys />` and `<PlanForm />`.
- [ ] **Step 2:** `PlanForm.tsx` is a Client Component with:
  - "From" defaults to GPS via `navigator.geolocation.getCurrentPosition`. Toggle button to enter address text.
  - "To" is an input with autocomplete from `/api/search` (debounce 250 ms).
  - "Plan" button calls `/api/route`. On success, renders 3 `ResultCard`s. On success, also POSTs to `/api/journeys` (anonymous auto-save, `name: null`).
- [ ] **Step 3:** `ResultCard.tsx` shows total minutes, walking minutes, fare, and a stacked leg preview using small lucide-react icons (`Footprints` for walk, `Bus` for bus, `TramFront` for MRT). Includes "Save as…" button → prompts for name → POST `/api/journeys` with `name`.
- [ ] **Step 4:** `RecentJourneys.tsx` is a Client Component fetching `/api/journeys` on mount, listed as a horizontal-scroll row of chips ("Home → Work · 28 min" or auto-saved label). Tap a chip → prefill the form and re-plan.
- [ ] **Step 5:** Add a Plan icon to `BottomNav` (lucide `Route`).
- [ ] **Step 6:** Run `npx tsc --noEmit` + `npm run build`. Clean.
- [ ] **Step 7:** Smoke test with a real OneMap key:
  - Plan from current GPS to "Plaza Singapura" → 3 results with bus + MRT legs
  - Save one as "Home" → it appears as a chip on reload
- [ ] **Step 8:** Commit
```bash
git add src/app/plan/ src/components/BottomNav.tsx
git commit -m "feat(plan): /plan page with OneMap routing, autocomplete, saved presets"
```

### Task 2.6: Verification + PR
- [ ] Lint / typecheck / build clean.
- [ ] code-reviewer + general-purpose UI/QA.
- [ ] PR title: `feat: PR 2 — OneMap public-transport routing`.
- [ ] Stop. Human merges.

---

# PR 4 — Stop OCR

**Branch:** `feat/stop-ocr` (runs in parallel with PR 1 and PR 2 in Wave 2; safe because it does not touch `/map` or `/plan`)
**Reads first:**
- `~/.claude/skills/ocr-speed-optimization/SKILL.md` (REQUIRED — explains why we use gpt-4.1-mini and the preprocessing pipeline)
- OpenAI vision docs via `context7` if uncertain about message format

### Task 4.1: Image preprocessing helper

**Files created:** `src/lib/image-prep.ts`

- [ ] **Step 1:** Paste verbatim from the `ocr-speed-optimization` skill's "Drop-in replacement (TypeScript, browser)" section. Adjust file path imports as needed. **Do not invent a different approach** — this is a battle-tested function.

- [ ] **Step 2:** Commit
```bash
git add src/lib/image-prep.ts
git commit -m "feat(vision): client-side 1280px JPEG image-prep helper"
```

### Task 4.2: OpenAI vision client lib

**Files created:** `src/lib/openai-vision.ts`

- [ ] **Step 1:** Implement:
```ts
import "server-only";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  maxRetries: 0,        // we own retry; per ocr-speed-optimization skill
});

const STOP_PROMPT = `
You are reading a Singapore bus stop pole sign. Reply with JSON only.
{
  "stop_code": "<exactly five digits>" | null,
  "confidence": <0-100>
}
Rules:
- If no clear 5-digit code is visible, set stop_code: null.
- Do not guess. Confidence < 60 if blurry, occluded, or ambiguous.
- Do not include any text outside the JSON.
`.trim();

const BUILDING_PROMPT = `
You are reading the name of a Singapore building or place from signage.
Reply with JSON only.
{
  "name": "<the building/place name as printed>" | null,
  "confidence": <0-100>
}
Rules:
- Return null if no clear building name is visible.
- Prefer the largest, most prominent name on the sign.
- Do not include addresses, unit numbers, or surrounding street text.
- Do not include any text outside the JSON.
`.trim();

export async function readStopCode(imageB64: string): Promise<{ stop_code: string | null; confidence: number }> {
  const out = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: STOP_PROMPT },
      { role: "user", content: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } }] },
    ],
  });
  const raw = out.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(raw) as { stop_code?: string | null; confidence?: number };
  const code = parsed.stop_code && /^\d{5}$/.test(parsed.stop_code) ? parsed.stop_code : null;
  return { stop_code: code, confidence: Math.max(0, Math.min(100, Math.round(parsed.confidence ?? 0))) };
}

export async function readBuildingName(imageB64: string): Promise<{ name: string | null; confidence: number }> {
  const out = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: BUILDING_PROMPT },
      { role: "user", content: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } }] },
    ],
  });
  const raw = out.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(raw) as { name?: string | null; confidence?: number };
  return {
    name: parsed.name?.trim() || null,
    confidence: Math.max(0, Math.min(100, Math.round(parsed.confidence ?? 0))),
  };
}
```

> **Note:** If `chat.completions` with `image_url` is the wrong API shape in the SDK version installed, use the current OpenAI vision message format from `context7`. Do NOT improvise from training data. Verify by reading `node_modules/openai/README.md` first.

- [ ] **Step 2:** Commit
```bash
git add src/lib/openai-vision.ts
git commit -m "feat(vision): gpt-4.1-mini OCR client (stop + building prompts)"
```

### Task 4.3: Wire `/api/vision` — `kind: 'stop'` branch

**Files modified:** `src/app/api/vision/route.ts`

- [ ] **Step 1:** After the rate-limit gate added in PR 0, dispatch on `kind`:
```ts
if (parsed.data.kind === "stop") {
  const { stop_code, confidence } = await readStopCode(parsed.data.image_b64);
  if (stop_code) {
    await db.insert(scannedHistory).values({
      deviceId,
      kind: "stop",
      detectedValue: stop_code,
      resolvedStopCode: stop_code,
      confidence,
    });
  } else {
    await db.insert(scannedHistory).values({
      deviceId,
      kind: "stop",
      detectedValue: "(unrecognised)",
      confidence,
    });
  }
  return NextResponse.json({ stop_code, confidence });
}
return NextResponse.json({ error: "not_implemented_yet" }, { status: 501 });
```
(PR 5 fills in the building branch.)

- [ ] **Step 2:** Commit
```bash
git add src/app/api/vision/route.ts
git commit -m "feat(vision): wire stop OCR branch in /api/vision"
```

### Task 4.4: Scan page + stop scanner

**Files created:** `src/app/scan/page.tsx`, `src/app/scan/StopScanner.tsx`

- [ ] **Step 1:** `page.tsx` (Client Component shell) renders a mode selector — for PR 4 it only shows "Scan a bus stop". Renders `<StopScanner />`.
- [ ] **Step 2:** `StopScanner.tsx`:
  - `<input type="file" accept="image/*" capture="environment">` (mobile opens rear camera; falls back to file picker on desktop)
  - Preview the captured image
  - "Send" button → calls `blobToProcessedBase64` from `image-prep.ts` → POSTs to `/api/vision` with `kind: "stop"`
  - On success with `stop_code`: `router.push("/stop/" + code + "?scanned=" + Date.now())`
  - On null/low-confidence: toast "Couldn't read the stop code" + navigate to `/nearby`
- [ ] **Step 3:** On `/stop/[code]` page, if `searchParams.scanned` is present, render a dismissible banner: `"Detected stop XXXXX — wrong? Tap to choose"`. Tap → routes to `/nearby` with current GPS.

### Task 4.5: `+` scan button on home

**Files modified:** `src/app/page.tsx`

- [ ] **Step 1:** Add a primary CTA: `<Link href="/scan" className="...">` styled as a pill with Lucide `Camera` icon and label "Scan a bus stop".
- [ ] **Step 2:** Commit
```bash
git add src/app/scan/ src/app/page.tsx src/app/stop/
git commit -m "feat(scan): camera capture flow for bus stops"
```

### Task 4.6: Verification + PR

- [ ] Lint / typecheck / build clean.
- [ ] Manual smoke test (must have `OPENAI_API_KEY` set):
  - Open `/scan` on mobile, take a photo of a clear stop sign → routes to `/stop/<code>`
  - Banner appears. Tap banner → routes to `/nearby`
  - DB: a row in `scanned_history` with the detected code and confidence
- [ ] Auto-mode verification gate:
  - **superpowers:code-reviewer**
  - **superpowers:security-and-hardening** — file upload boundary (size cap, MIME validation, error messages don't leak details)
  - **general-purpose** UI/QA
- [ ] PR title: `feat: PR 4 — camera OCR for bus stops`
- [ ] Stop. Human merges.

---

# PR 3 — Voice input (depends on PR 2)

**Branch:** `feat/voice-input`

### Task 3.1: Speech helper

**Files created:** `src/lib/speech.ts`

- [ ] **Step 1:** Create:
```ts
"use client";

type SpeechResult = { transcript: string; isFinal: boolean };

type AnyWindow = typeof window & {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
};

export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as AnyWindow;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function createRecognizer(lang = "en-SG") {
  const w = window as AnyWindow;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = lang;
  r.interimResults = true;
  r.maxAlternatives = 1;
  r.continuous = false;
  return r;
}
```

- [ ] **Step 2:** Commit
```bash
git add src/lib/speech.ts
git commit -m "feat(speech): web-speech wrapper with en-SG default"
```

### Task 3.2: Mic component

**Files created:** `src/components/VoiceMic.tsx`

- [ ] **Step 1:** Component takes `{ onResult: (text: string) => void }`. State: `idle | listening`. Renders a `Mic` icon button (lucide-react). On click: try `createRecognizer("en-SG")`, fall back to `"en-US"` if SG locale rejected. Wire `onresult`, `onerror`, `onend`. On final result call `onResult(transcript)`. On unsupported, disable + show tooltip "Voice not supported in this browser".

- [ ] **Step 2:** Commit
```bash
git add src/components/VoiceMic.tsx
git commit -m "feat(voice): mic button with web speech api"
```

### Task 3.3: Mount in PlanForm

**Files modified:** `src/app/plan/PlanForm.tsx`

- [ ] **Step 1:** Add `<VoiceMic onResult={(t) => setTo(t)} />` inside the destination input's right adornment area. Importantly: setting the field does NOT trigger Plan — the user still taps the button.
- [ ] **Step 2:** Commit
```bash
git add src/app/plan/PlanForm.tsx
git commit -m "feat(voice): mic icon inside destination input"
```

### Task 3.4: Verification + PR

- [ ] Build clean.
- [ ] Smoke test in Chrome Android: tap mic, say "Plaza Singapura", field fills, tap Plan.
- [ ] PR title: `feat: PR 3 — voice destination input on /plan`. Human merges.

---

# PR 5 — Building OCR (depends on PR 2)

**Branch:** `feat/building-ocr`

### Task 5.1: Wire `/api/vision` — `kind: 'building'` branch

**Files modified:** `src/app/api/vision/route.ts`

- [ ] **Step 1:** After PR 4's stop branch, add the building branch:
```ts
if (parsed.data.kind === "building") {
  const { name, confidence } = await readBuildingName(parsed.data.image_b64);
  if (!name) {
    await db.insert(scannedHistory).values({
      deviceId, kind: "building", detectedValue: "(unrecognised)", confidence,
    });
    return NextResponse.json({ name: null, confidence, results: [] });
  }
  const results = await searchAddress(name);   // top 5
  if (results.length > 0) {
    await db.insert(scannedHistory).values({
      deviceId, kind: "building",
      detectedValue: name,
      resolvedLat: String(results[0].lat),
      resolvedLng: String(results[0].lng),
      confidence,
    });
  }
  return NextResponse.json({ name, confidence, results: results.slice(0, 3) });
}
```

### Task 5.2: BuildingScanner + results page

**Files created:** `src/app/scan/BuildingScanner.tsx`, `src/app/scan/results/page.tsx`

- [ ] **Step 1:** `BuildingScanner.tsx` mirrors `StopScanner.tsx` but posts `kind: "building"`. On response:
  - 0 results → toast "Couldn't find that building — try typing it" + stay on page
  - 1 result → `router.push(`/map?pin_lat=${r.lat}&pin_lng=${r.lng}&pin_label=${encodeURIComponent(r.name)}`)`
  - 2–3 → `router.push("/scan/results?...")` with all candidates encoded

- [ ] **Step 2:** `/scan/results/page.tsx` shows the candidate cards with computed distance from user GPS (use `src/lib/distance.ts` existing haversine). Tap a card → same pin redirect as the 1-match case.

### Task 5.3: External pin on `/map`

**Files modified:** `src/app/map/MapView.tsx`

- [ ] **Step 1:** Read `searchParams.pin_lat`, `pin_lng`, `pin_label`. If present, add a single dedicated Marker (different colour from stop dots, e.g. emerald-300 with a `MapPin` icon overlay). Compute walking distance from current GPS, show in the popup. Add a "Plan a trip here" button that routes to `/plan?to_lat=...&to_lng=...&to_label=...`.

### Task 5.4: Mode toggle on /scan page

**Files modified:** `src/app/scan/page.tsx`

- [ ] **Step 1:** Add a tab/toggle: "Bus stop" | "Building". Render `<StopScanner />` or `<BuildingScanner />` accordingly. Persist last-used mode in localStorage key `rtm.scan.lastMode`.

### Task 5.5: Verification + PR

- [ ] Lint / typecheck / build clean.
- [ ] Smoke test:
  - Scan a clear building sign → either auto-pin or 2–3 candidate cards
  - Tap "Plan a trip here" → `/plan` opens with destination pre-filled
- [ ] code-reviewer + security-and-hardening + general-purpose.
- [ ] PR title: `feat: PR 5 — camera OCR for buildings + geocode + plan cross-link`.

---

## Rollback notes

- Every PR ships to `main` as a single mergeable change.
- DB migrations are additive only — rollback = revert the merge commit + leave the column/table (orphan, harmless).
- Supabase auth misconfig: disable Google provider in Supabase dashboard; the app keeps working anonymously.
- OneMap outage: `/api/route` returns 502 with the upstream error; UI shows an inline retry banner.
- OpenAI outage: `/api/vision` returns 502; UI tells the user "OCR temporarily unavailable, try again later". Rate-limit counter still increments? **No** — fix in the route: increment AFTER the OpenAI call succeeds, not before. Update Task 0.11 to defer the increment until after the OCR succeeds, OR use the `returning()` pattern to decrement on failure. **Decision:** simpler to swap order: count successful uses only. Update `checkAndIncrementVision` → split into `checkVisionAllowed` (no write) + `recordVisionUse` (write). PR 4 calls both around the OpenAI call.

## Open questions

- **Logo:** User to provide; until then, Rocket icon. No blocker.
- **Service worker cache strategy:** New routes (`/plan`, `/scan`, `/scan/results`) — should they be in the precache list or stale-while-revalidate? Default: leave them runtime-cached only (`sw.js` likely doesn't precache pages). Revisit if PWA install behavior regresses.
- **Singapore PT data freshness:** OneMap's PT graph updates weekly. If a service alert is in effect (e.g., MRT line down), OneMap may still route via that line. Out of scope for v2; consider a `BusServices`/`TrainServiceAlerts` banner in a future PR.

---

## Self-review checklist (done by author)

- [x] Each PR has a complete file list and at least one acceptance step
- [x] Drizzle schema is locked once at top of plan — no per-PR re-definitions
- [x] Every API route is paired with its caller and shape
- [x] No "TBD" / "implement later" / "similar to above" — every code block contains real code
- [x] Next 16 `params: Promise<...>` constraint surfaced in plan front matter
- [x] OCR model choice (gpt-4.1-mini, NOT 4o-mini) sourced from skill, not training data
- [x] Wave dependencies explicit (PR 3 + PR 5 wait on PR 2)
- [x] Rate-limit ordering bug caught + corrected in rollback notes
