#!/usr/bin/env python3
"""Generate lib/i18n/seeds/{es,ar,pt,de,ru}.ts from extracted slugs + lexicons."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTRACTED = ROOT / "lib/i18n/_extracted-flat-seeds.json"
OUT = ROOT / "lib/i18n/seeds"

LOCALES = ("es", "ar", "pt", "de", "ru")
EXPORTS = {
    "es": "SEEDS_ES",
    "ar": "SEEDS_AR",
    "pt": "SEEDS_PT",
    "de": "SEEDS_DE",
    "ru": "SEEDS_RU",
}

# Popular parents only — 1–2 native aliases.
ALIASES: dict[str, dict[str, list[str]]] = {
    "snake": {
        "es": ["culebra"],
        "ar": ["أفعى"],
        "pt": ["serpente"],
        "de": ["Natter"],
        "ru": ["гадюка"],
    },
    "teeth-falling-out": {
        "es": ["se me caen los dientes", "dientes que se caen"],
        "ar": ["سقوط الأسنان"],
        "pt": ["dentes caindo sozinhos"],
        "de": ["Zähne ausfallen"],
        "ru": ["зубы выпадают"],
    },
    "money": {
        "es": ["plata"],
        "ar": ["نقود"],
        "pt": ["grana"],
        "ru": ["средства"],
    },
    "baby": {
        "es": ["nene"],
        "ar": ["طفل"],
        "pt": ["neném"],
        "de": ["Säugling"],
        "ru": ["малыш"],
    },
    "dog": {
        "pt": ["cão"],
        "ru": ["пёс"],
    },
    "house": {
        "es": ["hogar"],
        "ar": ["منزل"],
        "pt": ["lar"],
        "de": ["Zuhause"],
        "ru": ["жилище"],
    },
    "car": {
        "es": ["carro"],
        "ar": ["عربة"],
        "pt": ["automóvel"],
        "de": ["Wagen"],
        "ru": ["автомобиль"],
    },
    "ex": {
        "es": ["ex pareja"],
        "ar": ["حبيب سابق"],
        "pt": ["ex-parceiro"],
        "de": ["Ex-Partner"],
        "ru": ["бывший партнёр"],
    },
    "wedding": {
        "es": ["casamiento"],
        "ar": ["عرس"],
        "pt": ["boda"],
        "de": ["Trauung"],
        "ru": ["венчание"],
    },
    "mother": {
        "es": ["mamá"],
        "ar": ["والدة"],
        "pt": ["mamãe"],
        "de": ["Mama"],
        "ru": ["мама"],
    },
    "father": {
        "es": ["papá"],
        "ar": ["والد"],
        "pt": ["papai"],
        "de": ["Papa"],
        "ru": ["папа"],
    },
    "ghost": {
        "es": ["espectro"],
        "ar": ["روح"],
        "pt": ["assombração"],
        "de": ["Gespenst"],
        "ru": ["привидение"],
    },
    "fire": {
        "es": ["incendio"],
        "ar": ["حريق"],
        "pt": ["incêndio"],
        "de": ["Brand"],
        "ru": ["пожар"],
    },
}


def ts_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def emit_entry(slug: str, name: str, kind: str, text: str, aliases: list[str] | None) -> str:
    key = slug if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", slug) else slug
    key_lit = key if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", slug) else ts_str(slug)
    lines = [f"  {key_lit}: {{", f"    name: {ts_str(name)},"]
    if kind == "parent":
        lines.append(f"    summary: {ts_str(text)},")
    else:
        lines.append(f"    focus: {ts_str(text)},")
    if aliases:
        inner = ", ".join(ts_str(a) for a in aliases)
        lines.append(f"    aliases: [{inner}],")
    lines.append("  },")
    return "\n".join(lines)


def load_harvest() -> dict[str, dict[str, dict]]:
    path = Path("/tmp/harvested_seeds.json")
    if path.exists():
        return json.loads(path.read_text())
    return {}


def main() -> None:
    from _seed_names import NAMES
    from _seed_texts import TEXTS

    data = json.loads(EXTRACTED.read_text())
    slugs = [row["slug"] for row in data]
    if len(slugs) != 817:
        raise SystemExit(f"expected 817 extracted slugs, got {len(slugs)}")

    missing_names = [s for s in slugs if s not in NAMES]
    missing_texts = [s for s in slugs if s not in TEXTS]
    if missing_names:
        raise SystemExit(f"missing names: {missing_names[:20]}… ({len(missing_names)})")
    if missing_texts:
        raise SystemExit(f"missing texts: {missing_texts[:20]}… ({len(missing_texts)})")

    harvest = load_harvest()
    by_locale: dict[str, dict[str, dict]] = {loc: {} for loc in LOCALES}

    for row in data:
        slug = row["slug"]
        kind = row["kind"]
        names = NAMES[slug]
        texts = TEXTS[slug]
        en_leak = re.compile(
            r"\b(insight|timing|dread|overwhelm|reassurance|feedback|startle|"
            r"wishful|lore|trauma|check-in|Check-in|agencia)\b",
            re.I,
        )
        for i, loc in enumerate(LOCALES):
            name = names[i]
            text = texts[i]
            h = harvest.get(loc, {}).get(slug) or {}
            hn = h.get("name")
            if hn and not en_leak.search(hn):
                name = hn
            hv = h.get("summary") if kind == "parent" else h.get("focus")
            if hv and not en_leak.search(hv):
                text = hv
            else:
                text = texts[i]
            aliases = None
            if h.get("aliases") and not any(en_leak.search(a or "") for a in h["aliases"]):
                aliases = h["aliases"]
            elif slug in ALIASES and loc in ALIASES[slug]:
                aliases = ALIASES[slug][loc]
            entry: dict = {"name": name}
            if kind == "parent":
                entry["summary"] = text
            else:
                entry["focus"] = text
            if aliases:
                entry["aliases"] = aliases
            by_locale[loc][slug] = (kind, entry)

    header = 'import type { SeedL10n } from "./types";\n\n'
    for loc in LOCALES:
        export = EXPORTS[loc]
        chunks = [header, f"export const {export}: Record<string, SeedL10n> = {{\n"]
        for row in data:
            slug = row["slug"]
            kind, entry = by_locale[loc][slug]
            chunks.append(
                emit_entry(
                    slug,
                    entry["name"],
                    kind,
                    entry.get("summary") or entry["focus"],
                    entry.get("aliases"),
                )
            )
            chunks.append("\n")
        chunks.append("};\n")
        dest = OUT / f"{loc}.ts"
        dest.write_text("".join(chunks), encoding="utf-8")
        print(f"wrote {dest} keys={len(by_locale[loc])}")

    # verify
    for loc in LOCALES:
        text = (OUT / f"{loc}.ts").read_text(encoding="utf-8")
        # count object keys at depth 1
        keys = re.findall(r"^\s+(?:([A-Za-z_][A-Za-z0-9_]*)|\"([^\"]+)\")\s*:\s*\{", text, re.M)
        found = [(a or b) for a, b in keys]
        if len(found) != 817:
            raise SystemExit(f"{loc}: key count {len(found)}")
        if set(found) != set(slugs):
            raise SystemExit(f"{loc}: slug mismatch")
    print("verified 817 keys × 5 locales")


if __name__ == "__main__":
    main()
