# CLAUDE.md

Context for Claude Code across sessions. Read before structural/schema/convention
decisions. The detailed schema + API contract + page inventory lives in `SPEC.md`.
Conventions were inherited from the sibling project `d:\dumbstack\GRC` — when in
doubt about a pattern, look at how GRC does it.

## What this project is

**kwt25 — Kwt25.** Property-listing website for a
Kuwaiti real-estate office (rebuild of the old kwt25.com, reference screenshots
in `reference/`). Bilingual Arabic/English, **Arabic default**, RTL primary.

```
Real Estate/
├── Api/          — FastAPI backend (admin /api/v1 + public /public/v1)
├── admin/        — Next.js 15 admin panel (port 3000)
├── storefront/   — Next.js 15 public website (port 3100)
├── reference/    — screenshots of the old site (design source of truth)
└── compose.yml   — production compose (db/api/admin/storefront/caddy)
```

No ecommerce here: no cart, no checkout, no orders, no inventory. The public
site's conversions are phone call, WhatsApp, inquiry form, and the
"request your property" form.

## Environment

- Local Postgres 16 in Docker, container `kwt25-postgres`, **port 5433**
  (5432 belongs to GRC's container), db `kwt25`, user/pass `postgres`/`postgres`.
- Python 3.11+, plain venv + `requirements.txt`. No uv/poetry.
- Sync SQLAlchemy (`psycopg`), Alembic migrations. No Redis, no workers.
- Media uploads → local `./uploads` behind `app/storage.py` (swap-to-S3-later isolation).
- Admin dev on :3000, storefront dev on :3100, API on :8000.

## Non-negotiable rules (inherited from GRC, adapted)

1. **Money is `NUMERIC(12,3)` KWD, never float** (1 KD = 1000 fils → 3 decimals).
2. **Nothing referenced is hard-deleted** — `is_active=false` soft deletes.
3. **Translations are rows in `*_translations` keyed by `locale`** — never JSON
   blobs, never `name_ar`/`name_en` columns. Slugs unique per locale.
4. **Every write to properties, settings, roles writes `audit_log`** via audit_service.
5. **RBAC via `require("permission.key")` dependency**; keys live in `permissions.py` only.
6. **Routers thin** — parse → service → schema. Services own transactions. No
   queries in routers.
7. **Cursor pagination on `(created_at, id)`, never OFFSET.**
   Shape: `{"items": [...], "next_cursor": "..."|null}`.
8. **Error envelope everywhere:** `{"code", "message", "details"}` via
   `app/errors.py` + `AppError` subclasses. Never bare `HTTPException`.
9. **No MFA.** Login → access JWT (15 min) + rotating refresh token stored
   SHA-256-hashed in `user_sessions`.
10. **Public endpoints only ever expose published + active properties.**
11. Frontend permission gating is cosmetic; the backend `require()` is the boundary.

## Frontend conventions

- Next.js 15 App Router, TS, Tailwind 4, next-intl (`ar` default + `en`, RTL),
  TanStack Query for server state (admin), react-hook-form + zod forms,
  shadcn/ui-style components (admin), sonner toasts.
- Admin: bearer token in memory + refresh cookie via `/api/auth/*` route handlers
  (copied from GRC). Errors keyed off the `{code,message,details}` envelope.
- Storefront: server components fetch from `/public/v1`; maplibre-gl with
  OpenFreeMap tiles for maps; theme cream `#F7F3EA` / navy `#0E1B2B` / gold `#C9A45D`,
  sampled from the reference screenshots in `mimic/` (tokens live in
  `storefront/src/app/globals.css` — retheme there, nowhere else). **Gold is flat**:
  the reference paints one gold value everywhere, so there is no gradient variant.
- Every list of options on the storefront goes through `OptionPicker` /
  `OptionGrid` (`components/ui/option-picker.tsx`) — two columns, never a
  native `<select>`. Listing filters wrap `OptionGrid` in a `BottomSheet`.
- Previously-live designs and how to restore them: `deploy/ROLLBACK.md`.

## Login (dev seed)

`owner@kwt25.com` / `Kwt25!Owner#2026` (change via `Api/.env` + reseed).
Seed also creates areas, property types, amenities, settings, and 12 sample
properties so both frontends demo immediately: `python -m app.seed`.
