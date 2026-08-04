# kwt25 — Kuwait Real Estate — Build Specification

Single source of truth for the schema, API contract, and page inventory.
All three apps (Api/, admin/, storefront/) are built against THIS file.
Conventions (code style, layering, error envelope, auth flow) are inherited
from `d:\dumbstack\GRC` — read its `CLAUDE.md` and copy its patterns.

## Product

**kwt25 — عقار الكويت / Kuwait Real Estate.** A Kuwaiti real-estate office
website + admin panel. Visitors browse properties for rent/sale, filter by
area/type/price/rooms, view details with photos + map, and contact the office
by phone / WhatsApp / inquiry form. Staff manage listings through the admin.

- Bilingual **Arabic (default) / English**, RTL primary. Locale prefix `/ar` `/en`, `ar` default.
- Money is **KWD, NUMERIC(12,3)**, never float. Prices shown as `650 KD/month` (rent) or `KD 85,000` (sale).
- Theme (from the old kwt25.com): cream background `#FAF6EC`, navy `#152A3D`, gold `#B8934B` (hover `#a37f3d`), white cards, rounded-2xl, pill buttons. Status colors: Available=green, Rented/Sold=red/neutral, Reserved=amber.

## Database schema (Postgres 16, sync SQLAlchemy, Alembic)

Auth/RBAC/system tables: copy GRC's `models/auth.py` + `models/system.py` pattern verbatim
(users, roles, permissions via `permissions.py` keys, user_roles, user_sessions
with hashed refresh tokens, audit_log, settings key/value, media).

Domain tables (all have `created_at`/`updated_at` where sensible; translations
are rows in `*_translations` keyed by `locale`, slugs unique per locale):

- **areas** — id, slug, sort_order, is_active. `area_translations`(area_id, locale, name).
  Seed all major Kuwait areas (Salmiya, Hawally, Sabah Al Salem, Jabriya, Mangaf, Fahaheel, Mahboula, Salwa, Rumaithiya, Bayan, Mishref, Qortuba, Yarmouk, Khaitan, Farwaniya, Jahra, Fintas, Abu Halifa, Egaila, Sabahiya, Qibla, Sharq, Bneid Al-Qar, Mansouriya, Dasma, Shaab, Kuwait City …) with AR+EN names.
- **property_types** — id, key (villa|apartment|floor|land|office|chalet|commercial|other), slug, sort_order, is_active + translations (name). Seed all 8.
- **amenities** — id, key, sort_order, is_active + translations (name). Seed: private_entrance, maids_room, driver_room, large_hall, two_entrances, storage, new_finish, central_ac, balcony, elevator, parking, garden, swimming_pool, sea_view, furnished, basement.
- **properties** —
  - id, ref_no VARCHAR unique (format `KW-YYYY-NNNN`, auto-generated),
  - purpose ENUM `rent|sale`, status ENUM `available|rented|sold|reserved` (default available),
  - property_type_id FK, area_id FK, block VARCHAR(20) nullable, address_note VARCHAR nullable,
  - price NUMERIC(12,3) (monthly rent for `rent`, total for `sale`),
  - rooms SMALLINT null, bathrooms SMALLINT null, floors SMALLINT null, area_sqm NUMERIC(10,2) null,
  - latitude NUMERIC(9,6) null, longitude NUMERIC(9,6) null,
  - is_featured BOOL (home "Our distinctive properties"), is_premium BOOL ("distinct" badge),
  - is_active BOOL soft-delete, published_at TIMESTAMPTZ null (null = draft),
  - created_by FK users, created_at, updated_at.
  - `property_translations`(property_id, locale, title, slug, description). Slug unique per locale.
- **property_media** — id, property_id FK, media_id FK (GRC-style media table holding uploaded file path/mime/size), sort_order, is_main BOOL.
- **property_amenities** — property_id, amenity_id (PK pair).
- **inquiries** — id, property_id FK nullable, name, phone, message, source ENUM `property|contact|home`, status ENUM `new|contacted|closed` default new, created_at. Public insert; admin list/update-status.
- **property_requests** — "Request your property": id, name, phone, purpose ENUM `rent|sale` null, property_type_id FK null, area_id FK null, budget_min NUMERIC(12,3) null, budget_max NUMERIC(12,3) null, rooms SMALLINT null, notes TEXT null, status ENUM `new|in_progress|matched|closed` default new, created_at.

Settings seeded keys: `site.phone` (+965 XXXXXXXX), `site.whatsapp`, `site.email`, `site.instagram`, `site.name_ar` (عقار الكويت), `site.name_en` (Kuwait Real Estate).

## API (FastAPI, port 8000)

Same skeleton as GRC Api: `main.py`, `routers/api.py` aggregator mounted at
`/api/v1` (admin, JWT-protected via `require("permission.key")`), plus a public
unauthenticated router mounted at `/public/v1` (GRC used `/shop/v1` — same idea).
Error envelope `{code, message, details}` everywhere. Cursor pagination
`{"items": [...], "next_cursor": ...}` on `(created_at, id)`.

### Admin `/api/v1` (bearer JWT)
- `auth/*` — login, refresh, logout, me (copy GRC exactly, no MFA)
- `users`, `roles` — copy GRC pattern. Default roles: owner, manager, agent, viewer.
- `areas`, `property-types`, `amenities` — CRUD with translations, soft delete (`is_active=false`)
- `properties` — CRUD; `GET /properties` filters: `q` (searches title/ref_no), `purpose`, `status`, `type_id`, `area_id`, `is_featured`, `is_premium`, `published` (bool); `POST /properties` creates with translations + amenity ids; `PATCH /properties/{id}`; `POST /properties/{id}/media` (multipart upload → media row + property_media link), `DELETE /properties/{id}/media/{property_media_id}`, `PATCH /properties/{id}/media/{property_media_id}` (sort/is_main); `POST /properties/{id}/publish`, `POST /properties/{id}/unpublish`. Writes audit_log.
- `inquiries` — list (filter status/source), `PATCH {id}` status.
- `property-requests` — list (filter status), `PATCH {id}` status.
- `settings` — GET all / PUT bulk (owner only).
- `analytics/dashboard` — counts: total/published/available properties, by purpose, new inquiries (7d), new requests (7d), recent 5 inquiries.
- `audit` — list audit log (copy GRC).
- `media` — upload endpoint (copy GRC storage.py local ./uploads, served at `/uploads/*`).

Permission keys (in `permissions.py`): `properties.view/create/edit/delete/publish`,
`inquiries.view/manage`, `requests.view/manage`, `taxonomy.view/manage` (areas/types/amenities),
`users.view/manage`, `roles.view/manage`, `settings.view/manage`, `audit.view`, `analytics.view`.

### Public `/public/v1` (no auth, storefront CORS)
- `GET settings` → `{phone, whatsapp, email, instagram, name_ar, name_en}`
- `GET areas`, `GET property-types`, `GET amenities` → active only, id+key/slug+localized name (accept `?locale=`)
- `GET properties` — published+active only. Filters: `purpose`, `type` (key), `area` (slug), `price_min`, `price_max`, `rooms` (int, meaning ≥), `status`, `premium_only` (bool), `q`. Sort newest first, cursor pagination, `?locale=` picks translation (fallback other locale). Item shape: `{id, ref_no, slug, title, purpose, status, price, currency:"KWD", type:{key,name}, area:{slug,name}, block, rooms, bathrooms, floors, area_sqm, is_premium, is_featured, main_image, images_count, published_at}`.
- `GET properties/featured` → up to 10 featured published items, same shape.
- `GET properties/{slug}` (locale-aware; also match ref_no) → full detail: above + `description`, `amenities:[{key,name}]`, `images:[{url,alt,is_main,sort_order}]`, `latitude`, `longitude`, `created_at`.
- `POST inquiries` `{name, phone, message, property_id?, source}` → 201. Rate-limit-lite: reject >5/hour per IP (in-memory).
- `POST property-requests` `{name, phone, purpose?, property_type_id?, area_id?, budget_min?, budget_max?, rooms?, notes?}` → 201.
- `POST smart-search` `{purpose?, type?, area?, budget_max?, rooms?}` → top 10 matching properties (same list shape). This is the "answer 5 quick questions" wizard backend: relax filters progressively (drop rooms, then budget +20%, then area) until ≥3 results or filters exhausted; response `{items, relaxed: [..which filters were relaxed..]}`.

## Admin frontend (admin/, Next.js 15, port 3000)

Copy GRC admin scaffolding wholesale: package.json deps, tsconfig, next.config,
postcss, components.json, `src/i18n`, `src/lib/api` (fetch client with bearer +
refresh-cookie route handlers `src/app/api/auth/*`), `src/lib/auth`, `src/providers`,
`src/components/ui/*`, `src/components/layout/*` (sidebar/topbar), permission
components, states (empty/error/loading), toasts (sonner). AR default + EN, RTL.

Pages under `src/app/[locale]/(protected)/`:
- `dashboard` — stat cards (from analytics/dashboard) + recent inquiries table
- `properties` — TanStack Table: thumbnail, ref_no, title, type, area, purpose, price, status badge, featured/premium toggles, published; filters (q, purpose, status, type, area); row → `properties/[id]`
- `properties/new` + `properties/[id]` — form (react-hook-form+zod): AR/EN title+description tabs, type, area, block, purpose, price, rooms/bathrooms/floors/sqm, lat/lng inputs, amenities checkboxes, featured/premium switches, status select, media uploader (drag-drop, set main, reorder, delete), publish/unpublish button
- `inquiries` — table (name, phone, property link, message, source, status select, date), filter by status
- `requests` — property_requests table, status select
- `areas`, `property-types`, `amenities` — simple CRUD tables with AR/EN name dialogs
- `users`, `roles` — copy GRC pages
- `settings` — form for the settings keys
- `audit` — copy GRC
- `login` — copy GRC

Branding: app name عقار الكويت / kwt25 Admin, gold accent.

## Storefront (storefront/, Next.js 15, port 3100)

Same scaffolding approach as GRC storefront (next-intl AR default RTL, Tailwind 4,
server components + fetch from `PUBLIC_API_URL=http://localhost:8000/public/v1`,
TanStack Query only where client interactivity needs it). No auth, no cart.
Add dependency `maplibre-gl` for maps (tiles: `https://tiles.openfreemap.org/styles/liberty`).

Layout (all pages): header — logo (text wordmark عقار الكويت / Kuwait Real Estate),
burger menu, phone icon button, gold pill CTA "اعرض عقارك معنا / List your property with us"
(→ /request). Full-screen menu overlay exactly like reference: Home, Real Estate (all
properties), Our distinctive properties (featured, dark card), Smart Search (dark card),
Map, Request your property, Contact us. Floating side buttons on every page:
share, call (tel:), WhatsApp (wa.me), plus bottom-right gold "تحدث معنا / Talk to us"
WhatsApp pill. Footer: office info, quick links, phone/WhatsApp/instagram.

Pages under `src/app/[locale]/`:
- `/` home — hero with headline "عقارك المناسب أقرب إليك" ("Your ideal property, closer to you"); Quick-search card (بحث سريع): area select, property type select, purpose select, gold search button + quick chips (شقق, فلل, للبيع, للإيجار); "Our distinctive properties" featured section (premium cards: image, distinct★ badge, availability dot, price, purpose+type, title, area, sqm/bathrooms/rooms icons, "View details"), CTA button "Featured Properties Showroom" → /properties?featured=1; Smart Search promo card ("Let us arrange suitable properties for you — answer 5 quick questions", dark sparkle icon) → /smart-search; "All ads / جميع الإعلانات" latest-properties grid + "Browse all" → /properties; request-property CTA band.
- `/properties` — client page, filters in collapsible panel: area (grid of area cards with pin icon), purpose checkboxes (rent/sale), property type checkboxes, price from/to, rooms select + sqm input, status checkboxes (available/reserved/sold) + "Premium properties only", Clear filters. Selected-filter chips with ×, "Clear all". Purpose quick tabs (For rent / For sale / everyone). URL-synced search params (shareable link note "The page link changes automatically and can be shared."), result count "N properties", cards grid, load-more (cursor). Empty state "No results with these filters".
- `/properties/[slug]` — gallery (main image + thumbs), purpose+type gold eyebrow "Floor • For Rent", H1 title, area+block with pin, status pill (Rented ●), gold price "650 KD/month", stat tiles 2×2 (rooms, sqm, floors, bathrooms) gold icons, "Clear details before contacting" description block, "Features and Services" amenity check-list cards, map card (maplibre marker) + "Open in maps" (Google Maps link with lat/lng) — only when coords set, contact card: "Contact us regarding this property" + property title, dark "Direct contact 📞" button, green "WhatsApp" button (prefilled message with property title+link), divider "Or send an inquiry", form (name, phone, message prefilled AR "أرغب بمعرفة المزيد عن …") → POST inquiries, "Return to all properties →". share/call/WhatsApp floats.
- `/smart-search` — 5-step wizard (purpose → type → area → budget → rooms), progress dots, gold buttons, final: results grid via POST smart-search + note about relaxed filters, "no exact match" fallback message.
- `/map` — full-height maplibre map of Kuwait with markers for all published properties w/ coords; clicking a marker shows popup card (image, title, price, link).
- `/request` — request-your-property form (name, phone, purpose, type, area, budget range, rooms, notes) → POST property-requests, success state "سنتواصل معك قريباً".
- `/contact` — office phone, WhatsApp, email, instagram (from public settings), inquiry form (source=contact), working-hours block.

SEO: metadata per page, `alternates.languages` ar/en, OpenGraph on property detail.

## Local dev environment

- Postgres 16 in Docker: reuse container pattern from GRC — new container `kwt25-postgres`, port **5433** (5432 is taken by GRC's), db/user/pass `kwt25`/`postgres`/`postgres`.
- `Api/.env`: `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5433/kwt25`, `OWNER_EMAIL=owner@kwt25.com`, `OWNER_PASSWORD=Kwt25!Owner#2026`, CORS 3000/3100, `UPLOAD_DIR=./uploads`.
- Seed (`python -m app.seed`): owner user, 4 roles, areas, 8 property types, 16 amenities, settings, and **12 realistic sample properties** (mix rent/sale, areas, types, some featured/premium, AR+EN translations, no images required) so both frontends demo immediately.
- admin `npm run dev` :3000, storefront `npm run dev` :3100.
