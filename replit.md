# Blink & Bling Design OS

End-to-end design OS for a custom-jewellery studio: customer-facing portal (concept gallery, timeline, payments) + jeweller workspace (intake, 3D studio, vault, store).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- **Frontend** — `artifacts/startupvisual/src/` (React + Vite + Wouter)
  - Auth pages: `views/auth/{Customer,Jeweller}{Login,Signup}.tsx`
  - Auth API client: `src/lib/auth.ts` (signup/login/logout/getMe)
  - Routes registered in `src/App.tsx`
- **API** — `artifacts/api-server/src/`
  - Auth routes: `routes/auth.ts` (`/api/auth/{signup,login,logout,me}`)
  - Session middleware in `app.ts` (express-session + connect-pg-simple, cookie name `bb.sid`)
- **DB** — `lib/db/src/`
  - Connection: `index.ts` (prefers `SUPABASE_DATABASE_URL`, falls back to `DATABASE_URL`)
  - Schema source of truth: `src/schema/users.ts` (`bb_users`, `bb_sessions`)
- Vite dev proxy `/api` → `localhost:8080` lives in `artifacts/startupvisual/vite.config.ts`

## Architecture decisions

- Auth: bcryptjs (12 rounds) + express-session backed by Postgres (`bb_sessions` table). Two roles: `customer`, `jeweller` — chosen on signup, drives post-login redirect (`/portal` vs `/workspace`).
- Currently using Replit's built-in Postgres via `DATABASE_URL`. The connection layer auto-prefers `SUPABASE_DATABASE_URL` if present, so swapping to Supabase is a single secret change once a working pooler URL is provided.
- Tables are prefixed `bb_` to play nicely if Supabase is later added to a shared schema.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Vite `/api` → `localhost:8080` proxy is **dev-only**. Production deployment will need a reverse-proxy rule routing `/api/*` from the static web service to the API service, otherwise auth calls 404. Not yet wired.
- Supabase direct connection (`db.<ref>.supabase.co`) resolves IPv6-only and is unreachable from this Replit container. To use Supabase, switch to the **session pooler** URL: `postgresql://postgres.<project-ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres` and store as `SUPABASE_DATABASE_URL` secret. The DB layer auto-prefers that over `DATABASE_URL`.
- No frontend route guards yet on `/portal` and `/workspace` — both are reachable without a session. Add a `useMe()` check + redirect before exposing real customer/jeweller data.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
