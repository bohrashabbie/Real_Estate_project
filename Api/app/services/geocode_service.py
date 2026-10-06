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
import math
import re
import threading
import time
import urllib.parse
import urllib.request

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.realestate import Area, AreaTranslation

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "kwt25-admin/1.0 (+https://kwt25.com; info@kwt25.com)"
MIN_INTERVAL = 1.0  # seconds between upstream calls, per Nominatim's policy
CACHE_LIMIT = 500

_lock = threading.Lock()
_last_call = 0.0
_cache: dict[str, dict | None] = {}


def _search(query: str, outline: bool = False) -> dict | None:
    """One Nominatim lookup, restricted to Kuwait. None = nothing found.

    `outline` also asks for the match's shape (a block's real boundary, when
    OSM has one), simplified to a few dozen points."""
    global _last_call
    key = f"{query}|outline" if outline else query
    if key in _cache:
        return _cache[key]

    with _lock:
        wait = MIN_INTERVAL - (time.monotonic() - _last_call)
        if wait > 0:
            time.sleep(wait)
        fields = {"q": query, "format": "jsonv2", "countrycodes": "kw", "limit": 1, "accept-language": "en"}
        if outline:
            fields.update({"polygon_geojson": 1, "polygon_threshold": 0.00005})
        params = urllib.parse.urlencode(fields)
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
        # [south, north, west, east] -- the extent of what matched; an area's
        # own outline when OSM has one, a few metres when it is only a point.
        box = top.get("boundingbox")
        if box and len(box) == 4:
            hit["bbox"] = [float(value) for value in box]
        shape = top.get("geojson") or {}
        if outline and shape.get("type") in ("Polygon", "MultiPolygon"):
            hit["geojson"] = shape

    if len(_cache) >= CACHE_LIMIT:
        _cache.clear()
    _cache[key] = hit
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
    # The block's own outline, whenever a block was typed -- even when the pin
    # comes from the street address -- so the map can shade the block. Kept
    # only when the match *is* the block ("Salmiya - Block 10, ..."): asked
    # for Mishref Block 4, OSM answered with an office building inside it,
    # whose outline is not the block's.
    block_shape = None
    if number:
        named = re.compile(rf"\bBlock\s*{re.escape(number)}\b", re.IGNORECASE)
        found = _search(f"{area} - Block {number}, Kuwait", outline=True)
        if found and found.get("geojson") and named.search(found["label"].split(",")[0]):
            block_shape = found["geojson"]

    candidates: list[tuple[str, str, re.Pattern[str] | None]] = []
    if address:
        candidates.append(("address", f"{address}, {area}, Kuwait", None))
    if number:
        named = re.compile(rf"\bBlock\s*{re.escape(number)}\b", re.IGNORECASE)
        candidates.append(("block", f"{area} - Block {number}, Kuwait", named))
        candidates.append(("block", f"Block {number}, {area}, Kuwait", named))
    candidates.append(("area", f"{area}, Kuwait", None))

    for precision, query, check in candidates:
        # The block query is the same call the outline came from (cached).
        hit = _search(query, outline=precision == "block")
        if hit and check is not None and not check.search(hit["label"]):
            continue
        if hit:
            return {
                "found": True,
                "precision": precision,
                "lat": f"{hit['lat']:.6f}",
                "lng": f"{hit['lng']:.6f}",
                "label": hit["label"],
                "block_shape": block_shape,
            }
    return {
        "found": False,
        "precision": None,
        "lat": None,
        "lng": None,
        "label": None,
        "block_shape": block_shape,
    }


def _radius_m(lat: float, bbox: list[float] | None) -> int:
    """Half the larger side of an area's extent, in metres, kept to what
    reads well on a map. An area OSM knows only as a point (no real extent)
    gets a typical Kuwaiti area's size rather than a dot."""
    if not bbox:
        return 1200
    south, north, west, east = bbox
    half_height = (north - south) / 2 * 111_320
    half_width = (east - west) / 2 * 111_320 * math.cos(math.radians(lat))
    radius = max(half_height, half_width)
    if radius < 250:
        return 1200
    return int(min(max(radius, 400), 6000))


def area_location(db: Session, area_id: int, refresh: bool = False) -> dict:
    """An area's centre and radius, for flying a map to it and shading it.

    Looked up once and stored on the area, so neither map waits on the
    lookup service (one request a second) after the first time.
    """
    area = db.get(Area, area_id)
    if area is None:
        raise NotFoundError("Area not found")
    if area.latitude is None or area.longitude is None or refresh:
        hit = _search(f"{_area_name(db, area_id)}, Kuwait")
        if not hit:
            return {"found": False, "lat": None, "lng": None, "radius_m": None, "label": None}
        area.latitude = round(hit["lat"], 6)
        area.longitude = round(hit["lng"], 6)
        area.radius_m = _radius_m(hit["lat"], hit.get("bbox"))
        db.commit()
    return {
        "found": True,
        "lat": f"{float(area.latitude):.6f}",
        "lng": f"{float(area.longitude):.6f}",
        "radius_m": area.radius_m,
        "label": _area_name(db, area_id),
    }


# ---------------------------------------------------------------------------
# An area's blocks, for the form's Block dropdown.
# ---------------------------------------------------------------------------

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
_blocks_cache: dict[int, list[str]] = {}
_BLOCK_NAME = re.compile(r"^\s*(?P<area>.+?)\s*-\s*Block\s+(?P<number>[0-9]+[A-Za-z]?)\s*$", re.IGNORECASE)


def _same_area(ours: str, theirs: str) -> bool:
    """OSM's English spelling of an area often differs from ours (Hawally /
    Hawalli, Qortuba / Qurtuba), so compare loosely."""
    from difflib import SequenceMatcher

    def norm(value: str) -> str:
        return re.sub(r"[^a-z]", "", value.lower())

    return SequenceMatcher(None, norm(ours), norm(theirs)).ratio() >= 0.75


def _block_sort_key(number: str) -> tuple[int, str]:
    digits = re.match(r"\d+", number)
    return (int(digits.group()) if digits else 9999, number)


def area_blocks(db: Session, area_id: int) -> dict:
    """The blocks OpenStreetMap knows in an area, by number, sorted.

    Taken from features named "<Area> - Block <n>" around the area's centre.
    A bare "Block 3" (no area in its name) is skipped -- around a centre it
    could belong to the neighbouring area -- as is anything that merely
    mentions a block ("... Co-Op Block 8 Branch"). Cached per area for the
    life of the process. An empty list means the form keeps a free-text
    Block field, which is also what an unreachable lookup service gives.
    """
    if area_id in _blocks_cache:
        return {"blocks": _blocks_cache[area_id]}

    location = area_location(db, area_id)
    if not location["found"]:
        return {"blocks": []}
    area_name = location["label"]
    radius = max(int(location["radius_m"] or 0) * 2, 2500)
    query = (
        "[out:json][timeout:25];("
        f'way["name:en"~"Block"](around:{radius},{location["lat"]},{location["lng"]});'
        f'relation["name:en"~"Block"](around:{radius},{location["lat"]},{location["lng"]});'
        ");out tags;"
    )

    elements = None
    for _attempt in range(2):  # the public server times out now and then
        try:
            request = urllib.request.Request(
                OVERPASS_URL,
                data=urllib.parse.urlencode({"data": query}).encode(),
                headers={"User-Agent": USER_AGENT},
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                elements = json.load(response).get("elements", [])
            break
        except Exception:  # noqa: BLE001 -- a retry, then a free-text field
            time.sleep(1.5)
    if elements is None:
        return {"blocks": []}

    numbers: set[str] = set()
    for element in elements:
        match = _BLOCK_NAME.match((element.get("tags") or {}).get("name:en", ""))
        if match and _same_area(area_name, match.group("area")):
            numbers.add(match.group("number").upper())
    blocks = sorted(numbers, key=_block_sort_key)
    _blocks_cache[area_id] = blocks
    return {"blocks": blocks}
