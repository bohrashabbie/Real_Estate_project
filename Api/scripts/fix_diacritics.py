"""One-off: rewrite the _ARABIC_DIACRITICS line with literal \\u escapes, then verify."""
import re
from pathlib import Path

BS = chr(92)
p = Path(__file__).resolve().parents[1] / "app" / "utils.py"
lines = p.read_text(encoding="utf-8").splitlines(keepends=True)
idx = next(i for i, l in enumerate(lines) if "_ARABIC_DIACRITICS" in l and "compile" in l)
pattern_src = (
    "[" + BS + "u0610-" + BS + "u061A"
    + BS + "u064B-" + BS + "u0652"
    + BS + "u0670"
    + BS + "u06D6-" + BS + "u06ED]"
)
lines[idx] = '_ARABIC_DIACRITICS = re.compile(r"' + pattern_src + '")' + chr(10)
p.write_text("".join(lines), encoding="utf-8")

# verify: compile the same pattern and test slugify logic inline (no app import
# so this works without the venv's heavier deps)
diac = re.compile(pattern_src)
non_slug_ar = re.compile("[^" + BS + "w" + BS + "u0600-" + BS + "u06FF]+", re.UNICODE)
text = "شقة مفروشة غرفة واحدة"
s = non_slug_ar.sub("-", diac.sub("", text)).strip("-")
print("ar slug len:", len(s), "hyphens:", s.count("-"), "nonempty:", bool(s))
print("line now:", lines[idx].strip()[:80])
