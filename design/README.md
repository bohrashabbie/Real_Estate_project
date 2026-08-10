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
combination, which is why the client read it as unchanged. This proposal keeps a
light ground but uses **no gold at all**, and the ground is plaster rather than
cream: `#E9EBE4`, a cool mineral grey-green. On a light site that distinction is
the whole game — cream plus a metallic is the thing that was rejected, while a
cool mineral with no metallic reads as a material rather than a decoration.

The single accent is the sea-green of the Kuwait Towers' ceramic discs, spent on
roughly two percent of any screen.

**Light is the default.** Dark ships alongside it as a designed pair, not an
inversion, reachable from a switch in the top bar next to the language toggle.
The accent carries two values — `#2E6B54` on plaster, `#5E9B84` on basalt —
because one hex cannot hold contrast on both grounds. Naive inversion is what
makes most dual-theme sites feel broken in their second theme.

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

## The theme switch

Three states, not two, because a visitor who set their phone to dark has
expressed a preference and ignoring it is rude:

| State  | Stamp                  | Result                                       |
| ------ | ---------------------- | -------------------------------------------- |
| Light  | `data-theme="light"`   | Plaster ground always — beats a dark OS       |
| Dark   | `data-theme="dark"`    | Basalt ground always — beats a light OS       |
| System | no attribute           | Follows the device; falls back to light       |

The choice is stored locally and applied before first paint, so a returning
visitor never sees a flash of the wrong ground. Every colour resolves through
tokens, so the switch is one attribute on the root element — no component knows
which theme it is in.

## Still to settle

**Fonts.** The prototype renders with system stacks because the licensed faces
cannot be embedded in a shared preview. The intended pairing is 29LT Zarid
Display for Arabic headings with 29LT Bukra for Arabic UI. The Arabic display
face is where most of this identity lives; it is the one line item not worth
cutting.

## Content held verbatim

+965 22405060 · +965 99887766 · info@kwt25.com · kwt25_realestate ·
السبت–الخميس ٩ص–٩م، الجمعة مغلق · فيلا شقة دور أرض مكتب شاليه تجاري ·
all Kuwait areas · prices in د.ك, monthly for rent · refs `KW-2026-xxxx`.

Prices, areas, and reference numbers use Latin digits, matching how Kuwaiti
listings are read in practice. Arabic-Indic digits are reserved for editorial
copy such as the working-hours line.
