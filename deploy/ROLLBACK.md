# Rollback points — kwt25.com

Known-good commits the live storefront has served, newest first. Each one is a
commit you can check out on the VPS and rebuild from; nothing here is deleted
from git, so any of them can be brought back at any time.

| Commit | What it is | Served kwt25.com |
| --- | --- | --- |
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
