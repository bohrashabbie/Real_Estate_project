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

`admin` and `caddy` are deliberately not named above: admin is still served
over plain HTTP on `:8081` and rebuilding it against `ADMIN_DOMAIN` would
change how its auth cookie is set. Deploy it deliberately, not as a side
effect.

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
