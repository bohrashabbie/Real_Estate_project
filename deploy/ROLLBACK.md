# Deploying and rolling back — kwt25.com

## The deploy command

```sh
cd /opt/kwt25
git pull --ff-only origin main
docker compose -f compose.yml -f compose.edge.yml --env-file .env.vps \
  up -d --build storefront
```

**Two files, never three.** `compose.ip.yml` is a leftover from before DNS
existed and hard-codes `http://187.127.146.84:8080` into `NEXT_PUBLIC_*`,
`PUBLIC_MEDIA_BASE_URL` and the CORS origins. Include it and the site still
loads, but every `<img>` points at plain HTTP on the bare IP — which an HTTPS
page blocks as mixed content, so the whole site renders with no photos. It is
last-wins, so it silently overrides `compose.edge.yml` no matter the order you
think you wrote. `docker compose ls` will happily report all three as the
running config; that is a record of a past mistake, not the command to copy.

Its own header says to drop the file once DNS exists. DNS exists — deleting it
would remove the trap entirely.

`admin` and `caddy` are deliberately not named above — but for `admin` the
reason has expired. It used to be served over plain HTTP on `:8081`, so a
rebuild against `ADMIN_DOMAIN` would have baked in an `https://` API base and
a `Secure` auth cookie that the browser then refused to store.

That is no longer the shape of it. `admin.kwt25.com` is a real HTTPS host in
`deploy/Caddyfile`, which proxies `/api/v1/*` to the api container, and the
running admin container already carries `AUTH_COOKIE_SECURE=1`. Rebuilt on
2026-08-24 to ship the VIP toggle; the login path was checked afterwards and
answers a clean `401 authentication_failed` rather than a 500, so the cookie
change the old note warned about did not happen and cannot.

Deploy it deliberately anyway — it is its own app with its own session store,
and it has no business being rebuilt as a side effect of a storefront CSS
change:

```sh
docker compose -f compose.yml -f compose.edge.yml --env-file .env.vps   up -d --build admin
```

Tag the running image first, so a rollback is one command:
`docker tag kwt25-realestate-admin kwt25-realestate-admin:rollback-$(date +%Y%m%d-%H%M%S)`.

## Rollback points

Known-good commits the live storefront has served, newest first. Each one is a
commit you can check out on the VPS and rebuild from; nothing here is deleted
from git, so any of them can be brought back at any time.

| Commit | What it is | Served kwt25.com |
| --- | --- | --- |
| `83055b1` | **The Tailwind storefront.** The last build before the reference port: same navy/gold/cream palette and the same pages, but assembled from Tailwind utilities against the tokens in `globals.css`, with the old `OptionPicker`/`BottomSheet` filter panel, the full-screen menu overlay and no compare, list-property or brand title card. | until the reference port shipped |
| `84e10bb` | **The previous website.** "Put the previous website back on kwt25.com" — storefront restored to its state at `27c7b4a`: emerald + copper on porcelain, floating quick-search panel over the banner, three-column card grids, expanded filter panel, no Kuwait Finder. | until the mimic redesign shipped |
| `27c7b4a` | The same storefront as `84e10bb`, before the identity experiments branched off. | — |

`design/identity-v2` holds a third look (olive/green, split hero) that never
served the live domain. It is a branch, not a rollback point.

## Rolling back

On the VPS, in the project directory:

```sh
git fetch origin
git checkout 84e10bb -- storefront/     # storefront only
# or: git checkout 84e10bb              # the whole tree, detached

docker compose -f compose.yml -f compose.edge.yml --env-file .env.vps \
  up -d --build storefront
```

The rebuild is required, not a restart: `NEXT_PUBLIC_API_URL` and
`NEXT_PUBLIC_SITE_URL` are build args baked into the bundle (see the note at
the top of `compose.edge.yml`).

Uploaded media and the database are untouched by a storefront rollback — they
live in the `uploads` and `postgres_data` volumes, not in the image.

## Getting back to the current design

```sh
git checkout main && git pull origin main
docker compose -f compose.yml -f compose.edge.yml --env-file .env.vps \
  up -d --build storefront
```

## The storefront's origins are baked in at build time

`NEXT_PUBLIC_API_URL` is a build ARG, and `mediaUrl()` derives the origin the
browser loads `/uploads/*` from out of it (see `storefront/src/lib/api.ts`).
It is therefore inlined into the JS bundle, and **a stale image keeps a stale
origin** — `up -d --build` alone can reuse the cached build layer and ship it
again.

This bit once, live: the stack had been brought up with `compose.ip.yml`
merged in, whose arg is `http://187.127.146.84:8080/public/v1`. Deploys with
`-f compose.yml` kept serving that origin, so every uploaded image on
`https://kwt25.com` was an `http://…:8080` URL — which the browser blocks as
mixed content. The files served fine over both origins; only the browser
refused the insecure one, so `curl` looked healthy while the page showed no
photographs.

When the domain or the compose file in use changes, force it:

```sh
docker compose --env-file .env.vps -f compose.yml build --no-cache storefront
docker compose --env-file .env.vps -f compose.yml up -d --force-recreate storefront
```

Check what actually shipped rather than trusting the build log:

```sh
docker exec kwt25-realestate-storefront-1 \
  sh -c "grep -rlo '187.127.146.84' /app/.next/static | head"   # want: no output
```
