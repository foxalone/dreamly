from _seed_fill_late import FILL as LATE
from _seed_fill_ru import FILL as RU_EXTRA

FILL: dict[str, dict[str, str]] = {}
FILL.update(LATE)
for slug, row in RU_EXTRA.items():
    FILL.setdefault(slug, {}).update(row)
