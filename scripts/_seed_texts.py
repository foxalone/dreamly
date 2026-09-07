"""Assemble 5-locale texts from harvest + AR/PT + fills."""

from __future__ import annotations

import json
import re
from pathlib import Path

from _seed_arpt import ARPT
from _seed_fill import FILL

_HARVEST_PATH = Path("/tmp/harvested_seeds.json")
_HARVEST = json.loads(_HARVEST_PATH.read_text()) if _HARVEST_PATH.exists() else {}

_LEAKS = {
    "es": (
        (r"\bagencia inesperada\b", "iniciativa inesperada"),
        (r"\bagencia personal\b", "iniciativa personal"),
        (r"\btu agencia habitual\b", "tu margen de acción habitual"),
        (r"\brecuperar agencia\b", "recuperar el mando"),
        (r"\bagencia de alto riesgo\b", "mando de alto riesgo"),
        (r"\bagencia trabada\b", "sin margen de acción"),
        (r"hacia la agencia\b", "hacia el margen de acción"),
        (r"\bagencia\b", "margen de acción"),
        (r"\bun insight\b", "una percepción"),
        (r"\binsight\b", "percepción"),
        (r"\bmal timing\b", "mal momento"),
        (r"\bun timing perdido\b", "un momento perdido"),
        (r"\btiming perdido\b", "momento perdido"),
        (r"\bpor timing\b", "por el momento"),
        (r", timing y\b", ", el momento justo y"),
        (r"\btiming\b", "momento"),
        (r"\btrauma\b", "herida vieja"),
        (r"\bcheck-in\b", "registro"),
    ),
    "pt": ((r"\bcheck-in\b", "registro"),),
    "de": ((r"\bCheck-in\b", "Anmeldung"), (r"\bcheck-in\b", "Anmeldung")),
}


def _scrub(loc: str, text: str | None) -> str | None:
    if not text:
        return text
    for pat, repl in _LEAKS.get(loc, ()):
        text = re.sub(pat, repl, text)
    return text


def _h(loc: str, slug: str) -> str | None:
    row = _HARVEST.get(loc, {}).get(slug) or {}
    return _scrub(loc, row.get("summary") or row.get("focus"))


TEXTS: dict[str, tuple[str, str, str, str, str]] = {}
missing: list[str] = []
for slug, (ar, pt) in ARPT.items():
    es = _h("es", slug) or FILL.get(slug, {}).get("es")
    de = _h("de", slug) or FILL.get(slug, {}).get("de")
    ru = _h("ru", slug) or FILL.get(slug, {}).get("ru")
    if not all([es, ar, pt, de, ru]):
        missing.append(slug)
        continue
    TEXTS[slug] = (es, ar, pt, de, ru)

if missing:
    raise RuntimeError(f"incomplete texts for {len(missing)} slugs: {missing[:12]}")
