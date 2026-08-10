# kwt25 — visual identity v2

`kwt25-identity-v2.html` is a self-contained proposal: open it in a browser, no
build step and no network. It carries the design-system spec (palette, type
scale, spacing, radius, elevation, component states) and rendered mockups of
seven screens plus three mobile views, each with a note on what changed against
the current site and why.

**Status: proposal. Nothing here is wired into the apps and nothing is deployed.**
`main` is untouched.

## The position

The current site is cream `#FAF6EC` / navy / gold — the default "Gulf luxury"
combination, which is why the client read it as unchanged. This proposal is
dark-first, mineral, and uses **no gold at all**. The single accent is the
sea-green of the Kuwait Towers' ceramic discs, spent on roughly two percent of
any screen.

Corners are square and cards cast no shadow. A 12px radius is the strongest
visual marker of a templated marketplace, and removing it is most of the
distance between a portal and a brokerage.

The signature component is the **dimension line** — an architect's annotation
rule — replacing the row of icon chips normally used for rooms / baths / m².

## What a build would actually touch

Presentation layer only. The API, cursor pagination, `*_translations` tables,
RBAC, the admin data layer, and the smart-search relaxation logic all stay as
they are; so does the next-intl ar/en routing and the RTL infrastructure, which
is the expensive part and already exists.

New work is a token file replacing the current theme, two licensed Arabic faces,
and a rewrite of about a dozen components — card, badge, field, dropdown, nav,
footer, dimension row, search bar, filter bar, gallery, map pin, sticky CTA.
Page templates re-compose from those.

## Two things to settle before any of it is built

1. **Dark or light as the default.** Dark-first is the recommendation. A light
   theme is specified and included — toggle your OS appearance to see it — but
   the photography grade and the accent's contrast are tuned per ground, so
   switching the default later is a re-tune rather than a flag.
2. **Fonts.** The prototype renders with system stacks because the licensed
   faces cannot be embedded in a shared preview. The intended pairing is 29LT
   Zarid Display for Arabic headings with 29LT Bukra for Arabic UI. The Arabic
   display face is where most of this identity lives; it is the one line item
   not worth cutting.

## Content held verbatim

+965 22405060 · +965 99887766 · info@kwt25.com · kwt25_realestate ·
السبت–الخميس ٩ص–٩م، الجمعة مغلق · فيلا شقة دور أرض مكتب شاليه تجاري ·
all Kuwait areas · prices in د.ك, monthly for rent · refs `KW-2026-xxxx`.

Prices, areas, and reference numbers use Latin digits, matching how Kuwaiti
listings are read in practice. Arabic-Indic digits are reserved for editorial
copy such as the working-hours line.
