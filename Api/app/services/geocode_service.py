"""Address -> coordinates for the admin's property form.

When the office picks an area and types a block or a street, the form asks
here and drops the map pin on it, filling latitude/longitude, instead of the
office hunting for the spot by hand.

Backed by OpenStreetMap's Nominatim, which knows Kuwait's areas and main
streets well and its blocks only patchily. So the lookup runs from most to
least exact and says which one matched:

    address   "<address note>, <area>, Kuwait"   a street, a landmark
    block     "<area> - Block <n>, Kuwait"        only if the result names that block
    area      "<area>, Kuwait"                    the area's centre

and the form tells the office when it could only place the pin at the area,
so they know to drag it.

Nominatim's usage policy: an identifying User-Agent, at most one request a
second, and no repeated identical queries. Admin-only traffic is a handful
of lookups an hour, but the policy is enforced here regardless -- a process
lock spaces calls a second apart, and answers are cached in memory.
"""

from __future__ import annotations

import json
import re
import threading
import time
import urllib.parse
import urllib.request

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.realestate import AreaTranslation

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "kwt25-admin/1.0 (+https://kwt25.com; info@kwt25.com)"
MIN_INTERVAL = 1.0  # seconds between upstream calls, per Nominatim's policy
CACHE_LIMIT = 500

_lock = threading.Lock()
_last_call = 0.0
_cache: dict[str, dict | None] = {}


def _search(query: str) -> dict | None:
    """One Nominatim lookup, restricted to Kuwait. None = nothing found."""
    global _last_call
    if query in _cache:
        return _cache[query]

    with _lock:
        wait = MIN_INTERVAL - (time.monotonic() - _last_call)
        if wait > 0:
            time.sleep(wait)
        params = urllib.parse.urlencode(
            {"q": query, "format": "jsonv2", "countrycodes": "kw", "limit": 1, "accept-language": "en"}
        )
        request = urllib.request.Request(f"{NOMINATIM_URL}?{params}", headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=8) as response:
                results = json.load(response)
        except Exception as exc:  # noqa: BLE001 -- any network/parse failure means the same thing
            raise BusinessRuleError(
                "The map lookup service did not answer. Click the map to place the pin."
            ) from exc
        finally:
            _last_call = time.monotonic()

    hit = None
    if results:
        top = results[0]
        hit = {"lat": float(top["lat"]), "lng": float(top["lon"]), "label": top.get("display_name", "")}

    if len(_cache) >= CACHE_LIMIT:
        _cache.clear()
    _cache[query] = hit
    return hit


def _area_name(db: Session, area_id: int) -> str:
    rows = db.execute(
        select(AreaTranslation.locale, AreaTranslation.name).where(AreaTranslation.area_id == area_id)
    ).all()
    names = {locale: name for locale, name in rows}
    name = names.get("en") or names.get("ar")
    if not name:
        raise NotFoundError("Area not found")
    return name


def locate(db: Session, area_id: int, block: str | None, address: str | None) -> dict:
    """Best match for the property's address, most exact first."""
    area = _area_name(db, area_id)
    block = (block or "").strip()
    address = (address or "").strip()

    # "Block 10" and a bare "10" both mean block 10.
    number = re.sub(r"^\s*block\s*", "", block, flags=re.IGNORECASE)

    # (precision, query, check). OpenStreetMap names Kuwaiti blocks
    # "<Area> - Block <n>", and answers that phrasing best; phrased
    # "Block 10, Salmiya" it read the 10 as a house number and returned a
    # street in Block 1. So a block result must name the block it was asked
    # for -- anything else falls through to the area, and the form asks the
    # office to drag the pin, rather than dropping it in the wrong block.
    candidates: list[tuple[str, str, re.Pattern[str] | None]] = []
    if address:
        candidates.append(("address", f"{address}, {area}, Kuwait", None))
    if number:
        named = re.compile(rf"\bBlock\s*{re.escape(number)}\b", re.IGNORECASE)
        candidates.append(("block", f"{area} - Block {number}, Kuwait", named))
        candidates.append(("block", f"Block {number}, {area}, Kuwait", named))
    candidates.append(("area", f"{area}, Kuwait", None))

    for precision, query, check in candidates:
        hit = _search(query)
        if hit and check is not None and not check.search(hit["label"]):
            continue
        if hit:
            return {
                "found": True,
                "precision": precision,
                "lat": f"{hit['lat']:.6f}",
                "lng": f"{hit['lng']:.6f}",
                "label": hit["label"],
            }
    return {"found": False, "precision": None, "lat": None, "lng": None, "label": None}
